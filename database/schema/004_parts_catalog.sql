
SET NOCOUNT ON;

DECLARE @currentDb SYSNAME = DB_NAME();
IF @currentDb IN (N'master', N'model', N'msdb', N'tempdb')
BEGIN
  DECLARE @msgDb NVARCHAR(4000) = N'Estás ejecutando este script en la base "' + @currentDb + N'". Seleccioná tu base de la app (ej: F1GarageManager) y reintentá.';
  RAISERROR(@msgDb, 16, 1);
  RETURN;
END

--------------------------------------------------------------------------------
-- Refactor UML:
-- - PART: catálogo (Name/Category/P/A/M/BasePrice)
-- - STORE: listing (PartId/Price/Stock)
--
-- Upgrade path:
-- - En versiones anteriores, dbo.STORE era el catálogo completo.
--   Si detectamos ese formato, renombramos dbo.STORE -> dbo.PART y luego
--   creamos dbo.STORE con la forma nueva.
--------------------------------------------------------------------------------

BEGIN TRY
  IF OBJECT_ID(N'dbo.STORE', N'U') IS NOT NULL
     AND COL_LENGTH(N'dbo.STORE', N'PartId') IS NULL
     AND COL_LENGTH(N'dbo.STORE', N'Name') IS NOT NULL
  BEGIN
    -- Caso A: DB viejo, todavía no existe PART -> renombrar STORE a PART
    IF OBJECT_ID(N'dbo.PART', N'U') IS NULL
    BEGIN
      EXEC sys.sp_rename @objname = N'dbo.STORE', @newname = N'PART', @objtype = N'OBJECT';
    END
    ELSE
    BEGIN
      -- Caso B: ejecución parcial (PART ya existe) pero STORE sigue siendo legacy.
      -- Liberar el nombre STORE para poder crear la tabla nueva (con PartId).
      IF OBJECT_ID(N'dbo.STORE_LEGACY', N'U') IS NULL
      BEGIN
        EXEC sys.sp_rename @objname = N'dbo.STORE', @newname = N'STORE_LEGACY', @objtype = N'OBJECT';
      END
      ELSE
      BEGIN
        RAISERROR('Existe dbo.STORE legacy sin PartId, pero también existe dbo.STORE_LEGACY. Renombrá manualmente dbo.STORE o borrá dbo.STORE_LEGACY y reintentá.', 16, 1);
        RETURN;
      END
    END
  END
END TRY
BEGIN CATCH
  DECLARE @msgR NVARCHAR(4000) = N'No se pudo renombrar dbo.STORE -> dbo.PART durante el upgrade. Error: ' + ERROR_MESSAGE();
  RAISERROR(@msgR, 16, 1);
  RETURN;
END CATCH

BEGIN TRY
  IF OBJECT_ID(N'dbo.PART', N'U') IS NULL
  BEGIN
    CREATE TABLE dbo.PART (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Part PRIMARY KEY,
      Name NVARCHAR(160) NOT NULL,
      Category NVARCHAR(120) NOT NULL,
      P INT NOT NULL CONSTRAINT DF_Part_P DEFAULT (0),
      A INT NOT NULL CONSTRAINT DF_Part_A DEFAULT (0),
      M INT NOT NULL CONSTRAINT DF_Part_M DEFAULT (0),
      BasePrice DECIMAL(18,2) NOT NULL CONSTRAINT DF_Part_BasePrice DEFAULT (0),
      CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Part_CreatedAt DEFAULT (SYSUTCDATETIME()),
      UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Part_UpdatedAt DEFAULT (SYSUTCDATETIME()),
      CONSTRAINT CK_Part_BasePrice CHECK (BasePrice >= 0),
      CONSTRAINT CK_Part_PAM CHECK (P BETWEEN 0 AND 9 AND A BETWEEN 0 AND 9 AND M BETWEEN 0 AND 9)
    );
  END
END TRY
BEGIN CATCH
  DECLARE @msgP NVARCHAR(4000) = N'No se pudo crear dbo.PART. Corré este script con un usuario admin/db_owner (no f1app). Error: ' + ERROR_MESSAGE();
  RAISERROR(@msgP, 16, 1);
  RETURN;
END CATCH

-- Upgrade: si dbo.PART viene del catálogo viejo, asegurar BasePrice y preparar migración
IF OBJECT_ID(N'dbo.PART', N'U') IS NOT NULL
BEGIN
  IF COL_LENGTH(N'dbo.PART', N'BasePrice') IS NULL
  BEGIN
    ALTER TABLE dbo.PART ADD BasePrice DECIMAL(18,2) NOT NULL CONSTRAINT DF_Part_BasePrice DEFAULT (0);
  END

  -- Si todavía existe la columna legacy Price, copiar a BasePrice (best-effort)
  IF COL_LENGTH(N'dbo.PART', N'Price') IS NOT NULL
  BEGIN
    EXEC(N'UPDATE dbo.PART SET BasePrice = CASE WHEN BasePrice IS NULL OR BasePrice = 0 THEN Price ELSE BasePrice END;');
  END
END

-- Upgrade alternativo: si quedó dbo.STORE_LEGACY (catálogo viejo), migrar filas a PART (best-effort)
IF OBJECT_ID(N'dbo.STORE_LEGACY', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.PART', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.STORE_LEGACY', N'Name') IS NOT NULL
BEGIN
  BEGIN TRY
    INSERT INTO dbo.PART (Id, Name, Category, P, A, M, BasePrice, CreatedAt, UpdatedAt)
    SELECT
      sl.Id,
      sl.Name,
      sl.Category,
      COALESCE(sl.P, 0),
      COALESCE(sl.A, 0),
      COALESCE(sl.M, 0),
      COALESCE(sl.Price, 0),
      COALESCE(sl.CreatedAt, SYSUTCDATETIME()),
      COALESCE(sl.UpdatedAt, SYSUTCDATETIME())
    FROM dbo.STORE_LEGACY sl
    WHERE NOT EXISTS (SELECT 1 FROM dbo.PART p WHERE p.Id = sl.Id)
      AND NOT EXISTS (SELECT 1 FROM dbo.PART p WHERE p.Name = sl.Name);

    -- Si PART ya existía pero BasePrice estaba vacío, rellenarlo desde el legacy
    IF COL_LENGTH(N'dbo.STORE_LEGACY', N'Price') IS NOT NULL
    BEGIN
      UPDATE p
      SET BasePrice = CASE WHEN p.BasePrice IS NULL OR p.BasePrice = 0 THEN sl.Price ELSE p.BasePrice END
      FROM dbo.PART p
      JOIN dbo.STORE_LEGACY sl
        ON sl.Name = p.Name;
    END
  END TRY
  BEGIN CATCH
    DECLARE @msgSL NVARCHAR(4000) = N'No se pudo migrar catálogo desde dbo.STORE_LEGACY hacia dbo.PART. Error: ' + ERROR_MESSAGE();
    RAISERROR(@msgSL, 16, 1);
    RETURN;
  END CATCH
END

BEGIN TRY
  IF OBJECT_ID(N'dbo.STORE', N'U') IS NULL
  BEGIN
    CREATE TABLE dbo.STORE (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Store PRIMARY KEY,
      PartId UNIQUEIDENTIFIER NOT NULL,
      Price DECIMAL(18,2) NOT NULL CONSTRAINT DF_Store_Price DEFAULT (0),
      Stock INT NOT NULL CONSTRAINT DF_Store_Stock DEFAULT (0),
      CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Store_CreatedAt DEFAULT (SYSUTCDATETIME()),
      UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Store_UpdatedAt DEFAULT (SYSUTCDATETIME()),
      CONSTRAINT FK_Store_Part FOREIGN KEY (PartId) REFERENCES dbo.PART(Id),
      CONSTRAINT CK_Store_NonNegative CHECK (Price >= 0 AND Stock >= 0)
    );
  END
END TRY
BEGIN CATCH
  DECLARE @msgS NVARCHAR(4000) = N'No se pudo crear dbo.STORE (listing). Corré este script con un usuario admin/db_owner (no f1app). Error: ' + ERROR_MESSAGE();
  RAISERROR(@msgS, 16, 1);
  RETURN;
END CATCH

IF OBJECT_ID(N'dbo.STORE', N'U') IS NOT NULL
BEGIN
  BEGIN TRY
    IF COL_LENGTH(N'dbo.STORE', N'PartId') IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.STORE') AND name = 'UX_Store_PartId')
       AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID(N'dbo.STORE') AND name = 'UX_Store_PartId')
    BEGIN
      EXEC(N'CREATE UNIQUE INDEX UX_Store_PartId ON dbo.STORE(PartId);');
    END
  END TRY
  BEGIN CATCH
    DECLARE @msgSI NVARCHAR(4000) = N'No se pudo crear índice UX_Store_PartId. Error: ' + ERROR_MESSAGE();
    RAISERROR(@msgSI, 16, 1);
    RETURN;
  END CATCH
END

-- Upgrade alternativo: si quedó dbo.STORE_LEGACY, migrar Price/Stock a dbo.STORE (listing)
IF OBJECT_ID(N'dbo.STORE_LEGACY', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.STORE', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.STORE_LEGACY', N'Price') IS NOT NULL
   AND COL_LENGTH(N'dbo.STORE_LEGACY', N'Stock') IS NOT NULL
BEGIN
  BEGIN TRY
    INSERT INTO dbo.STORE (Id, PartId, Price, Stock, CreatedAt, UpdatedAt)
    SELECT
      NEWID(),
      p.Id,
      sl.Price,
      sl.Stock,
      COALESCE(sl.CreatedAt, SYSUTCDATETIME()),
      COALESCE(sl.UpdatedAt, SYSUTCDATETIME())
    FROM dbo.STORE_LEGACY sl
    JOIN dbo.PART p
      ON p.Name = sl.Name
    WHERE NOT EXISTS (SELECT 1 FROM dbo.STORE s WHERE s.PartId = p.Id);
  END TRY
  BEGIN CATCH
    DECLARE @msgSL2 NVARCHAR(4000) = N'No se pudo migrar listing desde dbo.STORE_LEGACY hacia dbo.STORE. Error: ' + ERROR_MESSAGE();
    RAISERROR(@msgSL2, 16, 1);
    RETURN;
  END CATCH
END

-- Índices del catálogo
IF OBJECT_ID(N'dbo.PART', N'U') IS NOT NULL
BEGIN
  BEGIN TRY
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.PART') AND name = 'IX_Part_Category')
       AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID(N'dbo.PART') AND name = 'IX_Part_Category')
    BEGIN
      CREATE INDEX IX_Part_Category ON dbo.PART(Category);
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.PART') AND name = 'UX_Part_Name')
       AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID(N'dbo.PART') AND name = 'UX_Part_Name')
    BEGIN
      CREATE UNIQUE INDEX UX_Part_Name ON dbo.PART(Name);
    END
  END TRY
  BEGIN CATCH
    DECLARE @msgPI NVARCHAR(4000) = N'No se pudieron crear índices de dbo.PART. Error: ' + ERROR_MESSAGE();
    RAISERROR(@msgPI, 16, 1);
    RETURN;
  END CATCH
END

-- Upgrade: si dbo.PART tiene columnas legacy Price/Stock, migrarlas a dbo.STORE y luego eliminarlas.
IF OBJECT_ID(N'dbo.PART', N'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.STORE', N'U') IS NOT NULL
   AND COL_LENGTH(N'dbo.PART', N'Price') IS NOT NULL
   AND COL_LENGTH(N'dbo.PART', N'Stock') IS NOT NULL
BEGIN
  BEGIN TRY
    EXEC(N'
      INSERT INTO dbo.STORE (Id, PartId, Price, Stock, CreatedAt, UpdatedAt)
      SELECT NEWID(), p.Id, p.Price, p.Stock,
             COALESCE(p.CreatedAt, SYSUTCDATETIME()),
             COALESCE(p.UpdatedAt, SYSUTCDATETIME())
      FROM dbo.PART p
      WHERE NOT EXISTS (SELECT 1 FROM dbo.STORE s WHERE s.PartId = p.Id);
    ');
  END TRY
  BEGIN CATCH
    DECLARE @msgMig NVARCHAR(4000) = N'No se pudo migrar Price/Stock desde dbo.PART legacy hacia dbo.STORE. Error: ' + ERROR_MESSAGE();
    RAISERROR(@msgMig, 16, 1);
    RETURN;
  END CATCH

  -- Drop constraints that reference legacy columns, then drop columns
  IF OBJECT_ID(N'dbo.CK_Parts_NonNegative', N'C') IS NOT NULL
    ALTER TABLE dbo.PART DROP CONSTRAINT CK_Parts_NonNegative;
  IF OBJECT_ID(N'dbo.DF_Parts_Price', N'D') IS NOT NULL
    ALTER TABLE dbo.PART DROP CONSTRAINT DF_Parts_Price;
  IF OBJECT_ID(N'dbo.DF_Parts_Stock', N'D') IS NOT NULL
    ALTER TABLE dbo.PART DROP CONSTRAINT DF_Parts_Stock;

  BEGIN TRY
    ALTER TABLE dbo.PART DROP COLUMN Price;
  END TRY
  BEGIN CATCH
  END CATCH

  BEGIN TRY
    ALTER TABLE dbo.PART DROP COLUMN Stock;
  END TRY
  BEGIN CATCH
  END CATCH
END

DECLARE @p1 UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111111';
DECLARE @p2 UNIQUEIDENTIFIER = '22222222-2222-2222-2222-222222222222';
DECLARE @p3 UNIQUEIDENTIFIER = '33333333-3333-3333-3333-333333333333';
DECLARE @p4 UNIQUEIDENTIFIER = '44444444-4444-4444-4444-444444444444';
DECLARE @p5 UNIQUEIDENTIFIER = '55555555-5555-5555-5555-555555555555';

BEGIN TRY
  IF NOT EXISTS (SELECT 1 FROM dbo.PART WHERE Id = @p1)
  BEGIN
    INSERT INTO dbo.PART (Id, Name, Category, P, A, M, BasePrice)
    VALUES (@p1, N'Paquete aerodinámico estándar', N'Paquete aerodinámico', 1, 4, 2, 12000);
  END
  IF COL_LENGTH(N'dbo.STORE', N'PartId') IS NOT NULL
  BEGIN
    EXEC sp_executesql
      N'IF NOT EXISTS (SELECT 1 FROM dbo.STORE WHERE PartId = @PartId)
        BEGIN
          INSERT INTO dbo.STORE (Id, PartId, Price, Stock)
          VALUES (NEWID(), @PartId, @Price, @Stock);
        END',
      N'@PartId UNIQUEIDENTIFIER, @Price DECIMAL(18,2), @Stock INT',
      @PartId = @p1, @Price = 12000, @Stock = 8;
  END

  IF NOT EXISTS (SELECT 1 FROM dbo.PART WHERE Id = @p2)
  BEGIN
    INSERT INTO dbo.PART (Id, Name, Category, P, A, M, BasePrice)
    VALUES (@p2, N'Juego de neumáticos (medium)', N'Neumáticos', 2, 2, 3, 9000);
  END
  IF COL_LENGTH(N'dbo.STORE', N'PartId') IS NOT NULL
  BEGIN
    EXEC sp_executesql
      N'IF NOT EXISTS (SELECT 1 FROM dbo.STORE WHERE PartId = @PartId)
        BEGIN
          INSERT INTO dbo.STORE (Id, PartId, Price, Stock)
          VALUES (NEWID(), @PartId, @Price, @Stock);
        END',
      N'@PartId UNIQUEIDENTIFIER, @Price DECIMAL(18,2), @Stock INT',
      @PartId = @p2, @Price = 9000, @Stock = 20;
  END

  IF NOT EXISTS (SELECT 1 FROM dbo.PART WHERE Id = @p3)
  BEGIN
    INSERT INTO dbo.PART (Id, Name, Category, P, A, M, BasePrice)
    VALUES (@p3, N'Unidad de potencia V6 híbrida', N'Power Unit', 6, 0, 1, 25000);
  END
  IF COL_LENGTH(N'dbo.STORE', N'PartId') IS NOT NULL
  BEGIN
    EXEC sp_executesql
      N'IF NOT EXISTS (SELECT 1 FROM dbo.STORE WHERE PartId = @PartId)
        BEGIN
          INSERT INTO dbo.STORE (Id, PartId, Price, Stock)
          VALUES (NEWID(), @PartId, @Price, @Stock);
        END',
      N'@PartId UNIQUEIDENTIFIER, @Price DECIMAL(18,2), @Stock INT',
      @PartId = @p3, @Price = 25000, @Stock = 6;
  END

  IF NOT EXISTS (SELECT 1 FROM dbo.PART WHERE Id = @p4)
  BEGIN
    INSERT INTO dbo.PART (Id, Name, Category, P, A, M, BasePrice)
    VALUES (@p4, N'Suspensión reforzada', N'Suspensión', 0, 1, 5, 14000);
  END
  IF COL_LENGTH(N'dbo.STORE', N'PartId') IS NOT NULL
  BEGIN
    EXEC sp_executesql
      N'IF NOT EXISTS (SELECT 1 FROM dbo.STORE WHERE PartId = @PartId)
        BEGIN
          INSERT INTO dbo.STORE (Id, PartId, Price, Stock)
          VALUES (NEWID(), @PartId, @Price, @Stock);
        END',
      N'@PartId UNIQUEIDENTIFIER, @Price DECIMAL(18,2), @Stock INT',
      @PartId = @p4, @Price = 14000, @Stock = 10;
  END

  IF NOT EXISTS (SELECT 1 FROM dbo.PART WHERE Id = @p5)
  BEGIN
    INSERT INTO dbo.PART (Id, Name, Category, P, A, M, BasePrice)
    VALUES (@p5, N'Caja de cambios 8 velocidades', N'Caja de cambios', 2, 1, 2, 16000);
  END
  IF COL_LENGTH(N'dbo.STORE', N'PartId') IS NOT NULL
  BEGIN
    EXEC sp_executesql
      N'IF NOT EXISTS (SELECT 1 FROM dbo.STORE WHERE PartId = @PartId)
        BEGIN
          INSERT INTO dbo.STORE (Id, PartId, Price, Stock)
          VALUES (NEWID(), @PartId, @Price, @Stock);
        END',
      N'@PartId UNIQUEIDENTIFIER, @Price DECIMAL(18,2), @Stock INT',
      @PartId = @p5, @Price = 16000, @Stock = 7;
  END
END TRY
BEGIN CATCH
  DECLARE @msg3 NVARCHAR(4000) = N'No se pudo insertar el catálogo inicial en dbo.PART/dbo.STORE. Corré este script con un usuario admin/db_owner (no f1app). Error: ' + ERROR_MESSAGE();
  RAISERROR(@msg3, 16, 1);
  RETURN;
END CATCH

DECLARE @sql NVARCHAR(MAX);

BEGIN TRY

SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Part_List
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    p.Id,
    p.Name,
    p.Category,
    COALESCE(s.Price, p.BasePrice) AS Price,
    COALESCE(s.Stock, 0) AS Stock,
    p.P,
    p.A,
    p.M,
    p.CreatedAt,
    p.UpdatedAt
  FROM dbo.PART p
  LEFT JOIN dbo.STORE s ON s.PartId = p.Id
  ORDER BY p.CreatedAt DESC;
END';
EXEC sys.sp_executesql @sql;

SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Part_GetById
  @Id UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  SELECT TOP (1)
    p.Id,
    p.Name,
    p.Category,
    COALESCE(s.Price, p.BasePrice) AS Price,
    COALESCE(s.Stock, 0) AS Stock,
    p.P,
    p.A,
    p.M,
    p.CreatedAt,
    p.UpdatedAt
  FROM dbo.PART p
  LEFT JOIN dbo.STORE s ON s.PartId = p.Id
  WHERE p.Id = @Id;
END';
EXEC sys.sp_executesql @sql;

SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Part_Create
  @Id UNIQUEIDENTIFIER,
  @Name NVARCHAR(160),
  @Category NVARCHAR(120),
  @Price DECIMAL(18,2),
  @Stock INT,
  @P INT,
  @A INT,
  @M INT
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  INSERT INTO dbo.PART (Id, Name, Category, P, A, M, BasePrice, CreatedAt, UpdatedAt)
  VALUES (@Id, @Name, @Category, @P, @A, @M, @Price, SYSUTCDATETIME(), SYSUTCDATETIME());

  IF NOT EXISTS (SELECT 1 FROM dbo.STORE WHERE PartId = @Id)
  BEGIN
    INSERT INTO dbo.STORE (Id, PartId, Price, Stock, CreatedAt, UpdatedAt)
    VALUES (NEWID(), @Id, @Price, @Stock, SYSUTCDATETIME(), SYSUTCDATETIME());
  END
  ELSE
  BEGIN
    UPDATE dbo.STORE
    SET Price = @Price,
        Stock = @Stock,
        UpdatedAt = SYSUTCDATETIME()
    WHERE PartId = @Id;
  END

  EXEC dbo.Part_GetById @Id = @Id;
END';
EXEC sys.sp_executesql @sql;

SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Part_DecrementStock
  @Id UNIQUEIDENTIFIER,
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

  BEGIN TRAN;

  UPDATE s
  SET Stock = s.Stock - @Qty,
      UpdatedAt = SYSUTCDATETIME()
  FROM dbo.STORE s
  WHERE s.PartId = @Id AND s.Stock >= @Qty;

  IF @@ROWCOUNT = 0
  BEGIN
    ROLLBACK TRAN;
    IF NOT EXISTS (SELECT 1 FROM dbo.STORE WHERE PartId = @Id)
    BEGIN
      RAISERROR(''Parte no encontrada.'', 16, 1);
      RETURN;
    END
    RAISERROR(''Stock insuficiente.'', 16, 1);
    RETURN;
  END

  COMMIT TRAN;

  EXEC dbo.Part_GetById @Id = @Id;
END';
EXEC sys.sp_executesql @sql;

SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Part_IncrementStock
  @Id UNIQUEIDENTIFIER,
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

  UPDATE dbo.STORE
  SET Stock = Stock + @Qty,
      UpdatedAt = SYSUTCDATETIME()
  WHERE PartId = @Id;

  IF @@ROWCOUNT = 0
  BEGIN
    RAISERROR(''Parte no encontrada.'', 16, 1);
    RETURN;
  END

  EXEC dbo.Part_GetById @Id = @Id;
END';
EXEC sys.sp_executesql @sql;
END TRY
BEGIN CATCH
  DECLARE @msg4 NVARCHAR(4000) = N'No se pudieron crear/alterar stored procedures de Parts. Corré este script con un usuario admin/db_owner (no f1app). Error: ' + ERROR_MESSAGE();
  RAISERROR(@msg4, 16, 1);
  RETURN;
END CATCH

SELECT DB_NAME() AS CurrentDatabase, OBJECT_ID(N'dbo.STORE') AS PartsObjectId, COUNT(1) AS PartsCount
FROM dbo.STORE;

SELECT DB_NAME() AS CurrentDatabase, OBJECT_ID(N'dbo.PART') AS PartObjectId, COUNT(1) AS CatalogCount
FROM dbo.PART;
