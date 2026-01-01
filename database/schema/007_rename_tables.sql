-- Rename legacy tables to new naming convention (UPPERCASE, singular, underscore)
-- Safe to run multiple times (idempotent-ish): renames only when old exists and new does not.
-- Note: This does NOT update stored procedure bodies that reference old table names.
--       After running this, re-run the schema scripts in database/schema/ to recreate procs.

SET NOCOUNT ON;

DECLARE @currentDb SYSNAME = DB_NAME();
IF @currentDb IN (N'master', N'model', N'msdb', N'tempdb')
BEGIN
  DECLARE @msgDb NVARCHAR(4000) = N'Estás ejecutando este script en la base "' + @currentDb + N'". Seleccioná tu base de la app (ej: F1GarageManager) y reintentá.';
  RAISERROR(@msgDb, 16, 1);
  RETURN;
END

-- Helper pattern: IF old exists AND new does not -> rename

-- Users -> USER (reserved keyword; always reference as dbo.[USER])
IF OBJECT_ID(N'dbo.Users', 'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.[USER]', 'U') IS NULL
BEGIN
  EXEC sys.sp_rename @objname = N'dbo.Users', @newname = N'USER', @objtype = N'OBJECT';
END

-- Parts -> PART
IF OBJECT_ID(N'dbo.Parts', 'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.PART', 'U') IS NULL
BEGIN
  EXEC sys.sp_rename @objname = N'dbo.Parts', @newname = N'PART', @objtype = N'OBJECT';
END

-- Teams -> TEAM
IF OBJECT_ID(N'dbo.Teams', 'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.TEAM', 'U') IS NULL
BEGIN
  EXEC sys.sp_rename @objname = N'dbo.Teams', @newname = N'TEAM', @objtype = N'OBJECT';
END

-- TeamBudgets -> TEAM_BUDGET
IF OBJECT_ID(N'dbo.TeamBudgets', 'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.TEAM_BUDGET', 'U') IS NULL
BEGIN
  EXEC sys.sp_rename @objname = N'dbo.TeamBudgets', @newname = N'TEAM_BUDGET', @objtype = N'OBJECT';
END

-- TeamSponsors -> TEAM_SPONSOR
IF OBJECT_ID(N'dbo.TeamSponsors', 'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.TEAM_SPONSOR', 'U') IS NULL
BEGIN
  EXEC sys.sp_rename @objname = N'dbo.TeamSponsors', @newname = N'TEAM_SPONSOR', @objtype = N'OBJECT';
END

-- TeamCars -> TEAM_CAR
IF OBJECT_ID(N'dbo.TeamCars', 'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.TEAM_CAR', 'U') IS NULL
BEGIN
  EXEC sys.sp_rename @objname = N'dbo.TeamCars', @newname = N'TEAM_CAR', @objtype = N'OBJECT';
END

-- TeamDrivers -> TEAM_DRIVER
IF OBJECT_ID(N'dbo.TeamDrivers', 'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.TEAM_DRIVER', 'U') IS NULL
BEGIN
  EXEC sys.sp_rename @objname = N'dbo.TeamDrivers', @newname = N'TEAM_DRIVER', @objtype = N'OBJECT';
END

-- TeamInventoryItems -> TEAM_INVENTORY_ITEM
IF OBJECT_ID(N'dbo.TeamInventoryItems', 'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.TEAM_INVENTORY_ITEM', 'U') IS NULL
BEGIN
  EXEC sys.sp_rename @objname = N'dbo.TeamInventoryItems', @newname = N'TEAM_INVENTORY_ITEM', @objtype = N'OBJECT';
END

-- TeamCarInstalledParts -> TEAM_CAR_INSTALLED_PART
IF OBJECT_ID(N'dbo.TeamCarInstalledParts', 'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.TEAM_CAR_INSTALLED_PART', 'U') IS NULL
BEGIN
  EXEC sys.sp_rename @objname = N'dbo.TeamCarInstalledParts', @newname = N'TEAM_CAR_INSTALLED_PART', @objtype = N'OBJECT';
END

-- Some DBs used a pluralized variant name; support that too.
IF OBJECT_ID(N'dbo.TeamCarsInstalledParts', 'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.TEAM_CAR_INSTALLED_PART', 'U') IS NULL
BEGIN
  EXEC sys.sp_rename @objname = N'dbo.TeamCarsInstalledParts', @newname = N'TEAM_CAR_INSTALLED_PART', @objtype = N'OBJECT';
END

-- TeamStorePurchases -> TEAM_STORE_PURCHASE
IF OBJECT_ID(N'dbo.TeamStorePurchases', 'U') IS NOT NULL
   AND OBJECT_ID(N'dbo.TEAM_STORE_PURCHASE', 'U') IS NULL
BEGIN
  EXEC sys.sp_rename @objname = N'dbo.TeamStorePurchases', @newname = N'TEAM_STORE_PURCHASE', @objtype = N'OBJECT';
END
