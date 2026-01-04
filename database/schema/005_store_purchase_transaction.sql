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

IF OBJECT_ID('dbo.STORE', 'U') IS NULL OR OBJECT_ID('dbo.PART', 'U') IS NULL
BEGIN
  RAISERROR('No existe dbo.STORE o dbo.PART. Corré primero database/schema/004_parts_catalog.sql en esta misma base.', 16, 1);
  RETURN;
END

--------------------------------------------------------------------------------
-- Audit / History
--------------------------------------------------------------------------------
BEGIN TRY
  IF OBJECT_ID('dbo.TEAM_STORE_PURCHASE', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.TEAM_STORE_PURCHASE (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TeamStorePurchases PRIMARY KEY,
      TeamId UNIQUEIDENTIFIER NOT NULL,
      StoreId UNIQUEIDENTIFIER NOT NULL,
      PartId UNIQUEIDENTIFIER NOT NULL,
      Qty INT NOT NULL,
      UnitCost DECIMAL(18,2) NOT NULL,
      TotalCost DECIMAL(18,2) NOT NULL,
      PurchasedAt DATETIME2(0) NOT NULL CONSTRAINT DF_TeamStorePurchases_PurchasedAt DEFAULT (SYSUTCDATETIME()),
      CONSTRAINT FK_TeamStorePurchases_Teams FOREIGN KEY (TeamId) REFERENCES dbo.TEAM(Id) ON DELETE CASCADE,
      CONSTRAINT FK_TeamStorePurchases_Store FOREIGN KEY (StoreId) REFERENCES dbo.STORE(Id),
      CONSTRAINT FK_TeamStorePurchases_Part FOREIGN KEY (PartId) REFERENCES dbo.PART(Id),
      CONSTRAINT CK_TeamStorePurchases_Qty CHECK (Qty > 0),
      CONSTRAINT CK_TeamStorePurchases_Cost CHECK (UnitCost >= 0 AND TotalCost >= 0)
    );
  END
END TRY
BEGIN CATCH
  DECLARE @msgA NVARCHAR(4000) = N'No se pudo crear dbo.TEAM_STORE_PURCHASE. Corré este script con un usuario admin/db_owner (no f1app). Error: ' + ERROR_MESSAGE();
  RAISERROR(@msgA, 16, 1);
  RETURN;
END CATCH

IF OBJECT_ID('dbo.TEAM_STORE_PURCHASE', 'U') IS NOT NULL
BEGIN
  -- Upgrade existing table to new UML shape
  IF COL_LENGTH('dbo.TEAM_STORE_PURCHASE', 'StoreId') IS NULL
  BEGIN
    ALTER TABLE dbo.TEAM_STORE_PURCHASE ADD StoreId UNIQUEIDENTIFIER NULL;

    -- Backfill StoreId using PartId (dynamic to avoid batch compile errors)
    DECLARE @sqlBackfillStoreId NVARCHAR(MAX) = N'
      UPDATE p
      SET StoreId = s.Id
      FROM dbo.TEAM_STORE_PURCHASE p
      JOIN dbo.STORE s ON s.PartId = p.PartId
      WHERE p.StoreId IS NULL;

      -- Make it NOT NULL if fully backfilled
      IF NOT EXISTS (SELECT 1 FROM dbo.TEAM_STORE_PURCHASE WHERE StoreId IS NULL)
      BEGIN
        ALTER TABLE dbo.TEAM_STORE_PURCHASE ALTER COLUMN StoreId UNIQUEIDENTIFIER NOT NULL;
      END';
    EXEC sys.sp_executesql @sqlBackfillStoreId;
  END

  -- Drop legacy columns if they exist
  IF OBJECT_ID('dbo.DF_TeamStorePurchases_P', 'D') IS NOT NULL
    ALTER TABLE dbo.TEAM_STORE_PURCHASE DROP CONSTRAINT DF_TeamStorePurchases_P;
  IF OBJECT_ID('dbo.DF_TeamStorePurchases_A', 'D') IS NOT NULL
    ALTER TABLE dbo.TEAM_STORE_PURCHASE DROP CONSTRAINT DF_TeamStorePurchases_A;
  IF OBJECT_ID('dbo.DF_TeamStorePurchases_M', 'D') IS NOT NULL
    ALTER TABLE dbo.TEAM_STORE_PURCHASE DROP CONSTRAINT DF_TeamStorePurchases_M;
  IF OBJECT_ID('dbo.CK_TeamStorePurchases_PAM', 'C') IS NOT NULL
    ALTER TABLE dbo.TEAM_STORE_PURCHASE DROP CONSTRAINT CK_TeamStorePurchases_PAM;

  IF COL_LENGTH('dbo.TEAM_STORE_PURCHASE', 'PartName') IS NOT NULL
    ALTER TABLE dbo.TEAM_STORE_PURCHASE DROP COLUMN PartName;
  IF COL_LENGTH('dbo.TEAM_STORE_PURCHASE', 'Category') IS NOT NULL
    ALTER TABLE dbo.TEAM_STORE_PURCHASE DROP COLUMN Category;
  IF COL_LENGTH('dbo.TEAM_STORE_PURCHASE', 'P') IS NOT NULL
    ALTER TABLE dbo.TEAM_STORE_PURCHASE DROP COLUMN P;
  IF COL_LENGTH('dbo.TEAM_STORE_PURCHASE', 'A') IS NOT NULL
    ALTER TABLE dbo.TEAM_STORE_PURCHASE DROP COLUMN A;
  IF COL_LENGTH('dbo.TEAM_STORE_PURCHASE', 'M') IS NOT NULL
    ALTER TABLE dbo.TEAM_STORE_PURCHASE DROP COLUMN M;

  -- Fix FKs to match new shape
  IF OBJECT_ID('dbo.FK_TeamStorePurchases_Parts', 'F') IS NOT NULL
    ALTER TABLE dbo.TEAM_STORE_PURCHASE DROP CONSTRAINT FK_TeamStorePurchases_Parts;

  IF OBJECT_ID('dbo.FK_TeamStorePurchases_Store', 'F') IS NULL
  BEGIN
    BEGIN TRY
      IF COL_LENGTH('dbo.TEAM_STORE_PURCHASE', 'StoreId') IS NOT NULL
      BEGIN
        EXEC sys.sp_executesql N'ALTER TABLE dbo.TEAM_STORE_PURCHASE
          ADD CONSTRAINT FK_TeamStorePurchases_Store FOREIGN KEY (StoreId) REFERENCES dbo.STORE(Id);';
      END
    END TRY
    BEGIN CATCH
    END CATCH
  END

  IF OBJECT_ID('dbo.FK_TeamStorePurchases_Part', 'F') IS NULL
  BEGIN
    BEGIN TRY
      ALTER TABLE dbo.TEAM_STORE_PURCHASE
        ADD CONSTRAINT FK_TeamStorePurchases_Part FOREIGN KEY (PartId) REFERENCES dbo.PART(Id);
    END TRY
    BEGIN CATCH
    END CATCH
  END

  BEGIN TRY
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.TEAM_STORE_PURCHASE') AND name = 'IX_TeamStorePurchases_TeamId')
       AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.TEAM_STORE_PURCHASE') AND name = 'IX_TeamStorePurchases_TeamId')
    BEGIN
      CREATE INDEX IX_TeamStorePurchases_TeamId ON dbo.TEAM_STORE_PURCHASE(TeamId);
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.TEAM_STORE_PURCHASE') AND name = 'IX_TeamStorePurchases_PartId')
       AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.TEAM_STORE_PURCHASE') AND name = 'IX_TeamStorePurchases_PartId')
    BEGIN
      CREATE INDEX IX_TeamStorePurchases_PartId ON dbo.TEAM_STORE_PURCHASE(PartId);
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.TEAM_STORE_PURCHASE') AND name = 'IX_TeamStorePurchases_StoreId')
       AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.TEAM_STORE_PURCHASE') AND name = 'IX_TeamStorePurchases_StoreId')
    BEGIN
      IF COL_LENGTH('dbo.TEAM_STORE_PURCHASE', 'StoreId') IS NOT NULL
      BEGIN
        EXEC sys.sp_executesql N'CREATE INDEX IX_TeamStorePurchases_StoreId ON dbo.TEAM_STORE_PURCHASE(StoreId);';
      END
    END
  END TRY
  BEGIN CATCH
    DECLARE @msgAI NVARCHAR(4000) = N'No se pudieron crear índices de dbo.TEAM_STORE_PURCHASE. Corré este script con un usuario admin/db_owner (no f1app). Error: ' + ERROR_MESSAGE();
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

    IF NOT EXISTS (SELECT 1 FROM dbo.TEAM WHERE Id = @TeamId)
    BEGIN
      RAISERROR(''Equipo no encontrado.'', 16, 1);
      RETURN;
    END

    DECLARE @StoreId UNIQUEIDENTIFIER;
    DECLARE @UnitCost DECIMAL(18,2);
    DECLARE @Stock INT;
    DECLARE @Category NVARCHAR(120);

    BEGIN TRAN;

    -- Lock the store row for update (by PartId)
    SELECT
      @StoreId = s.Id,
      @UnitCost = s.Price,
      @Stock = s.Stock,
      @Category = p.Category
    FROM dbo.STORE s WITH (UPDLOCK, ROWLOCK)
    JOIN dbo.PART p ON p.Id = s.PartId
    WHERE s.PartId = @PartId;

    IF @StoreId IS NULL
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
    FROM dbo.TEAM_BUDGET b WITH (UPDLOCK, ROWLOCK)
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
    UPDATE dbo.STORE
    SET Stock = Stock - @Qty,
      UpdatedAt = SYSUTCDATETIME()
    WHERE PartId = @PartId;

    -- Increment spent
    UPDATE dbo.TEAM_BUDGET
    SET Spent = Spent + @TotalCost
    WHERE TeamId = @TeamId;

    -- Upsert inventory item (by TeamId+PartId unique index from 003)
    IF EXISTS (SELECT 1 FROM dbo.TEAM_INVENTORY_ITEM WHERE TeamId = @TeamId AND PartId = @PartId)
    BEGIN
      UPDATE dbo.TEAM_INVENTORY_ITEM
      SET Qty = Qty + @Qty,
          UnitCost = @UnitCost,
          AcquiredAt = SYSUTCDATETIME()
      WHERE TeamId = @TeamId AND PartId = @PartId;
    END
    ELSE
    BEGIN
      INSERT INTO dbo.TEAM_INVENTORY_ITEM (Id, TeamId, PartId, Qty, UnitCost, CreatedAt, AcquiredAt)
      VALUES (NEWID(), @TeamId, @PartId, @Qty, @UnitCost, SYSUTCDATETIME(), SYSUTCDATETIME());
    END

    -- Audit movement
    INSERT INTO dbo.TEAM_STORE_PURCHASE (Id, TeamId, StoreId, PartId, Qty, UnitCost, TotalCost, PurchasedAt)
    VALUES (NEWID(), @TeamId, @StoreId, @PartId, @Qty, @UnitCost, @TotalCost, SYSUTCDATETIME());

    UPDATE dbo.TEAM SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;

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
  OBJECT_ID(N'dbo.TEAM_STORE_PURCHASE') AS PurchasesObjectId,
       OBJECT_ID(N'dbo.Store_PurchasePart') AS PurchaseSpObjectId;
