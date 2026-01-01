
SET NOCOUNT ON;

DECLARE @currentDb SYSNAME = DB_NAME();
IF @currentDb IN (N'master', N'model', N'msdb', N'tempdb')
BEGIN
  DECLARE @msgDb NVARCHAR(4000) = N'Estás ejecutando este script en la base "' + @currentDb + N'". Seleccioná tu base de la app (ej: F1GarageManager) y reintentá.';
  RAISERROR(@msgDb, 16, 1);
  RETURN;
END

BEGIN TRY
  IF OBJECT_ID('dbo.STORE', 'U') IS NULL
  BEGIN
    CREATE TABLE dbo.STORE (
      Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Parts PRIMARY KEY,
      Name NVARCHAR(160) NOT NULL,
      Category NVARCHAR(120) NOT NULL,
      Price DECIMAL(18,2) NOT NULL CONSTRAINT DF_Parts_Price DEFAULT (0),
      Stock INT NOT NULL CONSTRAINT DF_Parts_Stock DEFAULT (0),
      P INT NOT NULL CONSTRAINT DF_Parts_P DEFAULT (0),
      A INT NOT NULL CONSTRAINT DF_Parts_A DEFAULT (0),
      M INT NOT NULL CONSTRAINT DF_Parts_M DEFAULT (0),
      CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Parts_CreatedAt DEFAULT (SYSUTCDATETIME()),
      UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Parts_UpdatedAt DEFAULT (SYSUTCDATETIME()),
      CONSTRAINT CK_Parts_NonNegative CHECK (Price >= 0 AND Stock >= 0),
      CONSTRAINT CK_Parts_PAM CHECK (P BETWEEN 0 AND 9 AND A BETWEEN 0 AND 9 AND M BETWEEN 0 AND 9)
    );
  END
END TRY
BEGIN CATCH
  DECLARE @msg1 NVARCHAR(4000) = N'No se pudo crear dbo.STORE. Corré este script con un usuario admin/db_owner (no f1app). Error: ' + ERROR_MESSAGE();
  RAISERROR(@msg1, 16, 1);
  RETURN;
END CATCH

IF OBJECT_ID('dbo.STORE', 'U') IS NOT NULL
BEGIN
  BEGIN TRY
    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.STORE') AND name = 'IX_Parts_Category')
       AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.STORE') AND name = 'IX_Parts_Category')
    BEGIN
      CREATE INDEX IX_Parts_Category ON dbo.STORE(Category);
    END

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.STORE') AND name = 'UX_Parts_Name')
       AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.STORE') AND name = 'UX_Parts_Name')
    BEGIN
      CREATE UNIQUE INDEX UX_Parts_Name ON dbo.STORE(Name);
    END
  END TRY
  BEGIN CATCH
    DECLARE @msg2 NVARCHAR(4000) = N'No se pudieron crear índices de dbo.STORE. Corré este script con un usuario admin/db_owner (no f1app). Error: ' + ERROR_MESSAGE();
    RAISERROR(@msg2, 16, 1);
    RETURN;
  END CATCH
END

DECLARE @p1 UNIQUEIDENTIFIER = '11111111-1111-1111-1111-111111111111';
DECLARE @p2 UNIQUEIDENTIFIER = '22222222-2222-2222-2222-222222222222';
DECLARE @p3 UNIQUEIDENTIFIER = '33333333-3333-3333-3333-333333333333';
DECLARE @p4 UNIQUEIDENTIFIER = '44444444-4444-4444-4444-444444444444';
DECLARE @p5 UNIQUEIDENTIFIER = '55555555-5555-5555-5555-555555555555';

BEGIN TRY
  IF NOT EXISTS (SELECT 1 FROM dbo.STORE WHERE Id = @p1)
  BEGIN
    INSERT INTO dbo.STORE (Id, Name, Category, Price, Stock, P, A, M)
    VALUES (@p1, N'Paquete aerodinámico estándar', N'Paquete aerodinámico', 12000, 8, 1, 4, 2);
  END

  IF NOT EXISTS (SELECT 1 FROM dbo.STORE WHERE Id = @p2)
  BEGIN
    INSERT INTO dbo.STORE (Id, Name, Category, Price, Stock, P, A, M)
    VALUES (@p2, N'Juego de neumáticos (medium)', N'Neumáticos', 9000, 20, 2, 2, 3);
  END

  IF NOT EXISTS (SELECT 1 FROM dbo.STORE WHERE Id = @p3)
  BEGIN
    INSERT INTO dbo.STORE (Id, Name, Category, Price, Stock, P, A, M)
    VALUES (@p3, N'Unidad de potencia V6 híbrida', N'Power Unit', 25000, 6, 6, 0, 1);
  END

  IF NOT EXISTS (SELECT 1 FROM dbo.STORE WHERE Id = @p4)
  BEGIN
    INSERT INTO dbo.STORE (Id, Name, Category, Price, Stock, P, A, M)
    VALUES (@p4, N'Suspensión reforzada', N'Suspensión', 14000, 10, 0, 1, 5);
  END

  IF NOT EXISTS (SELECT 1 FROM dbo.STORE WHERE Id = @p5)
  BEGIN
    INSERT INTO dbo.STORE (Id, Name, Category, Price, Stock, P, A, M)
    VALUES (@p5, N'Caja de cambios 8 velocidades', N'Caja de cambios', 16000, 7, 2, 1, 2);
  END
END TRY
BEGIN CATCH
  DECLARE @msg3 NVARCHAR(4000) = N'No se pudo insertar el catálogo inicial en dbo.STORE. Corré este script con un usuario admin/db_owner (no f1app). Error: ' + ERROR_MESSAGE();
  RAISERROR(@msg3, 16, 1);
  RETURN;
END CATCH

DECLARE @sql NVARCHAR(MAX);

BEGIN TRY

SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Part_List
AS
BEGIN
  SET NOCOUNT ON;

  SELECT Id, Name, Category, Price, Stock, P, A, M, CreatedAt, UpdatedAt
  FROM dbo.STORE
  ORDER BY CreatedAt DESC;
END';
EXEC sys.sp_executesql @sql;

SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Part_GetById
  @Id UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  SELECT TOP (1) Id, Name, Category, Price, Stock, P, A, M, CreatedAt, UpdatedAt
  FROM dbo.STORE
  WHERE Id = @Id;
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

  INSERT INTO dbo.STORE (Id, Name, Category, Price, Stock, P, A, M, CreatedAt, UpdatedAt)
  VALUES (@Id, @Name, @Category, @Price, @Stock, @P, @A, @M, SYSUTCDATETIME(), SYSUTCDATETIME());

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

  UPDATE dbo.STORE
  SET Stock = Stock - @Qty,
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @Id AND Stock >= @Qty;

  IF @@ROWCOUNT = 0
  BEGIN
    ROLLBACK TRAN;
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
  WHERE Id = @Id;

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
