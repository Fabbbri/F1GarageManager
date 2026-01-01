/*
  F1 Garage Manager - Teams schema (SQL Server) - Relational (NO JSON) - NO GO / NO THROW

  Este script evita:
  - GO (batch separator), por si tu herramienta lo envía al servidor.
  - THROW (por compatibilidad). Usa RAISERROR.

  Ejecutar sobre la base de datos destino (ej: F1GarageManager).
*/

SET NOCOUNT ON;

-- Ensure Teams table exists
IF OBJECT_ID('dbo.TEAM', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.TEAM (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Teams PRIMARY KEY,
    Name NVARCHAR(120) NOT NULL,
    Country NVARCHAR(120) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Teams_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Teams_UpdatedAt DEFAULT (SYSUTCDATETIME())
  );
END

-- Indexes (idempotent)
IF OBJECT_ID('dbo.TEAM', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.TEAM') AND name = 'IX_Teams_UpdatedAt')
     AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.TEAM') AND name = 'IX_Teams_UpdatedAt')
  BEGIN
    CREATE INDEX IX_Teams_UpdatedAt ON dbo.TEAM(UpdatedAt DESC);
  END

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.TEAM') AND name = 'IX_Teams_Name')
     AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.TEAM') AND name = 'IX_Teams_Name')
  BEGIN
    CREATE INDEX IX_Teams_Name ON dbo.TEAM(Name);
  END
END

-- If an older JSON-based column exists, remove it (keeps rows)
IF COL_LENGTH('dbo.TEAM', 'Data') IS NOT NULL
BEGIN
  IF OBJECT_ID('dbo.CK_Teams_Data_IsJson', 'C') IS NOT NULL
    ALTER TABLE dbo.TEAM DROP CONSTRAINT CK_Teams_Data_IsJson;

  ALTER TABLE dbo.TEAM DROP COLUMN Data;
END

-- 1:1 Budget
IF OBJECT_ID('dbo.TEAM_BUDGET', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.TEAM_BUDGET (
    TeamId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TeamBudgets PRIMARY KEY,
    Total DECIMAL(18,2) NOT NULL CONSTRAINT DF_TeamBudgets_Total DEFAULT (0),
    Spent DECIMAL(18,2) NOT NULL CONSTRAINT DF_TeamBudgets_Spent DEFAULT (0),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_TeamBudgets_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_TeamBudgets_Teams FOREIGN KEY (TeamId) REFERENCES dbo.TEAM(Id) ON DELETE CASCADE,
    CONSTRAINT CK_TeamBudgets_NonNegative CHECK (Total >= 0 AND Spent >= 0 AND Spent <= Total)
  );
END

IF OBJECT_ID('dbo.TEAM_BUDGET', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.TEAM_BUDGET') AND name = 'IX_TeamBudgets_UpdatedAt')
     AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.TEAM_BUDGET') AND name = 'IX_TeamBudgets_UpdatedAt')
  BEGIN
    CREATE INDEX IX_TeamBudgets_UpdatedAt ON dbo.TEAM_BUDGET(UpdatedAt DESC);
  END
END

-- Sponsors
IF OBJECT_ID('dbo.TEAM_SPONSOR', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.TEAM_SPONSOR (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TeamSponsors PRIMARY KEY,
    TeamId UNIQUEIDENTIFIER NOT NULL,
    Name NVARCHAR(120) NOT NULL,
    Contribution DECIMAL(18,2) NOT NULL CONSTRAINT DF_TeamSponsors_Contribution DEFAULT (0),
    Description NVARCHAR(300) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_TeamSponsors_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_TeamSponsors_Teams FOREIGN KEY (TeamId) REFERENCES dbo.TEAM(Id) ON DELETE CASCADE,
    CONSTRAINT CK_TeamSponsors_Contribution CHECK (Contribution >= 0)
  );
END

IF OBJECT_ID('dbo.TEAM_SPONSOR', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.TEAM_SPONSOR') AND name = 'IX_TeamSponsors_TeamId')
     AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.TEAM_SPONSOR') AND name = 'IX_TeamSponsors_TeamId')
  BEGIN
    CREATE INDEX IX_TeamSponsors_TeamId ON dbo.TEAM_SPONSOR(TeamId);
  END
END

-- Add Description if upgrading an existing database
IF COL_LENGTH('dbo.TEAM_SPONSOR', 'Description') IS NULL
BEGIN
  ALTER TABLE dbo.TEAM_SPONSOR ADD Description NVARCHAR(300) NULL;
END

-- Cars (max 2 per team enforced in SP)
IF OBJECT_ID('dbo.TEAM_CAR', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.TEAM_CAR (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TeamCars PRIMARY KEY,
    TeamId UNIQUEIDENTIFIER NOT NULL,
    Code NVARCHAR(40) NOT NULL,
    Name NVARCHAR(120) NULL,
    DriverId UNIQUEIDENTIFIER NULL,
    IsFinalized BIT NOT NULL CONSTRAINT DF_TeamCars_IsFinalized DEFAULT (0),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_TeamCars_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_TeamCars_Teams FOREIGN KEY (TeamId) REFERENCES dbo.TEAM(Id) ON DELETE CASCADE
  );
END

-- Add DriverId/IsFinalized if upgrading an existing database
IF COL_LENGTH('dbo.TEAM_CAR', 'DriverId') IS NULL
BEGIN
  ALTER TABLE dbo.TEAM_CAR ADD DriverId UNIQUEIDENTIFIER NULL;
END
IF COL_LENGTH('dbo.TEAM_CAR', 'IsFinalized') IS NULL
BEGIN
  ALTER TABLE dbo.TEAM_CAR ADD IsFinalized BIT NOT NULL CONSTRAINT DF_TeamCars_IsFinalized DEFAULT (0);
END

IF OBJECT_ID('dbo.TEAM_CAR', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.TEAM_CAR') AND name = 'UX_TeamCars_TeamId_Code')
     AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.TEAM_CAR') AND name = 'UX_TeamCars_TeamId_Code')
  BEGIN
    CREATE UNIQUE INDEX UX_TeamCars_TeamId_Code ON dbo.TEAM_CAR(TeamId, Code);
  END

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.TEAM_CAR') AND name = 'IX_TeamCars_TeamId')
     AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.TEAM_CAR') AND name = 'IX_TeamCars_TeamId')
  BEGIN
    CREATE INDEX IX_TeamCars_TeamId ON dbo.TEAM_CAR(TeamId);
  END
END

-- Drivers
IF OBJECT_ID('dbo.TEAM_DRIVER', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.TEAM_DRIVER (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TeamDrivers PRIMARY KEY,
    TeamId UNIQUEIDENTIFIER NOT NULL,
    Name NVARCHAR(120) NOT NULL,
    Skill INT NOT NULL CONSTRAINT DF_TeamDrivers_Skill DEFAULT (50),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_TeamDrivers_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_TeamDrivers_Teams FOREIGN KEY (TeamId) REFERENCES dbo.TEAM(Id) ON DELETE CASCADE,
    CONSTRAINT CK_TeamDrivers_Skill CHECK (Skill >= 0 AND Skill <= 100)
  );
END

IF OBJECT_ID('dbo.TEAM_DRIVER', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.TEAM_DRIVER') AND name = 'IX_TeamDrivers_TeamId')
     AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.TEAM_DRIVER') AND name = 'IX_TeamDrivers_TeamId')
  BEGIN
    CREATE INDEX IX_TeamDrivers_TeamId ON dbo.TEAM_DRIVER(TeamId);
  END
END

-- Inventory
IF OBJECT_ID('dbo.TEAM_INVENTORY_ITEM', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.TEAM_INVENTORY_ITEM (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TeamInventoryItems PRIMARY KEY,
    TeamId UNIQUEIDENTIFIER NOT NULL,
    PartId UNIQUEIDENTIFIER NULL,
    PartName NVARCHAR(160) NOT NULL,
    Category NVARCHAR(120) NULL,
    P INT NOT NULL CONSTRAINT DF_TeamInventoryItems_P DEFAULT (0),
    A INT NOT NULL CONSTRAINT DF_TeamInventoryItems_A DEFAULT (0),
    M INT NOT NULL CONSTRAINT DF_TeamInventoryItems_M DEFAULT (0),
    Qty INT NOT NULL CONSTRAINT DF_TeamInventoryItems_Qty DEFAULT (0),
    UnitCost DECIMAL(18,2) NOT NULL CONSTRAINT DF_TeamInventoryItems_UnitCost DEFAULT (0),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_TeamInventoryItems_CreatedAt DEFAULT (SYSUTCDATETIME()),
    AcquiredAt DATETIME2(0) NOT NULL CONSTRAINT DF_TeamInventoryItems_AcquiredAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_TeamInventoryItems_Teams FOREIGN KEY (TeamId) REFERENCES dbo.TEAM(Id) ON DELETE CASCADE,
    CONSTRAINT CK_TeamInventoryItems_NonNegative CHECK (Qty >= 0 AND UnitCost >= 0),
    CONSTRAINT CK_TeamInventoryItems_PAM CHECK (P BETWEEN 0 AND 9 AND A BETWEEN 0 AND 9 AND M BETWEEN 0 AND 9)
  );
END

-- Add PartId/AcquiredAt if upgrading an existing database
IF COL_LENGTH('dbo.TEAM_INVENTORY_ITEM', 'PartId') IS NULL
BEGIN
  BEGIN TRY
    ALTER TABLE dbo.TEAM_INVENTORY_ITEM ADD PartId UNIQUEIDENTIFIER NULL;
  END TRY
  BEGIN CATCH
    RAISERROR('No se pudo agregar columna PartId a dbo.TEAM_INVENTORY_ITEM. Corré este script con un usuario admin/db_owner y reintentá.', 16, 1);
    RETURN;
  END CATCH
END
IF COL_LENGTH('dbo.TEAM_INVENTORY_ITEM', 'AcquiredAt') IS NULL
BEGIN
  BEGIN TRY
    ALTER TABLE dbo.TEAM_INVENTORY_ITEM ADD AcquiredAt DATETIME2(0) NOT NULL CONSTRAINT DF_TeamInventoryItems_AcquiredAt DEFAULT (SYSUTCDATETIME());
  END TRY
  BEGIN CATCH
    RAISERROR('No se pudo agregar columna AcquiredAt a dbo.TEAM_INVENTORY_ITEM. Corré este script con un usuario admin/db_owner y reintentá.', 16, 1);
    RETURN;
  END CATCH
END

IF COL_LENGTH('dbo.TEAM_INVENTORY_ITEM', 'P') IS NULL
BEGIN
  ALTER TABLE dbo.TEAM_INVENTORY_ITEM ADD P INT NOT NULL CONSTRAINT DF_TeamInventoryItems_P DEFAULT (0);
END
IF COL_LENGTH('dbo.TEAM_INVENTORY_ITEM', 'A') IS NULL
BEGIN
  ALTER TABLE dbo.TEAM_INVENTORY_ITEM ADD A INT NOT NULL CONSTRAINT DF_TeamInventoryItems_A DEFAULT (0);
END
IF COL_LENGTH('dbo.TEAM_INVENTORY_ITEM', 'M') IS NULL
BEGIN
  ALTER TABLE dbo.TEAM_INVENTORY_ITEM ADD M INT NOT NULL CONSTRAINT DF_TeamInventoryItems_M DEFAULT (0);
END

-- Si por permisos/ejecución parcial las columnas no quedaron creadas, salir con un mensaje claro
IF COL_LENGTH('dbo.TEAM_INVENTORY_ITEM', 'PartId') IS NULL
BEGIN
  RAISERROR('La columna PartId no existe en dbo.TEAM_INVENTORY_ITEM. Corré este script con un usuario admin/db_owner (no f1app) para aplicar el upgrade.', 16, 1);
  RETURN;
END
IF COL_LENGTH('dbo.TEAM_INVENTORY_ITEM', 'AcquiredAt') IS NULL
BEGIN
  RAISERROR('La columna AcquiredAt no existe en dbo.TEAM_INVENTORY_ITEM. Corré este script con un usuario admin/db_owner (no f1app) para aplicar el upgrade.', 16, 1);
  RETURN;
END

IF COL_LENGTH('dbo.TEAM_INVENTORY_ITEM', 'P') IS NULL OR COL_LENGTH('dbo.TEAM_INVENTORY_ITEM', 'A') IS NULL OR COL_LENGTH('dbo.TEAM_INVENTORY_ITEM', 'M') IS NULL
BEGIN
  RAISERROR('Faltan columnas P/A/M en dbo.TEAM_INVENTORY_ITEM. Corré este script con un usuario admin/db_owner para aplicar el upgrade.', 16, 1);
  RETURN;
END

IF OBJECT_ID('dbo.TEAM_INVENTORY_ITEM', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.TEAM_INVENTORY_ITEM') AND name = 'IX_TeamInventoryItems_TeamId')
     AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.TEAM_INVENTORY_ITEM') AND name = 'IX_TeamInventoryItems_TeamId')
  BEGIN
    CREATE INDEX IX_TeamInventoryItems_TeamId ON dbo.TEAM_INVENTORY_ITEM(TeamId);
  END

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.TEAM_INVENTORY_ITEM') AND name = 'UX_TeamInventoryItems_TeamId_PartId')
     AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.TEAM_INVENTORY_ITEM') AND name = 'UX_TeamInventoryItems_TeamId_PartId')
  BEGIN
    IF COL_LENGTH('dbo.TEAM_INVENTORY_ITEM', 'PartId') IS NOT NULL
    BEGIN
      -- SQL Server puede validar columnas en compile-time aun dentro de IF.
      -- Usamos SQL dinámico para que solo compile/ejecute si PartId existe.
      EXEC(N'CREATE UNIQUE INDEX UX_TeamInventoryItems_TeamId_PartId ON dbo.TEAM_INVENTORY_ITEM(TeamId, PartId) WHERE PartId IS NOT NULL;');
    END
  END
END

-- Installed parts (per car)
IF OBJECT_ID('dbo.TEAM_CAR_INSTALLED_PART', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.TEAM_CAR_INSTALLED_PART (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TeamCarInstalledParts PRIMARY KEY,
    TeamId UNIQUEIDENTIFIER NOT NULL,
    CarId UNIQUEIDENTIFIER NOT NULL,
    InventoryItemId UNIQUEIDENTIFIER NOT NULL,
    CategoryKey NVARCHAR(160) NOT NULL,
    PartName NVARCHAR(160) NOT NULL,
    Category NVARCHAR(120) NULL,
    P INT NOT NULL CONSTRAINT DF_TeamCarInstalledParts_P DEFAULT (0),
    A INT NOT NULL CONSTRAINT DF_TeamCarInstalledParts_A DEFAULT (0),
    M INT NOT NULL CONSTRAINT DF_TeamCarInstalledParts_M DEFAULT (0),
    InstalledAt DATETIME2(0) NOT NULL CONSTRAINT DF_TeamCarInstalledParts_InstalledAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_TeamCarInstalledParts_Teams FOREIGN KEY (TeamId) REFERENCES dbo.TEAM(Id) ON DELETE CASCADE,
    CONSTRAINT FK_TeamCarInstalledParts_Cars FOREIGN KEY (CarId) REFERENCES dbo.TEAM_CAR(Id),
    CONSTRAINT FK_TeamCarInstalledParts_Inventory FOREIGN KEY (InventoryItemId) REFERENCES dbo.TEAM_INVENTORY_ITEM(Id),
    CONSTRAINT CK_TeamCarInstalledParts_PAM CHECK (P BETWEEN 0 AND 9 AND A BETWEEN 0 AND 9 AND M BETWEEN 0 AND 9)
  );
END

IF COL_LENGTH('dbo.TEAM_CAR_INSTALLED_PART', 'P') IS NULL
BEGIN
  ALTER TABLE dbo.TEAM_CAR_INSTALLED_PART ADD P INT NOT NULL CONSTRAINT DF_TeamCarInstalledParts_P DEFAULT (0);
END
IF COL_LENGTH('dbo.TEAM_CAR_INSTALLED_PART', 'A') IS NULL
BEGIN
  ALTER TABLE dbo.TEAM_CAR_INSTALLED_PART ADD A INT NOT NULL CONSTRAINT DF_TeamCarInstalledParts_A DEFAULT (0);
END
IF COL_LENGTH('dbo.TEAM_CAR_INSTALLED_PART', 'M') IS NULL
BEGIN
  ALTER TABLE dbo.TEAM_CAR_INSTALLED_PART ADD M INT NOT NULL CONSTRAINT DF_TeamCarInstalledParts_M DEFAULT (0);
END

IF OBJECT_ID('dbo.TEAM_CAR_INSTALLED_PART', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.TEAM_CAR_INSTALLED_PART') AND name = 'IX_TeamCarInstalledParts_TeamId')
     AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.TEAM_CAR_INSTALLED_PART') AND name = 'IX_TeamCarInstalledParts_TeamId')
  BEGIN
    CREATE INDEX IX_TeamCarInstalledParts_TeamId ON dbo.TEAM_CAR_INSTALLED_PART(TeamId);
  END

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.TEAM_CAR_INSTALLED_PART') AND name = 'IX_TeamCarInstalledParts_CarId')
     AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.TEAM_CAR_INSTALLED_PART') AND name = 'IX_TeamCarInstalledParts_CarId')
  BEGIN
    CREATE INDEX IX_TeamCarInstalledParts_CarId ON dbo.TEAM_CAR_INSTALLED_PART(CarId);
  END

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.TEAM_CAR_INSTALLED_PART') AND name = 'UX_TeamCarInstalledParts_CarId_CategoryKey')
     AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.TEAM_CAR_INSTALLED_PART') AND name = 'UX_TeamCarInstalledParts_CarId_CategoryKey')
  BEGIN
    CREATE UNIQUE INDEX UX_TeamCarInstalledParts_CarId_CategoryKey ON dbo.TEAM_CAR_INSTALLED_PART(CarId, CategoryKey);
  END
END

-- Ensure every team has a budget row
INSERT INTO dbo.TEAM_BUDGET (TeamId)
SELECT t.Id
FROM dbo.TEAM t
LEFT JOIN dbo.TEAM_BUDGET b ON b.TeamId = t.Id
WHERE b.TeamId IS NULL;

--------------------------------------------------------------------------------
-- Stored Procedures (created via dynamic SQL)
--------------------------------------------------------------------------------

DECLARE @sql NVARCHAR(MAX);

-- Team_GetById
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Team_GetById
  @Id UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  SELECT TOP (1)
    t.Id,
    t.Name,
    t.Country,
    t.CreatedAt,
    t.UpdatedAt,
    b.Total AS BudgetTotal,
    b.Spent AS BudgetSpent
  FROM dbo.TEAM t
  LEFT JOIN dbo.TEAM_BUDGET b ON b.TeamId = t.Id
  WHERE t.Id = @Id;

  SELECT Id, TeamId, Name, Contribution, Description, CreatedAt
  FROM dbo.TEAM_SPONSOR
  WHERE TeamId = @Id
  ORDER BY CreatedAt DESC;

  SELECT Id, TeamId, PartId, PartName, Category, P, A, M, Qty, UnitCost, CreatedAt, AcquiredAt
  FROM dbo.TEAM_INVENTORY_ITEM
  WHERE TeamId = @Id
  ORDER BY CreatedAt DESC;

  SELECT Id, TeamId, Code, Name, DriverId, IsFinalized
  FROM dbo.TEAM_CAR
  WHERE TeamId = @Id
  ORDER BY CreatedAt DESC;

  SELECT Id, TeamId, CarId, InventoryItemId, CategoryKey, PartName, Category, P, A, M, InstalledAt
  FROM dbo.TEAM_CAR_INSTALLED_PART
  WHERE TeamId = @Id
  ORDER BY InstalledAt DESC;

  SELECT Id, TeamId, Name, Skill
  FROM dbo.TEAM_DRIVER
  WHERE TeamId = @Id
  ORDER BY CreatedAt DESC;
END';
EXEC sys.sp_executesql @sql;

-- Team_List
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Team_List
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    t.Id,
    t.Name,
    t.Country,
    t.CreatedAt,
    t.UpdatedAt,
    b.Total AS BudgetTotal,
    b.Spent AS BudgetSpent
  FROM dbo.TEAM t
  LEFT JOIN dbo.TEAM_BUDGET b ON b.TeamId = t.Id
  ORDER BY t.UpdatedAt DESC;
END';
EXEC sys.sp_executesql @sql;

-- Team_Create
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Team_Create
  @Id UNIQUEIDENTIFIER,
  @Name NVARCHAR(120),
  @Country NVARCHAR(120) = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF @Name IS NULL OR LTRIM(RTRIM(@Name)) = ''''
  BEGIN
    RAISERROR(''Nombre requerido.'', 16, 1);
    RETURN;
  END

  IF EXISTS (SELECT 1 FROM dbo.TEAM WHERE Id = @Id)
  BEGIN
    RAISERROR(''Ya existe un equipo con ese ID.'', 16, 1);
    RETURN;
  END

  BEGIN TRAN;

  INSERT INTO dbo.TEAM (Id, Name, Country)
  VALUES (@Id, LTRIM(RTRIM(@Name)), NULLIF(LTRIM(RTRIM(@Country)), ''''));

  INSERT INTO dbo.TEAM_BUDGET (TeamId, Total, Spent)
  VALUES (@Id, 0, 0);

  COMMIT TRAN;

  EXEC dbo.Team_GetById @Id = @Id;
END';
EXEC sys.sp_executesql @sql;

-- Team_Update
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Team_Update
  @Id UNIQUEIDENTIFIER,
  @Name NVARCHAR(120) = NULL,
  @Country NVARCHAR(120) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (SELECT 1 FROM dbo.TEAM WHERE Id = @Id)
  BEGIN
    RAISERROR(''Equipo no encontrado.'', 16, 1);
    RETURN;
  END

  UPDATE dbo.TEAM
  SET
    Name = COALESCE(NULLIF(LTRIM(RTRIM(@Name)), ''''), Name),
    Country = CASE
      WHEN @Country IS NULL THEN Country
      ELSE NULLIF(LTRIM(RTRIM(@Country)), '''')
    END,
    UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @Id;

  EXEC dbo.Team_GetById @Id = @Id;
END';
EXEC sys.sp_executesql @sql;

-- Team_SetBudget
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Team_SetBudget
  @TeamId UNIQUEIDENTIFIER,
  @Total DECIMAL(18,2) = NULL,
  @Spent DECIMAL(18,2) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (SELECT 1 FROM dbo.TEAM WHERE Id = @TeamId)
  BEGIN
    RAISERROR(''Equipo no encontrado.'', 16, 1);
    RETURN;
  END

  DECLARE @NextTotal DECIMAL(18,2);
  DECLARE @NextSpent DECIMAL(18,2);

  SELECT
    @NextTotal = COALESCE(@Total, Total),
    @NextSpent = COALESCE(@Spent, Spent)
  FROM dbo.TEAM_BUDGET
  WHERE TeamId = @TeamId;

  IF @NextTotal < 0 OR @NextSpent < 0 OR @NextSpent > @NextTotal
  BEGIN
    RAISERROR(''Presupuesto inválido.'', 16, 1);
    RETURN;
  END

  UPDATE dbo.TEAM_BUDGET
  SET
    Total = @NextTotal,
    Spent = @NextSpent,
    UpdatedAt = SYSUTCDATETIME()
  WHERE TeamId = @TeamId;

  UPDATE dbo.TEAM
  SET UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @TeamId;

  EXEC dbo.Team_GetById @Id = @TeamId;
END';
EXEC sys.sp_executesql @sql;

-- Team_AddSponsor
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Team_AddSponsor
  @TeamId UNIQUEIDENTIFIER,
  @SponsorId UNIQUEIDENTIFIER,
  @Name NVARCHAR(120),
  @Contribution DECIMAL(18,2) = 0,
  @Description NVARCHAR(300) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (SELECT 1 FROM dbo.TEAM WHERE Id = @TeamId)
  BEGIN
    RAISERROR(''Equipo no encontrado.'', 16, 1);
    RETURN;
  END
  IF @Name IS NULL OR LTRIM(RTRIM(@Name)) = ''''
  BEGIN
    RAISERROR(''Nombre de patrocinador requerido.'', 16, 1);
    RETURN;
  END
  IF @Contribution < 0
  BEGIN
    RAISERROR(''Contribución inválida.'', 16, 1);
    RETURN;
  END

  INSERT INTO dbo.TEAM_SPONSOR (Id, TeamId, Name, Contribution, Description)
  VALUES (@SponsorId, @TeamId, LTRIM(RTRIM(@Name)), @Contribution, NULLIF(LTRIM(RTRIM(@Description)), ''''));

  -- Regla: presupuesto total calculado a partir de aportes registrados
  UPDATE dbo.TEAM_BUDGET
  SET
    Total = COALESCE((SELECT SUM(s.Contribution) FROM dbo.TEAM_SPONSOR s WHERE s.TeamId = @TeamId), 0),
    UpdatedAt = SYSUTCDATETIME()
  WHERE TeamId = @TeamId;

  UPDATE dbo.TEAM SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;
  EXEC dbo.Team_GetById @Id = @TeamId;
END';
EXEC sys.sp_executesql @sql;

-- Team_RemoveSponsor
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Team_RemoveSponsor
  @TeamId UNIQUEIDENTIFIER,
  @SponsorId UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  DELETE FROM dbo.TEAM_SPONSOR WHERE TeamId = @TeamId AND Id = @SponsorId;
  IF @@ROWCOUNT = 0
  BEGIN
    RAISERROR(''Patrocinador no encontrado.'', 16, 1);
    RETURN;
  END

  UPDATE dbo.TEAM SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;
  EXEC dbo.Team_GetById @Id = @TeamId;
END';
EXEC sys.sp_executesql @sql;

-- Team_AddCar
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Team_AddCar
  @TeamId UNIQUEIDENTIFIER,
  @CarId UNIQUEIDENTIFIER,
  @Code NVARCHAR(40),
  @Name NVARCHAR(120) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (SELECT 1 FROM dbo.TEAM WHERE Id = @TeamId)
  BEGIN
    RAISERROR(''Equipo no encontrado.'', 16, 1);
    RETURN;
  END
  IF @Code IS NULL OR LTRIM(RTRIM(@Code)) = ''''
  BEGIN
    RAISERROR(''Código del carro requerido.'', 16, 1);
    RETURN;
  END

  IF (SELECT COUNT(1) FROM dbo.TEAM_CAR WHERE TeamId = @TeamId) >= 2
  BEGIN
    RAISERROR(''Restricción: máximo 2 carros por equipo.'', 16, 1);
    RETURN;
  END

  INSERT INTO dbo.TEAM_CAR (Id, TeamId, Code, Name, DriverId, IsFinalized)
  VALUES (@CarId, @TeamId, LTRIM(RTRIM(@Code)), NULLIF(LTRIM(RTRIM(@Name)), ''''), NULL, 0);

  UPDATE dbo.TEAM SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;
  EXEC dbo.Team_GetById @Id = @TeamId;
END';
EXEC sys.sp_executesql @sql;

-- Team_RemoveCar
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Team_RemoveCar
  @TeamId UNIQUEIDENTIFIER,
  @CarId UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  -- Devolver al inventario cualquier parte instalada en el carro
  IF EXISTS (SELECT 1 FROM dbo.TEAM_CAR_INSTALLED_PART WHERE TeamId = @TeamId AND CarId = @CarId)
  BEGIN
    ;WITH x AS (
      SELECT InventoryItemId, COUNT(1) AS Cnt
      FROM dbo.TEAM_CAR_INSTALLED_PART
      WHERE TeamId = @TeamId AND CarId = @CarId
      GROUP BY InventoryItemId
    )
    UPDATE i
    SET i.Qty = i.Qty + x.Cnt
    FROM dbo.TEAM_INVENTORY_ITEM i
    INNER JOIN x ON x.InventoryItemId = i.Id;

    DELETE FROM dbo.TEAM_CAR_INSTALLED_PART WHERE TeamId = @TeamId AND CarId = @CarId;
  END

  DELETE FROM dbo.TEAM_CAR WHERE TeamId = @TeamId AND Id = @CarId;
  IF @@ROWCOUNT = 0
  BEGIN
    RAISERROR(''Carro no encontrado.'', 16, 1);
    RETURN;
  END

  UPDATE dbo.TEAM SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;
  EXEC dbo.Team_GetById @Id = @TeamId;
END';
EXEC sys.sp_executesql @sql;

-- Team_UpsertInventoryFromPurchase
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Team_UpsertInventoryFromPurchase
  @TeamId UNIQUEIDENTIFIER,
  @PartId UNIQUEIDENTIFIER,
  @PartName NVARCHAR(160),
  @Category NVARCHAR(120) = NULL,
  @P INT,
  @A INT,
  @M INT,
  @Qty INT,
  @UnitCost DECIMAL(18,2)
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF NOT EXISTS (SELECT 1 FROM dbo.TEAM WHERE Id = @TeamId)
  BEGIN
    RAISERROR(''Equipo no encontrado.'', 16, 1);
    RETURN;
  END
  IF @PartId IS NULL
  BEGIN
    RAISERROR(''PartId requerido.'', 16, 1);
    RETURN;
  END
  IF @PartName IS NULL OR LTRIM(RTRIM(@PartName)) = ''''
  BEGIN
    RAISERROR(''Nombre de parte requerido.'', 16, 1);
    RETURN;
  END
  IF NULLIF(LTRIM(RTRIM(@Category)), '''') IS NULL
  BEGIN
    RAISERROR(''Categoría requerida.'', 16, 1);
    RETURN;
  END
  IF @Category NOT IN (''Power Unit'', ''Paquete aerodinámico'', ''Neumáticos'', ''Suspensión'', ''Caja de cambios'')
  BEGIN
    RAISERROR(''Categoría inválida: debe ser una de las 5 categorías obligatorias.'', 16, 1);
    RETURN;
  END
  IF @P < 0 OR @P > 9 OR @A < 0 OR @A > 9 OR @M < 0 OR @M > 9
  BEGIN
    RAISERROR(''Rendimiento inválido: P/A/M deben ser enteros 0-9.'', 16, 1);
    RETURN;
  END
  IF @Qty <= 0 OR @UnitCost < 0
  BEGIN
    RAISERROR(''Valores de compra inválidos.'', 16, 1);
    RETURN;
  END

  BEGIN TRAN;

  DECLARE @TotalCost DECIMAL(18,2);
  SET @TotalCost = @UnitCost * @Qty;

  DECLARE @BudgetTotal DECIMAL(18,2);
  DECLARE @BudgetSpent DECIMAL(18,2);
  SELECT
    @BudgetTotal = Total,
    @BudgetSpent = Spent
  FROM dbo.TEAM_BUDGET WITH (UPDLOCK, HOLDLOCK)
  WHERE TeamId = @TeamId;

  IF @BudgetTotal IS NULL
  BEGIN
    -- Por seguridad: si falta la fila, crearla con 0.
    INSERT INTO dbo.TEAM_BUDGET (TeamId, Total, Spent) VALUES (@TeamId, 0, 0);
    SET @BudgetTotal = 0;
    SET @BudgetSpent = 0;
  END

  IF (@BudgetTotal - @BudgetSpent) < @TotalCost
  BEGIN
    RAISERROR(''Presupuesto insuficiente.'', 16, 1);
    ROLLBACK TRAN;
    RETURN;
  END

  UPDATE dbo.TEAM_BUDGET
  SET
    Spent = Spent + @TotalCost,
    UpdatedAt = SYSUTCDATETIME()
  WHERE TeamId = @TeamId;

  IF EXISTS (SELECT 1 FROM dbo.TEAM_INVENTORY_ITEM WHERE TeamId = @TeamId AND PartId = @PartId)
  BEGIN
    UPDATE dbo.TEAM_INVENTORY_ITEM
    SET
      Qty = Qty + @Qty,
      UnitCost = @UnitCost,
      Category = @Category,
      P = @P,
      A = @A,
      M = @M,
      AcquiredAt = SYSUTCDATETIME()
    WHERE TeamId = @TeamId AND PartId = @PartId;
  END
  ELSE
  BEGIN
    INSERT INTO dbo.TEAM_INVENTORY_ITEM (Id, TeamId, PartId, PartName, Category, P, A, M, Qty, UnitCost, AcquiredAt)
    VALUES (NEWID(), @TeamId, @PartId, LTRIM(RTRIM(@PartName)), @Category, @P, @A, @M, @Qty, @UnitCost, SYSUTCDATETIME());
  END

  UPDATE dbo.TEAM SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;

  COMMIT TRAN;

  EXEC dbo.Team_GetById @Id = @TeamId;
END';
EXEC sys.sp_executesql @sql;

-- Team_InstallPart
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Team_InstallPart
  @TeamId UNIQUEIDENTIFIER,
  @CarId UNIQUEIDENTIFIER,
  @InventoryItemId UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF NOT EXISTS (SELECT 1 FROM dbo.TEAM WHERE Id = @TeamId)
  BEGIN
    RAISERROR(''Equipo no encontrado.'', 16, 1);
    RETURN;
  END
  IF NOT EXISTS (SELECT 1 FROM dbo.TEAM_CAR WHERE TeamId = @TeamId AND Id = @CarId)
  BEGIN
    RAISERROR(''Carro no encontrado.'', 16, 1);
    RETURN;
  END
  IF NOT EXISTS (SELECT 1 FROM dbo.TEAM_INVENTORY_ITEM WHERE TeamId = @TeamId AND Id = @InventoryItemId)
  BEGIN
    RAISERROR(''Ítem de inventario no encontrado.'', 16, 1);
    RETURN;
  END
  IF NOT EXISTS (SELECT 1 FROM dbo.TEAM_INVENTORY_ITEM WHERE TeamId = @TeamId AND Id = @InventoryItemId AND Qty > 0)
  BEGIN
    RAISERROR(''Stock insuficiente.'', 16, 1);
    RETURN;
  END

  DECLARE @PartName NVARCHAR(160);
  DECLARE @Category NVARCHAR(120);
  DECLARE @CategoryKey NVARCHAR(160);
  DECLARE @P INT;
  DECLARE @A INT;
  DECLARE @M INT;

  SELECT
    @PartName = PartName,
    @Category = Category,
    @CategoryKey = LTRIM(RTRIM(Category)),
    @P = P,
    @A = A,
    @M = M
  FROM dbo.TEAM_INVENTORY_ITEM
  WHERE TeamId = @TeamId AND Id = @InventoryItemId;

  IF @CategoryKey NOT IN (''Power Unit'', ''Paquete aerodinámico'', ''Neumáticos'', ''Suspensión'', ''Caja de cambios'')
  BEGIN
    RAISERROR(''Categoría inválida: debe ser una de las 5 categorías obligatorias.'', 16, 1);
    RETURN;
  END

  BEGIN TRAN;

  -- Reemplazo por categoría
  DECLARE @OldInstalledId UNIQUEIDENTIFIER;
  DECLARE @OldInventoryItemId UNIQUEIDENTIFIER;
  SELECT TOP (1)
    @OldInstalledId = Id,
    @OldInventoryItemId = InventoryItemId
  FROM dbo.TEAM_CAR_INSTALLED_PART
  WHERE TeamId = @TeamId AND CarId = @CarId AND CategoryKey = @CategoryKey;

  IF @OldInstalledId IS NOT NULL
  BEGIN
    UPDATE dbo.TEAM_INVENTORY_ITEM
    SET Qty = Qty + 1
    WHERE TeamId = @TeamId AND Id = @OldInventoryItemId;

    DELETE FROM dbo.TEAM_CAR_INSTALLED_PART
    WHERE TeamId = @TeamId AND Id = @OldInstalledId;
  END

  UPDATE dbo.TEAM_INVENTORY_ITEM
  SET Qty = Qty - 1
  WHERE TeamId = @TeamId AND Id = @InventoryItemId AND Qty > 0;
  IF @@ROWCOUNT = 0
  BEGIN
    RAISERROR(''Stock insuficiente.'', 16, 1);
    ROLLBACK TRAN;
    RETURN;
  END

  INSERT INTO dbo.TEAM_CAR_INSTALLED_PART (Id, TeamId, CarId, InventoryItemId, CategoryKey, PartName, Category, P, A, M)
  VALUES (NEWID(), @TeamId, @CarId, @InventoryItemId, @CategoryKey, @PartName, @Category, @P, @A, @M);

  UPDATE dbo.TEAM_CAR SET IsFinalized = 0 WHERE TeamId = @TeamId AND Id = @CarId;

  UPDATE dbo.TEAM SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;

  COMMIT TRAN;

  EXEC dbo.Team_GetById @Id = @TeamId;
END';
EXEC sys.sp_executesql @sql;

-- Team_UninstallPart
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Team_UninstallPart
  @TeamId UNIQUEIDENTIFIER,
  @CarId UNIQUEIDENTIFIER,
  @InstalledPartId UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF NOT EXISTS (SELECT 1 FROM dbo.TEAM WHERE Id = @TeamId)
  BEGIN
    RAISERROR(''Equipo no encontrado.'', 16, 1);
    RETURN;
  END
  IF NOT EXISTS (SELECT 1 FROM dbo.TEAM_CAR WHERE TeamId = @TeamId AND Id = @CarId)
  BEGIN
    RAISERROR(''Carro no encontrado.'', 16, 1);
    RETURN;
  END

  DECLARE @InventoryItemId UNIQUEIDENTIFIER;
  SELECT @InventoryItemId = InventoryItemId
  FROM dbo.TEAM_CAR_INSTALLED_PART
  WHERE TeamId = @TeamId AND CarId = @CarId AND Id = @InstalledPartId;

  IF @InventoryItemId IS NULL
  BEGIN
    RAISERROR(''Parte instalada no encontrada.'', 16, 1);
    RETURN;
  END

  BEGIN TRAN;

  DELETE FROM dbo.TEAM_CAR_INSTALLED_PART
  WHERE TeamId = @TeamId AND CarId = @CarId AND Id = @InstalledPartId;

  UPDATE dbo.TEAM_INVENTORY_ITEM
  SET Qty = Qty + 1
  WHERE TeamId = @TeamId AND Id = @InventoryItemId;

  UPDATE dbo.TEAM_CAR SET IsFinalized = 0 WHERE TeamId = @TeamId AND Id = @CarId;

  UPDATE dbo.TEAM SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;

  COMMIT TRAN;

  EXEC dbo.Team_GetById @Id = @TeamId;
END';
EXEC sys.sp_executesql @sql;

-- Team_AssignCarDriver
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Team_AssignCarDriver
  @TeamId UNIQUEIDENTIFIER,
  @CarId UNIQUEIDENTIFIER,
  @DriverId UNIQUEIDENTIFIER = NULL
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF NOT EXISTS (SELECT 1 FROM dbo.TEAM WHERE Id = @TeamId)
  BEGIN
    RAISERROR(''Equipo no encontrado.'', 16, 1);
    RETURN;
  END
  IF NOT EXISTS (SELECT 1 FROM dbo.TEAM_CAR WHERE TeamId = @TeamId AND Id = @CarId)
  BEGIN
    RAISERROR(''Carro no encontrado.'', 16, 1);
    RETURN;
  END
  IF @DriverId IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.TEAM_DRIVER WHERE TeamId = @TeamId AND Id = @DriverId)
  BEGIN
    RAISERROR(''Conductor no encontrado.'', 16, 1);
    RETURN;
  END

  BEGIN TRAN;

  UPDATE dbo.TEAM_CAR
  SET DriverId = @DriverId
  WHERE TeamId = @TeamId AND Id = @CarId;

  UPDATE dbo.TEAM SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;

  COMMIT TRAN;

  EXEC dbo.Team_GetById @Id = @TeamId;
END';
EXEC sys.sp_executesql @sql;

-- Team_FinalizeCar
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Team_FinalizeCar
  @TeamId UNIQUEIDENTIFIER,
  @CarId UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF NOT EXISTS (SELECT 1 FROM dbo.TEAM WHERE Id = @TeamId)
  BEGIN
    RAISERROR(''Equipo no encontrado.'', 16, 1);
    RETURN;
  END
  IF NOT EXISTS (SELECT 1 FROM dbo.TEAM_CAR WHERE TeamId = @TeamId AND Id = @CarId)
  BEGIN
    RAISERROR(''Carro no encontrado.'', 16, 1);
    RETURN;
  END

  DECLARE @DriverId UNIQUEIDENTIFIER;
  SELECT @DriverId = DriverId
  FROM dbo.TEAM_CAR
  WHERE TeamId = @TeamId AND Id = @CarId;

  IF @DriverId IS NULL
  BEGIN
    RAISERROR(''Debe asignar un conductor antes de finalizar el carro.'', 16, 1);
    RETURN;
  END

  DECLARE @RequiredCount INT;
  SELECT @RequiredCount = COUNT(DISTINCT CategoryKey)
  FROM dbo.TEAM_CAR_INSTALLED_PART
  WHERE TeamId = @TeamId AND CarId = @CarId
    AND CategoryKey IN (''Power Unit'', ''Paquete aerodinámico'', ''Neumáticos'', ''Suspensión'', ''Caja de cambios'');

  IF @RequiredCount <> 5
  BEGIN
    RAISERROR(''No se puede finalizar: el carro debe tener las 5 categorías obligatorias instaladas.'', 16, 1);
    RETURN;
  END

  BEGIN TRAN;

  UPDATE dbo.TEAM_CAR
  SET IsFinalized = 1
  WHERE TeamId = @TeamId AND Id = @CarId;

  UPDATE dbo.TEAM SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;

  COMMIT TRAN;

  EXEC dbo.Team_GetById @Id = @TeamId;
END';
EXEC sys.sp_executesql @sql;

-- Team_UnfinalizeCar
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Team_UnfinalizeCar
  @TeamId UNIQUEIDENTIFIER,
  @CarId UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF NOT EXISTS (SELECT 1 FROM dbo.TEAM WHERE Id = @TeamId)
  BEGIN
    RAISERROR(''Equipo no encontrado.'', 16, 1);
    RETURN;
  END
  IF NOT EXISTS (SELECT 1 FROM dbo.TEAM_CAR WHERE TeamId = @TeamId AND Id = @CarId)
  BEGIN
    RAISERROR(''Carro no encontrado.'', 16, 1);
    RETURN;
  END

  BEGIN TRAN;

  UPDATE dbo.TEAM_CAR
  SET IsFinalized = 0
  WHERE TeamId = @TeamId AND Id = @CarId;

  UPDATE dbo.TEAM SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;

  COMMIT TRAN;

  EXEC dbo.Team_GetById @Id = @TeamId;
END';
EXEC sys.sp_executesql @sql;

-- Team_AddDriver
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Team_AddDriver
  @TeamId UNIQUEIDENTIFIER,
  @DriverId UNIQUEIDENTIFIER,
  @Name NVARCHAR(120),
  @Skill INT = 50
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (SELECT 1 FROM dbo.TEAM WHERE Id = @TeamId)
  BEGIN
    RAISERROR(''Equipo no encontrado.'', 16, 1);
    RETURN;
  END
  IF @Name IS NULL OR LTRIM(RTRIM(@Name)) = ''''
  BEGIN
    RAISERROR(''Nombre de conductor requerido.'', 16, 1);
    RETURN;
  END
  IF @Skill < 0 OR @Skill > 100
  BEGIN
    RAISERROR(''Habilidad inválida.'', 16, 1);
    RETURN;
  END

  INSERT INTO dbo.TEAM_DRIVER (Id, TeamId, Name, Skill)
  VALUES (@DriverId, @TeamId, LTRIM(RTRIM(@Name)), @Skill);

  UPDATE dbo.TEAM SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;
  EXEC dbo.Team_GetById @Id = @TeamId;
END';
EXEC sys.sp_executesql @sql;

-- Team_RemoveDriver
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Team_RemoveDriver
  @TeamId UNIQUEIDENTIFIER,
  @DriverId UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  DELETE FROM dbo.TEAM_DRIVER WHERE TeamId = @TeamId AND Id = @DriverId;
  IF @@ROWCOUNT = 0
  BEGIN
    RAISERROR(''Conductor no encontrado.'', 16, 1);
    RETURN;
  END

  UPDATE dbo.TEAM SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;
  EXEC dbo.Team_GetById @Id = @TeamId;
END';
EXEC sys.sp_executesql @sql;

-- Team_AddInventoryItem
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Team_AddInventoryItem
  @TeamId UNIQUEIDENTIFIER,
  @ItemId UNIQUEIDENTIFIER,
  @PartName NVARCHAR(160),
  @Category NVARCHAR(120) = NULL,
  @Qty INT = 0,
  @UnitCost DECIMAL(18,2) = 0
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (SELECT 1 FROM dbo.TEAM WHERE Id = @TeamId)
  BEGIN
    RAISERROR(''Equipo no encontrado.'', 16, 1);
    RETURN;
  END
  IF @PartName IS NULL OR LTRIM(RTRIM(@PartName)) = ''''
  BEGIN
    RAISERROR(''Nombre de parte requerido.'', 16, 1);
    RETURN;
  END
  IF @Qty < 0 OR @UnitCost < 0
  BEGIN
    RAISERROR(''Valores de inventario inválidos.'', 16, 1);
    RETURN;
  END

  INSERT INTO dbo.TEAM_INVENTORY_ITEM (Id, TeamId, PartName, Category, Qty, UnitCost, AcquiredAt)
  VALUES (
    @ItemId,
    @TeamId,
    LTRIM(RTRIM(@PartName)),
    NULLIF(LTRIM(RTRIM(@Category)), ''''),
    @Qty,
    @UnitCost,
    SYSUTCDATETIME()
  );

  UPDATE dbo.TEAM SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;
  EXEC dbo.Team_GetById @Id = @TeamId;
END';
EXEC sys.sp_executesql @sql;

-- Team_RemoveInventoryItem
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Team_RemoveInventoryItem
  @TeamId UNIQUEIDENTIFIER,
  @ItemId UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  IF EXISTS (SELECT 1 FROM dbo.TEAM_CAR_INSTALLED_PART WHERE TeamId = @TeamId AND InventoryItemId = @ItemId)
  BEGIN
    RAISERROR(''No podés eliminar una parte que está instalada en un carro.'', 16, 1);
    RETURN;
  END

  DELETE FROM dbo.TEAM_INVENTORY_ITEM WHERE TeamId = @TeamId AND Id = @ItemId;
  IF @@ROWCOUNT = 0
  BEGIN
    RAISERROR(''Ítem de inventario no encontrado.'', 16, 1);
    RETURN;
  END

  UPDATE dbo.TEAM SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;
  EXEC dbo.Team_GetById @Id = @TeamId;
END';
EXEC sys.sp_executesql @sql;

-- Team_Delete
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Team_Delete
  @TeamId UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  DELETE FROM dbo.TEAM WHERE Id = @TeamId;
  SELECT @@ROWCOUNT AS affected;
END';
EXEC sys.sp_executesql @sql;
