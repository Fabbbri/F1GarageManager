-- Store purchase transaction (atomic)
-- Requires:
-- - Teams schema (003_teams_relational_nogo.sql)
-- - Parts catalog (004_parts_catalog.sql)
-- This script is idempotent.

SET NOCOUNT ON;

DECLARE @currentDb SYSNAME = DB_NAME();
IF @currentDb IN (N'master', N'model', N'msdb', N'tempdb')
BEGIN
  DECLARE @msgDb NVARCHAR(4000) = N'Estás ejecutando este script en la base "' + @currentDb + N'". Seleccioná tu base de la app (ej: F1GarageManager) y reintentá.';
  RAISERROR(@msgDb, 16, 1);
  RETURN;
END

IF OBJECT_ID('dbo.Parts', 'U') IS NULL
BEGIN
  RAISERROR('No existe dbo.Parts. Corré primero database/schema/004_parts_catalog.sql en esta misma base.', 16, 1);
  RETURN;
END

--------------------------------------------------------------------------------
-- Audit / History
--------------------------------------------------------------------------------
BEGIN TRY
  IF OBJECT_ID('dbo.TeamStorePurchases', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.TeamStorePurchases (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TeamStorePurchases PRIMARY KEY,
      TeamId UNIQUEIDENTIFIER NOT NULL,
      PartId UNIQUEIDENTIFIER NOT NULL,
      PartName NVARCHAR(160) NOT NULL,
      Category NVARCHAR(120) NOT NULL,
      Qty INT NOT NULL,
      UnitCost DECIMAL(18,2) NOT NULL,
      TotalCost DECIMAL(18,2) NOT NULL,
      P INT NOT NULL CONSTRAINT DF_TeamStorePurchases_P DEFAULT (0),
      A INT NOT NULL CONSTRAINT DF_TeamStorePurchases_A DEFAULT (0),
      M INT NOT NULL CONSTRAINT DF_TeamStorePurchases_M DEFAULT (0),
      PurchasedAt DATETIME2(0) NOT NULL CONSTRAINT DF_TeamStorePurchases_PurchasedAt DEFAULT (SYSUTCDATETIME()),
      CONSTRAINT FK_TeamStorePurchases_Teams FOREIGN KEY (TeamId) REFERENCES dbo.Teams(Id) ON DELETE CASCADE,
      CONSTRAINT FK_TeamStorePurchases_Parts FOREIGN KEY (PartId) REFERENCES dbo.Parts(Id),
      CONSTRAINT CK_TeamStorePurchases_Qty CHECK (Qty > 0),
      CONSTRAINT CK_TeamStorePurchases_Cost CHECK (UnitCost >= 0 AND TotalCost >= 0),
      CONSTRAINT CK_TeamStorePurchases_PAM CHECK (P BETWEEN 0 AND 9 AND A BETWEEN 0 AND 9 AND M BETWEEN 0 AND 9)
    );
  END
END TRY
BEGIN CATCH
  DECLARE @msgA NVARCHAR(4000) = N'No se pudo crear dbo.TeamStorePurchases. Corré este script con un usuario admin/db_owner (no f1app). Error: ' + ERROR_MESSAGE();
  RAISERROR(@msgA, 16, 1);
  RETURN;
END CATCH

IF OBJECT_ID('dbo.TeamStorePurchases', 'U') IS NOT NULL
BEGIN
  BEGIN TRY
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.TeamStorePurchases') AND name = 'IX_TeamStorePurchases_TeamId')
       AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.TeamStorePurchases') AND name = 'IX_TeamStorePurchases_TeamId')
    BEGIN
      CREATE INDEX IX_TeamStorePurchases_TeamId ON dbo.TeamStorePurchases(TeamId);
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.TeamStorePurchases') AND name = 'IX_TeamStorePurchases_PartId')
       AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.TeamStorePurchases') AND name = 'IX_TeamStorePurchases_PartId')
    BEGIN
      CREATE INDEX IX_TeamStorePurchases_PartId ON dbo.TeamStorePurchases(PartId);
    END
  END TRY
  BEGIN CATCH
    DECLARE @msgAI NVARCHAR(4000) = N'No se pudieron crear índices de dbo.TeamStorePurchases. Corré este script con un usuario admin/db_owner (no f1app). Error: ' + ERROR_MESSAGE();
    RAISERROR(@msgAI, 16, 1);
    RETURN;
  END CATCH
END

--------------------------------------------------------------------------------
-- Stored Procedure: dbo.Store_PurchasePart (atomic)
--------------------------------------------------------------------------------
DECLARE @sql NVARCHAR(MAX);

BEGIN TRY
  SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Store_PurchasePart
    @TeamId UNIQUEIDENTIFIER,
    @PartId UNIQUEIDENTIFIER,
    @Qty INT
  AS
  BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @Qty IS NULL OR @Qty <= 0
    BEGIN
      RAISERROR(''Cantidad inválida.'', 16, 1);
      RETURN;
    END

    IF NOT EXISTS (SELECT 1 FROM dbo.Teams WHERE Id = @TeamId)
    BEGIN
      RAISERROR(''Equipo no encontrado.'', 16, 1);
      RETURN;
    END

    DECLARE @PartName NVARCHAR(160);
    DECLARE @Category NVARCHAR(120);
    DECLARE @UnitCost DECIMAL(18,2);
    DECLARE @Stock INT;
    DECLARE @P INT;
    DECLARE @A INT;
    DECLARE @M INT;

    BEGIN TRAN;

    -- Lock the part row for update
    SELECT
      @PartName = p.Name,
      @Category = p.Category,
      @UnitCost = p.Price,
      @Stock = p.Stock,
      @P = p.P,
      @A = p.A,
      @M = p.M
    FROM dbo.Parts p WITH (UPDLOCK, ROWLOCK)
    WHERE p.Id = @PartId;

    IF @PartName IS NULL
    BEGIN
      ROLLBACK TRAN;
      RAISERROR(''Parte no encontrada.'', 16, 1);
      RETURN;
    END

    IF @Stock < @Qty
    BEGIN
      ROLLBACK TRAN;
      RAISERROR(''Stock insuficiente.'', 16, 1);
      RETURN;
    END

    DECLARE @BudgetTotal DECIMAL(18,2) = 0;
    DECLARE @BudgetSpent DECIMAL(18,2) = 0;

    -- Lock budget row
    SELECT
      @BudgetTotal = b.Total,
      @BudgetSpent = b.Spent
    FROM dbo.TeamBudgets b WITH (UPDLOCK, ROWLOCK)
    WHERE b.TeamId = @TeamId;

    IF @BudgetTotal IS NULL
    BEGIN
      SET @BudgetTotal = 0;
      SET @BudgetSpent = 0;
    END

    DECLARE @TotalCost DECIMAL(18,2) = @UnitCost * @Qty;
    DECLARE @Remaining DECIMAL(18,2) = @BudgetTotal - @BudgetSpent;

    IF @Remaining < @TotalCost
    BEGIN
      ROLLBACK TRAN;
      RAISERROR(''Presupuesto insuficiente.'', 16, 1);
      RETURN;
    END

    -- Decrement stock
    UPDATE dbo.Parts
    SET Stock = Stock - @Qty,
        UpdatedAt = SYSUTCDATETIME()
    WHERE Id = @PartId;

    -- Increment spent
    UPDATE dbo.TeamBudgets
    SET Spent = Spent + @TotalCost
    WHERE TeamId = @TeamId;

    -- Upsert inventory item (by TeamId+PartId unique index from 003)
    IF EXISTS (SELECT 1 FROM dbo.TeamInventoryItems WHERE TeamId = @TeamId AND PartId = @PartId)
    BEGIN
      UPDATE dbo.TeamInventoryItems
      SET Qty = Qty + @Qty,
          UnitCost = @UnitCost,
          PartName = @PartName,
          Category = @Category,
          P = @P,
          A = @A,
          M = @M,
          AcquiredAt = SYSUTCDATETIME()
      WHERE TeamId = @TeamId AND PartId = @PartId;
    END
    ELSE
    BEGIN
      INSERT INTO dbo.TeamInventoryItems (Id, TeamId, PartId, PartName, Category, P, A, M, Qty, UnitCost, CreatedAt, AcquiredAt)
      VALUES (NEWID(), @TeamId, @PartId, @PartName, @Category, @P, @A, @M, @Qty, @UnitCost, SYSUTCDATETIME(), SYSUTCDATETIME());
    END

    -- Audit movement
    INSERT INTO dbo.TeamStorePurchases (Id, TeamId, PartId, PartName, Category, Qty, UnitCost, TotalCost, P, A, M, PurchasedAt)
    VALUES (NEWID(), @TeamId, @PartId, @PartName, @Category, @Qty, @UnitCost, @TotalCost, @P, @A, @M, SYSUTCDATETIME());

    UPDATE dbo.Teams SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;

    COMMIT TRAN;

    EXEC dbo.Team_GetById @Id = @TeamId;
  END';

  EXEC sys.sp_executesql @sql;
END TRY
BEGIN CATCH
  DECLARE @msgSp NVARCHAR(4000) = N'No se pudo crear/alterar dbo.Store_PurchasePart. Corré este script con un usuario admin/db_owner (no f1app). Error: ' + ERROR_MESSAGE();
  RAISERROR(@msgSp, 16, 1);
  RETURN;
END CATCH

-- Quick verification
SELECT DB_NAME() AS CurrentDatabase,
       OBJECT_ID(N'dbo.TeamStorePurchases') AS PurchasesObjectId,
       OBJECT_ID(N'dbo.Store_PurchasePart') AS PurchaseSpObjectId;
