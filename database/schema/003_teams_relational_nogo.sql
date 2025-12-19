/*
  F1 Garage Manager - Teams schema (SQL Server) - Relational (NO JSON) - NO GO / NO THROW

  Este script evita:
  - GO (batch separator), por si tu herramienta lo envía al servidor.
  - THROW (por compatibilidad). Usa RAISERROR.

  Ejecutar sobre la base de datos destino (ej: F1GarageManager).
*/

SET NOCOUNT ON;

-- Ensure Teams table exists
IF OBJECT_ID('dbo.Teams', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Teams (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Teams PRIMARY KEY,
    Name NVARCHAR(120) NOT NULL,
    Country NVARCHAR(120) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Teams_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Teams_UpdatedAt DEFAULT (SYSUTCDATETIME())
  );
END

-- Indexes (idempotent)
IF OBJECT_ID('dbo.Teams', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.Teams') AND name = 'IX_Teams_UpdatedAt')
     AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.Teams') AND name = 'IX_Teams_UpdatedAt')
  BEGIN
    CREATE INDEX IX_Teams_UpdatedAt ON dbo.Teams(UpdatedAt DESC);
  END

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.Teams') AND name = 'IX_Teams_Name')
     AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.Teams') AND name = 'IX_Teams_Name')
  BEGIN
    CREATE INDEX IX_Teams_Name ON dbo.Teams(Name);
  END
END

-- If an older JSON-based column exists, remove it (keeps rows)
IF COL_LENGTH('dbo.Teams', 'Data') IS NOT NULL
BEGIN
  IF OBJECT_ID('dbo.CK_Teams_Data_IsJson', 'C') IS NOT NULL
    ALTER TABLE dbo.Teams DROP CONSTRAINT CK_Teams_Data_IsJson;

  ALTER TABLE dbo.Teams DROP COLUMN Data;
END

-- 1:1 Budget
IF OBJECT_ID('dbo.TeamBudgets', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.TeamBudgets (
    TeamId UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TeamBudgets PRIMARY KEY,
    Total DECIMAL(18,2) NOT NULL CONSTRAINT DF_TeamBudgets_Total DEFAULT (0),
    Spent DECIMAL(18,2) NOT NULL CONSTRAINT DF_TeamBudgets_Spent DEFAULT (0),
    UpdatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_TeamBudgets_UpdatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_TeamBudgets_Teams FOREIGN KEY (TeamId) REFERENCES dbo.Teams(Id) ON DELETE CASCADE,
    CONSTRAINT CK_TeamBudgets_NonNegative CHECK (Total >= 0 AND Spent >= 0 AND Spent <= Total)
  );
END

IF OBJECT_ID('dbo.TeamBudgets', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.TeamBudgets') AND name = 'IX_TeamBudgets_UpdatedAt')
     AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.TeamBudgets') AND name = 'IX_TeamBudgets_UpdatedAt')
  BEGIN
    CREATE INDEX IX_TeamBudgets_UpdatedAt ON dbo.TeamBudgets(UpdatedAt DESC);
  END
END

-- Sponsors
IF OBJECT_ID('dbo.TeamSponsors', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.TeamSponsors (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TeamSponsors PRIMARY KEY,
    TeamId UNIQUEIDENTIFIER NOT NULL,
    Name NVARCHAR(120) NOT NULL,
    Contribution DECIMAL(18,2) NOT NULL CONSTRAINT DF_TeamSponsors_Contribution DEFAULT (0),
    Description NVARCHAR(300) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_TeamSponsors_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_TeamSponsors_Teams FOREIGN KEY (TeamId) REFERENCES dbo.Teams(Id) ON DELETE CASCADE,
    CONSTRAINT CK_TeamSponsors_Contribution CHECK (Contribution >= 0)
  );
END

IF OBJECT_ID('dbo.TeamSponsors', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.TeamSponsors') AND name = 'IX_TeamSponsors_TeamId')
     AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.TeamSponsors') AND name = 'IX_TeamSponsors_TeamId')
  BEGIN
    CREATE INDEX IX_TeamSponsors_TeamId ON dbo.TeamSponsors(TeamId);
  END
END

-- Add Description if upgrading an existing database
IF COL_LENGTH('dbo.TeamSponsors', 'Description') IS NULL
BEGIN
  ALTER TABLE dbo.TeamSponsors ADD Description NVARCHAR(300) NULL;
END

-- Cars (max 2 per team enforced in SP)
IF OBJECT_ID('dbo.TeamCars', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.TeamCars (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TeamCars PRIMARY KEY,
    TeamId UNIQUEIDENTIFIER NOT NULL,
    Code NVARCHAR(40) NOT NULL,
    Name NVARCHAR(120) NULL,
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_TeamCars_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_TeamCars_Teams FOREIGN KEY (TeamId) REFERENCES dbo.Teams(Id) ON DELETE CASCADE
  );
END

IF OBJECT_ID('dbo.TeamCars', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.TeamCars') AND name = 'UX_TeamCars_TeamId_Code')
     AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.TeamCars') AND name = 'UX_TeamCars_TeamId_Code')
  BEGIN
    CREATE UNIQUE INDEX UX_TeamCars_TeamId_Code ON dbo.TeamCars(TeamId, Code);
  END

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.TeamCars') AND name = 'IX_TeamCars_TeamId')
     AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.TeamCars') AND name = 'IX_TeamCars_TeamId')
  BEGIN
    CREATE INDEX IX_TeamCars_TeamId ON dbo.TeamCars(TeamId);
  END
END

-- Drivers
IF OBJECT_ID('dbo.TeamDrivers', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.TeamDrivers (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TeamDrivers PRIMARY KEY,
    TeamId UNIQUEIDENTIFIER NOT NULL,
    Name NVARCHAR(120) NOT NULL,
    Skill INT NOT NULL CONSTRAINT DF_TeamDrivers_Skill DEFAULT (50),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_TeamDrivers_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_TeamDrivers_Teams FOREIGN KEY (TeamId) REFERENCES dbo.Teams(Id) ON DELETE CASCADE,
    CONSTRAINT CK_TeamDrivers_Skill CHECK (Skill >= 0 AND Skill <= 100)
  );
END

IF OBJECT_ID('dbo.TeamDrivers', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.TeamDrivers') AND name = 'IX_TeamDrivers_TeamId')
     AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.TeamDrivers') AND name = 'IX_TeamDrivers_TeamId')
  BEGIN
    CREATE INDEX IX_TeamDrivers_TeamId ON dbo.TeamDrivers(TeamId);
  END
END

-- Inventory
IF OBJECT_ID('dbo.TeamInventoryItems', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.TeamInventoryItems (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TeamInventoryItems PRIMARY KEY,
    TeamId UNIQUEIDENTIFIER NOT NULL,
    PartName NVARCHAR(160) NOT NULL,
    Category NVARCHAR(120) NULL,
    Qty INT NOT NULL CONSTRAINT DF_TeamInventoryItems_Qty DEFAULT (0),
    UnitCost DECIMAL(18,2) NOT NULL CONSTRAINT DF_TeamInventoryItems_UnitCost DEFAULT (0),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_TeamInventoryItems_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_TeamInventoryItems_Teams FOREIGN KEY (TeamId) REFERENCES dbo.Teams(Id) ON DELETE CASCADE,
    CONSTRAINT CK_TeamInventoryItems_NonNegative CHECK (Qty >= 0 AND UnitCost >= 0)
  );
END

IF OBJECT_ID('dbo.TeamInventoryItems', 'U') IS NOT NULL
BEGIN
  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.TeamInventoryItems') AND name = 'IX_TeamInventoryItems_TeamId')
     AND NOT EXISTS (SELECT 1 FROM sys.stats WHERE object_id = OBJECT_ID('dbo.TeamInventoryItems') AND name = 'IX_TeamInventoryItems_TeamId')
  BEGIN
    CREATE INDEX IX_TeamInventoryItems_TeamId ON dbo.TeamInventoryItems(TeamId);
  END
END

-- Ensure every team has a budget row
INSERT INTO dbo.TeamBudgets (TeamId)
SELECT t.Id
FROM dbo.Teams t
LEFT JOIN dbo.TeamBudgets b ON b.TeamId = t.Id
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
  FROM dbo.Teams t
  LEFT JOIN dbo.TeamBudgets b ON b.TeamId = t.Id
  WHERE t.Id = @Id;

  SELECT Id, TeamId, Name, Contribution, Description, CreatedAt
  FROM dbo.TeamSponsors
  WHERE TeamId = @Id
  ORDER BY CreatedAt DESC;

  SELECT Id, TeamId, PartName, Category, Qty, UnitCost
  FROM dbo.TeamInventoryItems
  WHERE TeamId = @Id
  ORDER BY CreatedAt DESC;

  SELECT Id, TeamId, Code, Name
  FROM dbo.TeamCars
  WHERE TeamId = @Id
  ORDER BY CreatedAt DESC;

  SELECT Id, TeamId, Name, Skill
  FROM dbo.TeamDrivers
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
  FROM dbo.Teams t
  LEFT JOIN dbo.TeamBudgets b ON b.TeamId = t.Id
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

  IF EXISTS (SELECT 1 FROM dbo.Teams WHERE Id = @Id)
  BEGIN
    RAISERROR(''Ya existe un equipo con ese ID.'', 16, 1);
    RETURN;
  END

  BEGIN TRAN;

  INSERT INTO dbo.Teams (Id, Name, Country)
  VALUES (@Id, LTRIM(RTRIM(@Name)), NULLIF(LTRIM(RTRIM(@Country)), ''''));

  INSERT INTO dbo.TeamBudgets (TeamId, Total, Spent)
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

  IF NOT EXISTS (SELECT 1 FROM dbo.Teams WHERE Id = @Id)
  BEGIN
    RAISERROR(''Equipo no encontrado.'', 16, 1);
    RETURN;
  END

  UPDATE dbo.Teams
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

  IF NOT EXISTS (SELECT 1 FROM dbo.Teams WHERE Id = @TeamId)
  BEGIN
    RAISERROR(''Equipo no encontrado.'', 16, 1);
    RETURN;
  END

  DECLARE @NextTotal DECIMAL(18,2);
  DECLARE @NextSpent DECIMAL(18,2);

  SELECT
    @NextTotal = COALESCE(@Total, Total),
    @NextSpent = COALESCE(@Spent, Spent)
  FROM dbo.TeamBudgets
  WHERE TeamId = @TeamId;

  IF @NextTotal < 0 OR @NextSpent < 0 OR @NextSpent > @NextTotal
  BEGIN
    RAISERROR(''Presupuesto inválido.'', 16, 1);
    RETURN;
  END

  UPDATE dbo.TeamBudgets
  SET
    Total = @NextTotal,
    Spent = @NextSpent,
    UpdatedAt = SYSUTCDATETIME()
  WHERE TeamId = @TeamId;

  UPDATE dbo.Teams
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

  IF NOT EXISTS (SELECT 1 FROM dbo.Teams WHERE Id = @TeamId)
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

  INSERT INTO dbo.TeamSponsors (Id, TeamId, Name, Contribution, Description)
  VALUES (@SponsorId, @TeamId, LTRIM(RTRIM(@Name)), @Contribution, NULLIF(LTRIM(RTRIM(@Description)), ''''));

  -- Regla: presupuesto total calculado a partir de aportes registrados
  UPDATE dbo.TeamBudgets
  SET
    Total = COALESCE((SELECT SUM(s.Contribution) FROM dbo.TeamSponsors s WHERE s.TeamId = @TeamId), 0),
    UpdatedAt = SYSUTCDATETIME()
  WHERE TeamId = @TeamId;

  UPDATE dbo.Teams SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;
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

  DELETE FROM dbo.TeamSponsors WHERE TeamId = @TeamId AND Id = @SponsorId;
  IF @@ROWCOUNT = 0
  BEGIN
    RAISERROR(''Patrocinador no encontrado.'', 16, 1);
    RETURN;
  END

  UPDATE dbo.Teams SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;
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

  IF NOT EXISTS (SELECT 1 FROM dbo.Teams WHERE Id = @TeamId)
  BEGIN
    RAISERROR(''Equipo no encontrado.'', 16, 1);
    RETURN;
  END
  IF @Code IS NULL OR LTRIM(RTRIM(@Code)) = ''''
  BEGIN
    RAISERROR(''Código del carro requerido.'', 16, 1);
    RETURN;
  END

  IF (SELECT COUNT(1) FROM dbo.TeamCars WHERE TeamId = @TeamId) >= 2
  BEGIN
    RAISERROR(''Restricción: máximo 2 carros por equipo.'', 16, 1);
    RETURN;
  END

  INSERT INTO dbo.TeamCars (Id, TeamId, Code, Name)
  VALUES (@CarId, @TeamId, LTRIM(RTRIM(@Code)), NULLIF(LTRIM(RTRIM(@Name)), ''''));

  UPDATE dbo.Teams SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;
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

  DELETE FROM dbo.TeamCars WHERE TeamId = @TeamId AND Id = @CarId;
  IF @@ROWCOUNT = 0
  BEGIN
    RAISERROR(''Carro no encontrado.'', 16, 1);
    RETURN;
  END

  UPDATE dbo.Teams SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;
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

  IF NOT EXISTS (SELECT 1 FROM dbo.Teams WHERE Id = @TeamId)
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

  INSERT INTO dbo.TeamDrivers (Id, TeamId, Name, Skill)
  VALUES (@DriverId, @TeamId, LTRIM(RTRIM(@Name)), @Skill);

  UPDATE dbo.Teams SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;
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

  DELETE FROM dbo.TeamDrivers WHERE TeamId = @TeamId AND Id = @DriverId;
  IF @@ROWCOUNT = 0
  BEGIN
    RAISERROR(''Conductor no encontrado.'', 16, 1);
    RETURN;
  END

  UPDATE dbo.Teams SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;
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

  IF NOT EXISTS (SELECT 1 FROM dbo.Teams WHERE Id = @TeamId)
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

  INSERT INTO dbo.TeamInventoryItems (Id, TeamId, PartName, Category, Qty, UnitCost)
  VALUES (
    @ItemId,
    @TeamId,
    LTRIM(RTRIM(@PartName)),
    NULLIF(LTRIM(RTRIM(@Category)), ''''),
    @Qty,
    @UnitCost
  );

  UPDATE dbo.Teams SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;
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

  DELETE FROM dbo.TeamInventoryItems WHERE TeamId = @TeamId AND Id = @ItemId;
  IF @@ROWCOUNT = 0
  BEGIN
    RAISERROR(''Ítem de inventario no encontrado.'', 16, 1);
    RETURN;
  END

  UPDATE dbo.Teams SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;
  EXEC dbo.Team_GetById @Id = @TeamId;
END';
EXEC sys.sp_executesql @sql;

-- Team_Delete
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Team_Delete
  @TeamId UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  DELETE FROM dbo.Teams WHERE Id = @TeamId;
  SELECT @@ROWCOUNT AS affected;
END';
EXEC sys.sp_executesql @sql;
