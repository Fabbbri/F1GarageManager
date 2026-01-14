/*
  F1 Garage Manager - Users schema (SQL Server)
  Ejecutar en SSMS sobre la base de datos destino.
*/

SET NOCOUNT ON;
GO

IF OBJECT_ID('dbo.[USER]', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.[USER] (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Users PRIMARY KEY,
    Name NVARCHAR(120) NOT NULL,
    Email NVARCHAR(320) COLLATE SQL_Latin1_General_CP1_CI_AS NOT NULL,
    PasswordHash NVARCHAR(255) NOT NULL,
    Role NVARCHAR(20) NOT NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT (SYSUTCDATETIME())
  );

  ALTER TABLE dbo.[USER]
    ADD CONSTRAINT CK_Users_Role CHECK (Role IN ('ADMIN','ENGINEER','DRIVER'));

  CREATE UNIQUE INDEX UX_Users_Email ON dbo.[USER](Email);
END
GO

-- Drop & recreate stored procedures to keep script idempotent
IF OBJECT_ID('dbo.User_GetByEmail', 'P') IS NOT NULL DROP PROCEDURE dbo.User_GetByEmail;
GO
CREATE PROCEDURE dbo.User_GetByEmail
  @Email NVARCHAR(320)
AS
BEGIN
  SET NOCOUNT ON;

  SELECT TOP (1)
    Id,
    Name,
    Email,
    PasswordHash,
    Role,
    CreatedAt
  FROM dbo.[USER]
  WHERE Email = @Email;
END
GO

IF OBJECT_ID('dbo.User_GetById', 'P') IS NOT NULL DROP PROCEDURE dbo.User_GetById;
GO
CREATE PROCEDURE dbo.User_GetById
  @Id UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  SELECT TOP (1)
    Id,
    Name,
    Email,
    PasswordHash,
    Role,
    CreatedAt
  FROM dbo.[USER]
  WHERE Id = @Id;
END
GO

IF OBJECT_ID('dbo.User_Create', 'P') IS NOT NULL DROP PROCEDURE dbo.User_Create;
GO
CREATE PROCEDURE dbo.User_Create
  @Id UNIQUEIDENTIFIER,
  @Name NVARCHAR(120),
  @Email NVARCHAR(320),
  @PasswordHash NVARCHAR(255),
  @Role NVARCHAR(20)
AS
BEGIN
  SET NOCOUNT ON;

  IF EXISTS (SELECT 1 FROM dbo.[USER] WHERE Email = @Email)
  BEGIN
    ;THROW 50001, 'Ese correo ya está registrado.', 1;
  END

  INSERT INTO dbo.[USER] (Id, Name, Email, PasswordHash, Role)
  VALUES (@Id, @Name, @Email, @PasswordHash, @Role);

  EXEC dbo.User_GetById @Id = @Id;
END
GO

DECLARE @sql NVARCHAR(MAX);

-- User_ListEngineersAvailable
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.User_ListEngineersAvailable
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    u.Id,
    u.Name,
    u.Email,
    u.Role
  FROM dbo.[USER] u
  LEFT JOIN dbo.TEAM_ENGINEER te
    ON te.UserId = u.Id
  WHERE u.Role = ''ENGINEER''
    AND te.UserId IS NULL
  ORDER BY u.Name ASC;
END';
EXEC sys.sp_executesql @sql;
