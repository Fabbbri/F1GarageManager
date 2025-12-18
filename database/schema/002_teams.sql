/*
  F1 Garage Manager - Teams schema (SQL Server)
  Ejecutar en SSMS sobre la base de datos destino.

  Persistencia de equipos y su detalle (budget/sponsors/inventory/cars/drivers)
  usando una columna JSON (Data) para mantener el modelo actual del backend.
*/

SET NOCOUNT ON;
GO

IF OBJECT_ID('dbo.Teams', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Teams (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Teams PRIMARY KEY,
    Name NVARCHAR(120) NOT NULL,
    Country NVARCHAR(120) NULL,
    Data NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Teams_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Teams_UpdatedAt DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.Teams
    ADD CONSTRAINT CK_Teams_Data_IsJson CHECK (ISJSON(Data) = 1);

  CREATE INDEX IX_Teams_UpdatedAt ON dbo.Teams(UpdatedAt DESC);
  CREATE INDEX IX_Teams_Name ON dbo.Teams(Name);
END
GO

-- Drop & recreate stored procedures to keep script idempotent
IF OBJECT_ID('dbo.Team_GetById', 'P') IS NOT NULL DROP PROCEDURE dbo.Team_GetById;
GO
CREATE PROCEDURE dbo.Team_GetById
  @Id UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  SELECT TOP (1)
    Id,
    Name,
    Country,
    Data,
    CreatedAt,
    UpdatedAt
  FROM dbo.Teams
  WHERE Id = @Id;
END
GO

IF OBJECT_ID('dbo.Team_List', 'P') IS NOT NULL DROP PROCEDURE dbo.Team_List;
GO
CREATE PROCEDURE dbo.Team_List
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    Id,
    Name,
    Country,
    Data,
    CreatedAt,
    UpdatedAt
  FROM dbo.Teams
  ORDER BY UpdatedAt DESC;
END
GO

IF OBJECT_ID('dbo.Team_Create', 'P') IS NOT NULL DROP PROCEDURE dbo.Team_Create;
GO
CREATE PROCEDURE dbo.Team_Create
  @Id UNIQUEIDENTIFIER,
  @Name NVARCHAR(120),
  @Country NVARCHAR(120) = NULL,
  @Data NVARCHAR(MAX)
AS
BEGIN
  SET NOCOUNT ON;

  IF @Name IS NULL OR LTRIM(RTRIM(@Name)) = ''
  BEGIN
    ;THROW 51001, 'Nombre requerido.', 1;
  END

  IF ISJSON(@Data) <> 1
  BEGIN
    ;THROW 51002, 'Data debe ser JSON válido.', 1;
  END

  IF EXISTS (SELECT 1 FROM dbo.Teams WHERE Id = @Id)
  BEGIN
    ;THROW 51003, 'Ya existe un equipo con ese ID.', 1;
  END

  DECLARE @Now DATETIME2(0) = SYSUTCDATETIME();

  INSERT INTO dbo.Teams (Id, Name, Country, Data, CreatedAt, UpdatedAt)
  VALUES (@Id, @Name, @Country, @Data, @Now, @Now);

  EXEC dbo.Team_GetById @Id = @Id;
END
GO

IF OBJECT_ID('dbo.Team_Save', 'P') IS NOT NULL DROP PROCEDURE dbo.Team_Save;
GO
CREATE PROCEDURE dbo.Team_Save
  @Id UNIQUEIDENTIFIER,
  @Name NVARCHAR(120),
  @Country NVARCHAR(120) = NULL,
  @Data NVARCHAR(MAX)
AS
BEGIN
  SET NOCOUNT ON;

  IF @Name IS NULL OR LTRIM(RTRIM(@Name)) = ''
  BEGIN
    ;THROW 51001, 'Nombre requerido.', 1;
  END

  IF ISJSON(@Data) <> 1
  BEGIN
    ;THROW 51002, 'Data debe ser JSON válido.', 1;
  END

  IF NOT EXISTS (SELECT 1 FROM dbo.Teams WHERE Id = @Id)
  BEGIN
    ;THROW 51004, 'Equipo no encontrado.', 1;
  END

  UPDATE dbo.Teams
  SET
    Name = @Name,
    Country = @Country,
    Data = @Data,
    UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @Id;

  EXEC dbo.Team_GetById @Id = @Id;
END
GO

IF OBJECT_ID('dbo.Team_Delete', 'P') IS NOT NULL DROP PROCEDURE dbo.Team_Delete;
GO
CREATE PROCEDURE dbo.Team_Delete
  @Id UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  DELETE FROM dbo.Teams WHERE Id = @Id;
  SELECT @@ROWCOUNT AS affected;
END
GO
