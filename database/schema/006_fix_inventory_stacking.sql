-- Fix inventory stacking after catalog ID changes
-- Goal: ensure one inventory row per (TeamId, PartId) and reconcile legacy rows.
-- Safe to run multiple times.

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @currentDb SYSNAME = DB_NAME();
IF @currentDb IN (N'master', N'model', N'msdb', N'tempdb')
BEGIN
  DECLARE @msgDb NVARCHAR(4000) = N'Estás ejecutando este script en la base "' + @currentDb + N'". Seleccioná tu base de la app (ej: F1GarageManager) y reintentá.';
  RAISERROR(@msgDb, 16, 1);
  RETURN;
END

IF OBJECT_ID('dbo.PART', 'U') IS NULL
BEGIN
  RAISERROR('No existe dbo.PART. Corré primero database/schema/004_parts_catalog.sql.', 16, 1);
  RETURN;
END

IF OBJECT_ID('dbo.TEAM_INVENTORY_ITEM', 'U') IS NULL
BEGIN
  RAISERROR('No existe dbo.TEAM_INVENTORY_ITEM. Corré primero database/schema/003_teams_relational_nogo.sql.', 16, 1);
  RETURN;
END

BEGIN TRAN;

--------------------------------------------------------------------------------
-- 0) Para poder remapear PartId sin chocar con el índice único, lo quitamos
--    temporalmente (si existe) y lo recreamos al final.
--------------------------------------------------------------------------------
DECLARE @hadUx BIT = 0;
IF EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.TEAM_INVENTORY_ITEM')
    AND name = 'UX_TeamInventoryItems_TeamId_PartId'
)
BEGIN
  SET @hadUx = 1;
  BEGIN TRY
    EXEC(N'DROP INDEX UX_TeamInventoryItems_TeamId_PartId ON dbo.TEAM_INVENTORY_ITEM;');
  END TRY
  BEGIN CATCH
    DECLARE @msg0 NVARCHAR(4000) = N'No se pudo dropear el índice UX_TeamInventoryItems_TeamId_PartId. Corré este script con un usuario admin/db_owner. Error: ' + ERROR_MESSAGE();
    ROLLBACK TRAN;
    RAISERROR(@msg0, 16, 1);
    RETURN;
  END CATCH
END

--------------------------------------------------------------------------------
-- 1) Reconciliar PartId de inventario viejo
--    - Si PartId es NULL o no existe en dbo.Parts
--    - Mapea por PartName (único en dbo.Parts)
--------------------------------------------------------------------------------
;WITH Candidates AS (
  SELECT
    ii.Id AS InventoryItemId,
    p.Id AS NewPartId,
    p.Name AS NewPartName,
    p.Category AS NewCategory,
    p.Price AS NewPrice,
    p.P AS NewP,
    p.A AS NewA,
    p.M AS NewM
  FROM dbo.TEAM_INVENTORY_ITEM ii
  JOIN dbo.PART p
    ON p.Name = ii.PartName
  WHERE ii.PartId IS NULL
     OR NOT EXISTS (SELECT 1 FROM dbo.PART px WHERE px.Id = ii.PartId)
)
UPDATE ii
SET
  PartId = c.NewPartId,
  PartName = c.NewPartName,
  Category = c.NewCategory,
  P = c.NewP,
  A = c.NewA,
  M = c.NewM,
  UnitCost = CASE
    WHEN ii.UnitCost IS NULL OR ii.UnitCost = 0 THEN c.NewPrice
    ELSE ii.UnitCost
  END
FROM dbo.TEAM_INVENTORY_ITEM ii
JOIN Candidates c ON c.InventoryItemId = ii.Id;

--------------------------------------------------------------------------------
-- 2) Unificar duplicados por (TeamId, PartId)
--    - Actualiza referencias de instalado (TeamCarInstalledParts) al "keeper"
--    - Suma Qty y conserva UnitCost máximo y AcquiredAt más reciente
--------------------------------------------------------------------------------

IF OBJECT_ID('tempdb..#DupGroups') IS NOT NULL DROP TABLE #DupGroups;
IF OBJECT_ID('tempdb..#DupItems') IS NOT NULL DROP TABLE #DupItems;

CREATE TABLE #DupGroups (
  TeamId UNIQUEIDENTIFIER NOT NULL,
  PartId UNIQUEIDENTIFIER NOT NULL,
  KeepId UNIQUEIDENTIFIER NOT NULL,
  SumQty INT NOT NULL,
  MaxUnitCost DECIMAL(18,2) NOT NULL,
  MaxAcquiredAt DATETIME2(0) NOT NULL
);

INSERT INTO #DupGroups (TeamId, PartId, KeepId, SumQty, MaxUnitCost, MaxAcquiredAt)
SELECT
  TeamId,
  PartId,
  MIN(Id) AS KeepId,
  SUM(Qty) AS SumQty,
  MAX(UnitCost) AS MaxUnitCost,
  MAX(AcquiredAt) AS MaxAcquiredAt
FROM dbo.TEAM_INVENTORY_ITEM
WHERE PartId IS NOT NULL
GROUP BY TeamId, PartId
HAVING COUNT(*) > 1;

CREATE TABLE #DupItems (
  Id UNIQUEIDENTIFIER NOT NULL,
  KeepId UNIQUEIDENTIFIER NOT NULL
);

INSERT INTO #DupItems (Id, KeepId)
SELECT ii.Id, g.KeepId
FROM dbo.TEAM_INVENTORY_ITEM ii
JOIN #DupGroups g
  ON g.TeamId = ii.TeamId AND g.PartId = ii.PartId
WHERE ii.Id <> g.KeepId;

IF EXISTS (SELECT 1 FROM #DupItems)
BEGIN
  -- Move installed-part references to the keeper inventory item
  UPDATE ip
  SET InventoryItemId = di.KeepId
  FROM dbo.TEAM_CAR_INSTALLED_PART ip
  JOIN #DupItems di
    ON ip.InventoryItemId = di.Id;

  -- Update keeper row with aggregated values
  UPDATE keep
  SET
    Qty = g.SumQty,
    UnitCost = g.MaxUnitCost,
    AcquiredAt = g.MaxAcquiredAt,
    PartName = p.Name,
    Category = p.Category,
    P = p.P,
    A = p.A,
    M = p.M
  FROM dbo.TEAM_INVENTORY_ITEM keep
  JOIN #DupGroups g
    ON keep.Id = g.KeepId
  JOIN dbo.PART p
    ON p.Id = keep.PartId;

  -- Delete redundant rows
  DELETE ii
  FROM dbo.TEAM_INVENTORY_ITEM ii
  JOIN #DupItems di
    ON ii.Id = di.Id;
END

--------------------------------------------------------------------------------
-- 3) Re-crear índice único (si no existe) para evitar que vuelva a pasar
--------------------------------------------------------------------------------
IF @hadUx = 1
   OR (
    NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.TEAM_INVENTORY_ITEM') AND name = 'UX_TeamInventoryItems_TeamId_PartId')
    AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.TEAM_INVENTORY_ITEM') AND name = 'UX_TeamInventoryItems_TeamId_PartId')
   )
BEGIN
  BEGIN TRY
    EXEC(N'CREATE UNIQUE INDEX UX_TeamInventoryItems_TeamId_PartId ON dbo.TEAM_INVENTORY_ITEM(TeamId, PartId) WHERE PartId IS NOT NULL;');
  END TRY
  BEGIN CATCH
    DECLARE @msgU NVARCHAR(4000) = N'No se pudo crear el índice único UX_TeamInventoryItems_TeamId_PartId. Error: ' + ERROR_MESSAGE();
    ROLLBACK TRAN;
    RAISERROR(@msgU, 16, 1);
    RETURN;
  END CATCH
END

COMMIT TRAN;

-- Quick checks
SELECT TOP 20 TeamId, PartId, PartName, Qty, UnitCost, AcquiredAt
FROM dbo.TEAM_INVENTORY_ITEM
WHERE PartId IS NOT NULL
ORDER BY AcquiredAt DESC;

SELECT TeamId, PartId, COUNT(1) AS RowsPerPart
FROM dbo.TEAM_INVENTORY_ITEM
WHERE PartId IS NOT NULL
GROUP BY TeamId, PartId
HAVING COUNT(1) > 1;
