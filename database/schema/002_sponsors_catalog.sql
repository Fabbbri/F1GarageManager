-- Agrega esto al script de setup (mantiene tu tabla y los SPs Add/Remove, y añade List, GetById y Update)
SET NOCOUNT ON;
IF OBJECT_ID('dbo.SPONSOR', 'U') IS NULL
BEGIN

    CREATE TABLE dbo.SPONSOR (
        id     INT IDENTITY(1,1) NOT NULL,
        nombre NVARCHAR(150) NOT NULL,
        fecha  DATE NOT NULL CONSTRAINT DF_SPONSOR_fecha DEFAULT (CONVERT(date, SYSDATETIME())),
        CONSTRAINT PK_SPONSOR PRIMARY KEY (id),
        CONSTRAINT UQ_SPONSOR_nombre UNIQUE (nombre)
    );
END
DECLARE @sql NVARCHAR(MAX);

BEGIN TRY
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Sponsor_Add
  @Nombre NVARCHAR(150),
  @Fecha  DATE = NULL
AS
BEGIN
  SET NOCOUNT ON;

  IF @Nombre IS NULL OR LTRIM(RTRIM(@Nombre)) = ''''
  BEGIN
    RAISERROR(''Nombre de sponsor requerido.'', 16, 1);
    RETURN;
  END

  INSERT INTO dbo.SPONSOR(nombre, fecha)
  VALUES (LTRIM(RTRIM(@Nombre)), COALESCE(@Fecha, CONVERT(date, SYSDATETIME())));

  SELECT SCOPE_IDENTITY() AS NewSponsorId;
END';
EXEC sys.sp_executesql @sql;

SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Sponsor_Remove
  @SponsorId INT
AS
BEGIN
  SET NOCOUNT ON;

  IF EXISTS (SELECT 1 FROM dbo.TEAM_EARNINGS WHERE SponsorId = @SponsorId)
  BEGIN
    RAISERROR(''No se puede eliminar: el sponsor tiene aportes registrados.'', 16, 1);
    RETURN;
  END

  DELETE FROM dbo.SPONSOR
  OUTPUT DELETED.id AS DeletedId
  WHERE id = @SponsorId;

  IF @@ROWCOUNT = 0
    RAISERROR(''Sponsor no encontrado.'', 16, 1);
END';
EXEC sys.sp_executesql @sql;

-- Lista todos los sponsors
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Sponsor_List
AS
BEGIN
  SET NOCOUNT ON;
  SELECT id, nombre, fecha
  FROM dbo.SPONSOR
  ORDER BY id DESC;
END';
EXEC sys.sp_executesql @sql;

-- Obtener sponsor por id
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Sponsor_GetById
  @SponsorId INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT id, nombre, fecha
  FROM dbo.SPONSOR
  WHERE id = @SponsorId;
END';
EXEC sys.sp_executesql @sql;

-- Actualizar sponsor
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Sponsor_Update
  @SponsorId INT,
  @Nombre NVARCHAR(150) = NULL,
  @Fecha DATE = NULL
AS
BEGIN
  SET NOCOUNT ON;

  IF @Nombre IS NOT NULL AND LTRIM(RTRIM(@Nombre)) = ''''
  BEGIN
    RAISERROR(''Nombre de sponsor inválido.'', 16, 1);
    RETURN;
  END

  IF @Nombre IS NOT NULL
  BEGIN
    IF EXISTS (SELECT 1 FROM dbo.SPONSOR WHERE nombre = LTRIM(RTRIM(@Nombre)) AND id <> @SponsorId)
    BEGIN
      RAISERROR(''Ya existe otro sponsor con ese nombre.'', 16, 1);
      RETURN;
    END
  END

  UPDATE dbo.SPONSOR
  SET
    nombre = COALESCE(LTRIM(RTRIM(@Nombre)), nombre),
    fecha = COALESCE(@Fecha, fecha)
  OUTPUT INSERTED.id AS id, INSERTED.nombre AS nombre, INSERTED.fecha AS fecha
  WHERE id = @SponsorId;

  IF @@ROWCOUNT = 0
    RAISERROR(''Sponsor no encontrado.'', 16, 1);
END';
EXEC sys.sp_executesql @sql;

END TRY
BEGIN CATCH
  DECLARE @msgSp NVARCHAR(4000) = N'No se pudo crear/alterar dbo.Sponsor. Corré este script con un usuario admin/db_owner (no f1app). Error: ' + ERROR_MESSAGE();
  RAISERROR(@msgSp, 16, 1);
  RETURN;
END CATCH