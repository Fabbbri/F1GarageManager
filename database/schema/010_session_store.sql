/*
  F1 Garage Manager - Session store (SQL Server)
  Used by backend express-session SqlServerSessionStore.

  Ejecutar en SSMS sobre la base de datos destino (F1GarageManager).
*/

SET NOCOUNT ON;
GO

IF OBJECT_ID(N'dbo.SESSION', N'U') IS NULL
BEGIN
  CREATE TABLE dbo.[SESSION] (
    sid NVARCHAR(128) NOT NULL CONSTRAINT PK_SessionStore PRIMARY KEY,
    sess NVARCHAR(MAX) NOT NULL,
    expire DATETIME2(0) NOT NULL
  );

  CREATE INDEX IX_SessionStore_Expire ON dbo.[SESSION](expire);
END
GO
