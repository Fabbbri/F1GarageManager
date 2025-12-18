/*
  F1 Garage Manager - Teams schema (SQL Server) - Relational (NO JSON)
  Ejecutar en SSMS sobre la base de datos destino.

  - Mantiene dbo.Teams como tabla principal (Id, Name, Country, CreatedAt, UpdatedAt)
  - Normaliza el detalle en tablas hijas:
      dbo.TeamBudgets (1:1)
      dbo.TeamSponsors (1:N)
      dbo.TeamCars (1:N, max 2)
      dbo.TeamDrivers (1:N)
      dbo.TeamInventoryItems (1:N)
  - Provee stored procedures para operaciones de negocio.
*/

SET NOCOUNT ON;
GO

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

  CREATE INDEX IX_Teams_UpdatedAt ON dbo.Teams(UpdatedAt DESC);
  CREATE INDEX IX_Teams_Name ON dbo.Teams(Name);
END
GO

-- If an older JSON-based column exists, remove it (keeps rows)
IF COL_LENGTH('dbo.Teams', 'Data') IS NOT NULL
BEGIN
  IF OBJECT_ID('dbo.CK_Teams_Data_IsJson', 'C') IS NOT NULL
    ALTER TABLE dbo.Teams DROP CONSTRAINT CK_Teams_Data_IsJson;

  ALTER TABLE dbo.Teams DROP COLUMN Data;
END
GO

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

  CREATE INDEX IX_TeamBudgets_UpdatedAt ON dbo.TeamBudgets(UpdatedAt DESC);
END
GO

-- Sponsors
IF OBJECT_ID('dbo.TeamSponsors', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.TeamSponsors (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_TeamSponsors PRIMARY KEY,
    TeamId UNIQUEIDENTIFIER NOT NULL,
    Name NVARCHAR(120) NOT NULL,
    Contribution DECIMAL(18,2) NOT NULL CONSTRAINT DF_TeamSponsors_Contribution DEFAULT (0),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_TeamSponsors_CreatedAt DEFAULT (SYSUTCDATETIME()),
    CONSTRAINT FK_TeamSponsors_Teams FOREIGN KEY (TeamId) REFERENCES dbo.Teams(Id) ON DELETE CASCADE,
    CONSTRAINT CK_TeamSponsors_Contribution CHECK (Contribution >= 0)
  );

  CREATE INDEX IX_TeamSponsors_TeamId ON dbo.TeamSponsors(TeamId);
END
GO

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

  CREATE UNIQUE INDEX UX_TeamCars_TeamId_Code ON dbo.TeamCars(TeamId, Code);
  CREATE INDEX IX_TeamCars_TeamId ON dbo.TeamCars(TeamId);
END
GO

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

  CREATE INDEX IX_TeamDrivers_TeamId ON dbo.TeamDrivers(TeamId);
END
GO

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

  CREATE INDEX IX_TeamInventoryItems_TeamId ON dbo.TeamInventoryItems(TeamId);
END
GO

-- Ensure every team has a budget row
INSERT INTO dbo.TeamBudgets (TeamId)
SELECT t.Id
FROM dbo.Teams t
LEFT JOIN dbo.TeamBudgets b ON b.TeamId = t.Id
WHERE b.TeamId IS NULL;
GO

--------------------------------------------------------------------------------
-- Stored Procedures
--------------------------------------------------------------------------------

IF OBJECT_ID('dbo.Team_GetById', 'P') IS NOT NULL DROP PROCEDURE dbo.Team_GetById;
GO
CREATE PROCEDURE dbo.Team_GetById
  @Id UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  -- 1) Team + budget
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

  -- 2) Sponsors
  SELECT Id, TeamId, Name, Contribution
  FROM dbo.TeamSponsors
  WHERE TeamId = @Id
  ORDER BY CreatedAt DESC;

  -- 3) Inventory
  SELECT Id, TeamId, PartName, Category, Qty, UnitCost
  FROM dbo.TeamInventoryItems
  WHERE TeamId = @Id
  ORDER BY CreatedAt DESC;

  -- 4) Cars
  SELECT Id, TeamId, Code, Name
  FROM dbo.TeamCars
  WHERE TeamId = @Id
  ORDER BY CreatedAt DESC;

  -- 5) Drivers
  SELECT Id, TeamId, Name, Skill
  FROM dbo.TeamDrivers
  WHERE TeamId = @Id
  ORDER BY CreatedAt DESC;
END
GO

IF OBJECT_ID('dbo.Team_List', 'P') IS NOT NULL DROP PROCEDURE dbo.Team_List;
GO
CREATE PROCEDURE dbo.Team_List
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
END
GO

IF OBJECT_ID('dbo.Team_Create', 'P') IS NOT NULL DROP PROCEDURE dbo.Team_Create;
GO
CREATE PROCEDURE dbo.Team_Create
  @Id UNIQUEIDENTIFIER,
  @Name NVARCHAR(120),
  @Country NVARCHAR(120) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  IF @Name IS NULL OR LTRIM(RTRIM(@Name)) = ''
  BEGIN
    THROW 51001, 'Nombre requerido.', 1;
  END

  IF EXISTS (SELECT 1 FROM dbo.Teams WHERE Id = @Id)
  BEGIN
    THROW 51003, 'Ya existe un equipo con ese ID.', 1;
  END

  BEGIN TRY
    BEGIN TRAN;

    INSERT INTO dbo.Teams (Id, Name, Country)
    VALUES (@Id, LTRIM(RTRIM(@Name)), NULLIF(LTRIM(RTRIM(@Country)), ''));

    INSERT INTO dbo.TeamBudgets (TeamId, Total, Spent)
    VALUES (@Id, 0, 0);

    COMMIT TRAN;
  END TRY
  BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRAN;
    THROW;
  END CATCH

  EXEC dbo.Team_GetById @Id = @Id;
END
GO

IF OBJECT_ID('dbo.Team_Update', 'P') IS NOT NULL DROP PROCEDURE dbo.Team_Update;
GO
CREATE PROCEDURE dbo.Team_Update
  @Id UNIQUEIDENTIFIER,
  @Name NVARCHAR(120) = NULL,
  @Country NVARCHAR(120) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (SELECT 1 FROM dbo.Teams WHERE Id = @Id)
  BEGIN
    THROW 51004, 'Equipo no encontrado.', 1;
  END

  UPDATE dbo.Teams
  SET
    Name = COALESCE(NULLIF(LTRIM(RTRIM(@Name)), ''), Name),
    Country = CASE
      WHEN @Country IS NULL THEN Country
      ELSE NULLIF(LTRIM(RTRIM(@Country)), '')
    END,
    UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @Id;

  EXEC dbo.Team_GetById @Id = @Id;
END
GO

IF OBJECT_ID('dbo.Team_SetBudget', 'P') IS NOT NULL DROP PROCEDURE dbo.Team_SetBudget;
GO
CREATE PROCEDURE dbo.Team_SetBudget
  @TeamId UNIQUEIDENTIFIER,
  @Total DECIMAL(18,2) = NULL,
  @Spent DECIMAL(18,2) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (SELECT 1 FROM dbo.Teams WHERE Id = @TeamId)
  BEGIN
    THROW 51004, 'Equipo no encontrado.', 1;
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
    THROW 51005, 'Presupuesto inválido.', 1;
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
END
GO

IF OBJECT_ID('dbo.Team_AddSponsor', 'P') IS NOT NULL DROP PROCEDURE dbo.Team_AddSponsor;
GO
CREATE PROCEDURE dbo.Team_AddSponsor
  @TeamId UNIQUEIDENTIFIER,
  @SponsorId UNIQUEIDENTIFIER,
  @Name NVARCHAR(120),
  @Contribution DECIMAL(18,2) = 0
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (SELECT 1 FROM dbo.Teams WHERE Id = @TeamId)
  BEGIN
    THROW 51004, 'Equipo no encontrado.', 1;
  END
  IF @Name IS NULL OR LTRIM(RTRIM(@Name)) = ''
  BEGIN
    THROW 51006, 'Nombre de patrocinador requerido.', 1;
  END
  IF @Contribution < 0
  BEGIN
    THROW 51007, 'Contribución inválida.', 1;
  END

  INSERT INTO dbo.TeamSponsors (Id, TeamId, Name, Contribution)
  VALUES (@SponsorId, @TeamId, LTRIM(RTRIM(@Name)), @Contribution);

  UPDATE dbo.Teams SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;

  EXEC dbo.Team_GetById @Id = @TeamId;
END
GO

IF OBJECT_ID('dbo.Team_RemoveSponsor', 'P') IS NOT NULL DROP PROCEDURE dbo.Team_RemoveSponsor;
GO
CREATE PROCEDURE dbo.Team_RemoveSponsor
  @TeamId UNIQUEIDENTIFIER,
  @SponsorId UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  DELETE FROM dbo.TeamSponsors WHERE TeamId = @TeamId AND Id = @SponsorId;
  IF @@ROWCOUNT = 0
  BEGIN
    THROW 51008, 'Patrocinador no encontrado.', 1;
  END

  UPDATE dbo.Teams SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;
  EXEC dbo.Team_GetById @Id = @TeamId;
END
GO

IF OBJECT_ID('dbo.Team_AddCar', 'P') IS NOT NULL DROP PROCEDURE dbo.Team_AddCar;
GO
CREATE PROCEDURE dbo.Team_AddCar
  @TeamId UNIQUEIDENTIFIER,
  @CarId UNIQUEIDENTIFIER,
  @Code NVARCHAR(40),
  @Name NVARCHAR(120) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (SELECT 1 FROM dbo.Teams WHERE Id = @TeamId)
  BEGIN
    THROW 51004, 'Equipo no encontrado.', 1;
  END
  IF @Code IS NULL OR LTRIM(RTRIM(@Code)) = ''
  BEGIN
    THROW 51009, 'Código del carro requerido.', 1;
  END

  IF (SELECT COUNT(1) FROM dbo.TeamCars WHERE TeamId = @TeamId) >= 2
  BEGIN
    THROW 51010, 'Restricción: máximo 2 carros por equipo.', 1;
  END

  INSERT INTO dbo.TeamCars (Id, TeamId, Code, Name)
  VALUES (@CarId, @TeamId, LTRIM(RTRIM(@Code)), NULLIF(LTRIM(RTRIM(@Name)), ''));

  UPDATE dbo.Teams SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;
  EXEC dbo.Team_GetById @Id = @TeamId;
END
GO

IF OBJECT_ID('dbo.Team_RemoveCar', 'P') IS NOT NULL DROP PROCEDURE dbo.Team_RemoveCar;
GO
CREATE PROCEDURE dbo.Team_RemoveCar
  @TeamId UNIQUEIDENTIFIER,
  @CarId UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  DELETE FROM dbo.TeamCars WHERE TeamId = @TeamId AND Id = @CarId;
  IF @@ROWCOUNT = 0
  BEGIN
    THROW 51011, 'Carro no encontrado.', 1;
  END

  UPDATE dbo.Teams SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;
  EXEC dbo.Team_GetById @Id = @TeamId;
END
GO

IF OBJECT_ID('dbo.Team_AddDriver', 'P') IS NOT NULL DROP PROCEDURE dbo.Team_AddDriver;
GO
CREATE PROCEDURE dbo.Team_AddDriver
  @TeamId UNIQUEIDENTIFIER,
  @DriverId UNIQUEIDENTIFIER,
  @Name NVARCHAR(120),
  @Skill INT = 50
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (SELECT 1 FROM dbo.Teams WHERE Id = @TeamId)
  BEGIN
    THROW 51004, 'Equipo no encontrado.', 1;
  END
  IF @Name IS NULL OR LTRIM(RTRIM(@Name)) = ''
  BEGIN
    THROW 51012, 'Nombre de conductor requerido.', 1;
  END
  IF @Skill < 0 OR @Skill > 100
  BEGIN
    THROW 51013, 'Habilidad inválida.', 1;
  END

  INSERT INTO dbo.TeamDrivers (Id, TeamId, Name, Skill)
  VALUES (@DriverId, @TeamId, LTRIM(RTRIM(@Name)), @Skill);

  UPDATE dbo.Teams SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;
  EXEC dbo.Team_GetById @Id = @TeamId;
END
GO

IF OBJECT_ID('dbo.Team_RemoveDriver', 'P') IS NOT NULL DROP PROCEDURE dbo.Team_RemoveDriver;
GO
CREATE PROCEDURE dbo.Team_RemoveDriver
  @TeamId UNIQUEIDENTIFIER,
  @DriverId UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  DELETE FROM dbo.TeamDrivers WHERE TeamId = @TeamId AND Id = @DriverId;
  IF @@ROWCOUNT = 0
  BEGIN
    THROW 51014, 'Conductor no encontrado.', 1;
  END

  UPDATE dbo.Teams SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;
  EXEC dbo.Team_GetById @Id = @TeamId;
END
GO

IF OBJECT_ID('dbo.Team_AddInventoryItem', 'P') IS NOT NULL DROP PROCEDURE dbo.Team_AddInventoryItem;
GO
CREATE PROCEDURE dbo.Team_AddInventoryItem
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
    THROW 51004, 'Equipo no encontrado.', 1;
  END
  IF @PartName IS NULL OR LTRIM(RTRIM(@PartName)) = ''
  BEGIN
    THROW 51015, 'Nombre de parte requerido.', 1;
  END
  IF @Qty < 0 OR @UnitCost < 0
  BEGIN
    THROW 51016, 'Valores de inventario inválidos.', 1;
  END

  INSERT INTO dbo.TeamInventoryItems (Id, TeamId, PartName, Category, Qty, UnitCost)
  VALUES (
    @ItemId,
    @TeamId,
    LTRIM(RTRIM(@PartName)),
    NULLIF(LTRIM(RTRIM(@Category)), ''),
    @Qty,
    @UnitCost
  );

  UPDATE dbo.Teams SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;
  EXEC dbo.Team_GetById @Id = @TeamId;
END
GO

IF OBJECT_ID('dbo.Team_RemoveInventoryItem', 'P') IS NOT NULL DROP PROCEDURE dbo.Team_RemoveInventoryItem;
GO
CREATE PROCEDURE dbo.Team_RemoveInventoryItem
  @TeamId UNIQUEIDENTIFIER,
  @ItemId UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  DELETE FROM dbo.TeamInventoryItems WHERE TeamId = @TeamId AND Id = @ItemId;
  IF @@ROWCOUNT = 0
  BEGIN
    THROW 51017, 'Ítem de inventario no encontrado.', 1;
  END

  UPDATE dbo.Teams SET UpdatedAt = SYSUTCDATETIME() WHERE Id = @TeamId;
  EXEC dbo.Team_GetById @Id = @TeamId;
END
GO

IF OBJECT_ID('dbo.Team_Delete', 'P') IS NOT NULL DROP PROCEDURE dbo.Team_Delete;
GO
CREATE PROCEDURE dbo.Team_Delete
  @TeamId UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  DELETE FROM dbo.Teams WHERE Id = @TeamId;
  SELECT @@ROWCOUNT AS affected;
END
GO
