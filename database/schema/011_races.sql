/* ============================================================
   1) TABLAS
   ============================================================ */

-- TRACKS
IF OBJECT_ID('dbo.TRACKS', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.TRACKS (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Tracks PRIMARY KEY,
    Name NVARCHAR(120) NOT NULL,
    DistanceKm DECIMAL(10,2) NOT NULL,
    Curves INT NOT NULL,
    IsActive BIT NOT NULL CONSTRAINT DF_Tracks_IsActive DEFAULT (1),
    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Tracks_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt DATETIME2(0) NULL,

    CONSTRAINT UQ_Tracks_Name UNIQUE (Name),
    CONSTRAINT CK_Tracks_Distance CHECK (DistanceKm > 0),
    CONSTRAINT CK_Tracks_Curves CHECK (Curves >= 0)
  );
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.TRACKS') AND name = 'IX_Tracks_IsActive')
BEGIN
  CREATE INDEX IX_Tracks_IsActive ON dbo.TRACKS(IsActive);
END


-- SIMULATIONS
IF OBJECT_ID('dbo.SIMULATIONS', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.SIMULATIONS (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Simulations PRIMARY KEY,
    TrackId UNIQUEIDENTIFIER NOT NULL,
    StartedAt DATETIME2(0) NOT NULL CONSTRAINT DF_Simulations_StartedAt DEFAULT (SYSUTCDATETIME()),
    Status NVARCHAR(20) NOT NULL CONSTRAINT DF_Simulations_Status DEFAULT ('COMPLETED'),
    CreatedByUserId UNIQUEIDENTIFIER NULL,
    Notes NVARCHAR(300) NULL,

    CONSTRAINT FK_Simulations_Track FOREIGN KEY (TrackId) REFERENCES dbo.TRACKS(Id),
    CONSTRAINT FK_Simulations_User FOREIGN KEY (CreatedByUserId) REFERENCES dbo.[USER](Id)
  );
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.SIMULATIONS') AND name = 'IX_Simulations_TrackId_StartedAt')
BEGIN
  CREATE INDEX IX_Simulations_TrackId_StartedAt ON dbo.SIMULATIONS(TrackId, StartedAt DESC);
END


-- SIMULATION_RESULTS (participantes + métricas por carro)
IF OBJECT_ID('dbo.SIMULATION_RESULTS', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.SIMULATION_RESULTS (
    Id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_SimulationResults PRIMARY KEY,

    SimulationId UNIQUEIDENTIFIER NOT NULL,
    TeamId UNIQUEIDENTIFIER NOT NULL,
    DriverUserId UNIQUEIDENTIFIER NOT NULL,

    -- Carro usado (si existe en tu modelo). Puede ser NULL si aún no lo amarrás.
    CarId UNIQUEIDENTIFIER NULL,

    -- Ordenamiento/ranking
    Points INT NOT NULL CONSTRAINT DF_SimRes_Points DEFAULT (0),
    TimeSeconds INT NOT NULL,
    Position INT NULL, -- opcional; podés calcularla y guardarla

    -- Totales para Grafana
    TotalP INT NULL,
    TotalA INT NULL,
    TotalM INT NULL,
    TotalH INT NULL,

    -- Valores calculados para Grafana
    VRecta DECIMAL(10,2) NULL,
    VCurva DECIMAL(10,2) NULL,
    PenaltySeconds INT NULL,

    -- Snapshot del setup/carro (JSON)
    SetupJson NVARCHAR(MAX) NULL,

    CreatedAt DATETIME2(0) NOT NULL CONSTRAINT DF_SimRes_CreatedAt DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT FK_SimRes_Simulation FOREIGN KEY (SimulationId) REFERENCES dbo.SIMULATIONS(Id) ON DELETE CASCADE,
    CONSTRAINT FK_SimRes_Team FOREIGN KEY (TeamId) REFERENCES dbo.TEAM(Id) ON DELETE CASCADE,
    CONSTRAINT FK_SimRes_DriverUser FOREIGN KEY (DriverUserId) REFERENCES dbo.[USER](Id) ON DELETE CASCADE
    -- Si querés amarrar al carro real:
    -- ,CONSTRAINT FK_SimRes_Car FOREIGN KEY (CarId) REFERENCES dbo.TEAM_CAR(Id) ON DELETE SET NULL
  );
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.SIMULATION_RESULTS') AND name = 'IX_SimRes_SimulationId')
BEGIN
  CREATE INDEX IX_SimRes_SimulationId ON dbo.SIMULATION_RESULTS(SimulationId);
END

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.SIMULATION_RESULTS') AND name = 'IX_SimRes_DriverUserId')
BEGIN
  CREATE INDEX IX_SimRes_DriverUserId ON dbo.SIMULATION_RESULTS(DriverUserId);
END

-- Un conductor solo una vez por simulación
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID('dbo.SIMULATION_RESULTS') AND name = 'UX_SimRes_Simulation_Driver')
BEGIN
  CREATE UNIQUE INDEX UX_SimRes_Simulation_Driver ON dbo.SIMULATION_RESULTS(SimulationId, DriverUserId);
END



/* ============================================================
   2) STORED PROCEDURES - TRACKS
   ============================================================ */

-- Track_List (all or only active)
DECLARE @sql NVARCHAR(MAX);

SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Track_List
  @OnlyActive BIT = 1
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    t.Id, t.Name, t.DistanceKm, t.Curves, t.IsActive, t.CreatedAt, t.UpdatedAt
  FROM dbo.TRACKS t
  WHERE (@OnlyActive = 0 OR t.IsActive = 1)
  ORDER BY t.IsActive DESC, t.Name ASC;
END';
EXEC sys.sp_executesql @sql;


-- Track_Create
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Track_Create
  @Name NVARCHAR(120),
  @DistanceKm DECIMAL(10,2),
  @Curves INT,
  @CurveDistanceKm DECIMAL(10,3) = 0.300
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @Id UNIQUEIDENTIFIER = NEWID();

  IF @Name IS NULL OR LTRIM(RTRIM(@Name)) = ''''
  BEGIN RAISERROR(''Nombre requerido.'', 16, 1); RETURN; END

  IF @DistanceKm IS NULL OR @DistanceKm <= 0
  BEGIN RAISERROR(''Distancia inválida.'', 16, 1); RETURN; END

  IF @Curves IS NULL OR @Curves < 0
  BEGIN RAISERROR(''Curvas inválidas.'', 16, 1); RETURN; END

  IF @DistanceKm < (@Curves * @CurveDistanceKm)
  BEGIN RAISERROR(''Distancia insuficiente para la cantidad de curvas.'', 16, 1); RETURN; END

  IF EXISTS (SELECT 1 FROM dbo.TRACKS WHERE Name = LTRIM(RTRIM(@Name)))
  BEGIN RAISERROR(''Ya existe una pista con ese nombre.'', 16, 1); RETURN; END

  INSERT INTO dbo.TRACKS (Id, Name, DistanceKm, Curves, IsActive)
  VALUES (@Id, LTRIM(RTRIM(@Name)), @DistanceKm, @Curves, 1);

  SELECT Id, Name, DistanceKm, Curves, IsActive, CreatedAt, UpdatedAt
  FROM dbo.TRACKS
  WHERE Id = @Id;
END';
EXEC sys.sp_executesql @sql;



-- Track_SoftDelete (IsActive = 0)
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Track_SoftDelete
  @Id UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  UPDATE dbo.TRACKS
  SET IsActive = 0,
      UpdatedAt = SYSUTCDATETIME()
  WHERE Id = @Id;

  IF @@ROWCOUNT = 0
  BEGIN RAISERROR(''Pista no encontrada.'', 16, 1); RETURN; END

  SELECT Id, Name, DistanceKm, Curves, IsActive, CreatedAt, UpdatedAt
  FROM dbo.TRACKS
  WHERE Id = @Id;
END';
EXEC sys.sp_executesql @sql;



/* ============================================================
   3) STORED PROCEDURES - SIMULATIONS + RESULTS
   ============================================================ */

-- Simulation_Create (crea cabecera)
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Simulation_Create
  @Id UNIQUEIDENTIFIER,
  @TrackId UNIQUEIDENTIFIER,
  @CreatedByUserId UNIQUEIDENTIFIER = NULL,
  @StartedAt DATETIME2(0) = NULL,
  @Notes NVARCHAR(300) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (SELECT 1 FROM dbo.TRACKS WHERE Id = @TrackId AND IsActive = 1)
  BEGIN RAISERROR(''Pista inválida o inactiva.'', 16, 1); RETURN; END

  INSERT INTO dbo.SIMULATIONS (Id, TrackId, StartedAt, Status, CreatedByUserId, Notes)
  VALUES (
    @Id,
    @TrackId,
    COALESCE(@StartedAt, SYSUTCDATETIME()),
    ''COMPLETED'',
    @CreatedByUserId,
    NULLIF(LTRIM(RTRIM(@Notes)), '''')
  );

  SELECT Id, TrackId, StartedAt, Status, CreatedByUserId, Notes
  FROM dbo.SIMULATIONS
  WHERE Id = @Id;
END';
EXEC sys.sp_executesql @sql;


-- Simulation_AddResult (insert por participante)
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Simulation_AddResult
  @Id UNIQUEIDENTIFIER,
  @SimulationId UNIQUEIDENTIFIER,
  @TeamId UNIQUEIDENTIFIER,
  @DriverUserId UNIQUEIDENTIFIER,
  @CarId UNIQUEIDENTIFIER = NULL,
  @Points INT = 0,
  @TimeSeconds INT,
  @Position INT = NULL,
  @TotalP INT = NULL,
  @TotalA INT = NULL,
  @TotalM INT = NULL,
  @TotalH INT = NULL,
  @VRecta DECIMAL(10,2) = NULL,
  @VCurva DECIMAL(10,2) = NULL,
  @PenaltySeconds INT = NULL,
  @SetupJson NVARCHAR(MAX) = NULL
AS
BEGIN
  SET NOCOUNT ON;

  IF NOT EXISTS (SELECT 1 FROM dbo.SIMULATIONS WHERE Id = @SimulationId)
  BEGIN RAISERROR(''Simulación no encontrada.'', 16, 1); RETURN; END

  IF NOT EXISTS (SELECT 1 FROM dbo.TEAM WHERE Id = @TeamId)
  BEGIN RAISERROR(''Equipo inválido.'', 16, 1); RETURN; END

  IF NOT EXISTS (SELECT 1 FROM dbo.[USER] WHERE Id = @DriverUserId AND Role = ''DRIVER'')
  BEGIN RAISERROR(''Conductor inválido.'' , 16, 1); RETURN; END

  IF @TimeSeconds IS NULL OR @TimeSeconds < 0
  BEGIN RAISERROR(''Tiempo inválido.'' , 16, 1); RETURN; END

  IF @Points IS NULL OR @Points < 0
  BEGIN RAISERROR(''Puntos inválidos.'' , 16, 1); RETURN; END

  INSERT INTO dbo.SIMULATION_RESULTS
    (Id, SimulationId, TeamId, DriverUserId, CarId, Points, TimeSeconds, Position,
     TotalP, TotalA, TotalM, TotalH, VRecta, VCurva, PenaltySeconds, SetupJson)
  VALUES
    (@Id, @SimulationId, @TeamId, @DriverUserId, @CarId, @Points, @TimeSeconds, @Position,
     @TotalP, @TotalA, @TotalM, @TotalH, @VRecta, @VCurva, @PenaltySeconds, @SetupJson);

  SELECT * FROM dbo.SIMULATION_RESULTS WHERE Id = @Id;
END';
EXEC sys.sp_executesql @sql;


-- Simulation_GetById (cabecera + resultados completos)
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Simulation_GetById
  @Id UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;

  SELECT
    s.Id,
    s.TrackId,
    t.Name AS TrackName,
    t.DistanceKm,
    t.Curves,
    s.StartedAt,
    s.Status,
    s.CreatedByUserId,
    s.Notes
  FROM dbo.SIMULATIONS s
  JOIN dbo.TRACKS t ON t.Id = s.TrackId
  WHERE s.Id = @Id;

  SELECT
    r.Id,
    r.SimulationId,
    r.TeamId,
    tm.Name AS TeamName,
    r.DriverUserId,
    u.Name AS DriverName,
    r.CarId,
    r.Points,
    r.TimeSeconds,
    r.Position,
    r.TotalP, r.TotalA, r.TotalM, r.TotalH,
    r.VRecta, r.VCurva, r.PenaltySeconds,
    r.SetupJson,
    r.CreatedAt
  FROM dbo.SIMULATION_RESULTS r
  JOIN dbo.TEAM tm ON tm.Id = r.TeamId
  JOIN dbo.[USER] u ON u.Id = r.DriverUserId
  WHERE r.SimulationId = @Id
  ORDER BY
    r.Points DESC,
    r.TimeSeconds ASC;
END';
EXEC sys.sp_executesql @sql;


-- Simulation_ListResults (para filtros: general / por pista / por conductor / por carrera)
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Simulation_ListResults
  @TrackId UNIQUEIDENTIFIER = NULL,
  @DriverUserId UNIQUEIDENTIFIER = NULL,
  @SimulationId UNIQUEIDENTIFIER = NULL,
  @Top INT = 200
AS
BEGIN
  SET NOCOUNT ON;

  SELECT TOP (@Top)
    s.Id AS SimulationId,
    s.StartedAt,
    s.TrackId,
    t.Name AS TrackName,

    r.Id AS ResultId,
    r.TeamId,
    tm.Name AS TeamName,
    r.DriverUserId,
    u.Name AS DriverName,
    r.CarId,
    r.Points,
    r.TimeSeconds,
    r.Position,
    r.TotalP, r.TotalA, r.TotalM, r.TotalH,
    r.VRecta, r.VCurva, r.PenaltySeconds,
    r.SetupJson
  FROM dbo.SIMULATION_RESULTS r
  JOIN dbo.SIMULATIONS s ON s.Id = r.SimulationId
  JOIN dbo.TRACKS t ON t.Id = s.TrackId
  JOIN dbo.TEAM tm ON tm.Id = r.TeamId
  JOIN dbo.[USER] u ON u.Id = r.DriverUserId
  WHERE (@TrackId IS NULL OR s.TrackId = @TrackId)
    AND (@DriverUserId IS NULL OR r.DriverUserId = @DriverUserId)
    AND (@SimulationId IS NULL OR s.Id = @SimulationId)
  ORDER BY
    s.StartedAt DESC,
    r.Points DESC,
    r.TimeSeconds ASC;
END';
EXEC sys.sp_executesql @sql;

-- Simulation_SetPositionsAndPointsByTime
SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Simulation_SetPositionsAndPointsByTime
  @SimulationId UNIQUEIDENTIFIER
AS
BEGIN
  SET NOCOUNT ON;
  SET XACT_ABORT ON;

  IF NOT EXISTS (SELECT 1 FROM dbo.SIMULATIONS WHERE Id = @SimulationId)
  BEGIN RAISERROR(''Simulación no encontrada.'', 16, 1); RETURN; END

  ;WITH ranked AS (
    SELECT
      r.Id,
      DENSE_RANK() OVER (ORDER BY r.TimeSeconds ASC) AS Pos
    FROM dbo.SIMULATION_RESULTS r
    WHERE r.SimulationId = @SimulationId
  )
  UPDATE r
  SET
    r.Position = ranked.Pos,
    r.Points =
      CASE ranked.Pos
        WHEN 1 THEN 25
        WHEN 2 THEN 18
        WHEN 3 THEN 15
        WHEN 4 THEN 12
        WHEN 5 THEN 10
        WHEN 6 THEN 8
        WHEN 7 THEN 6
        WHEN 8 THEN 4
        WHEN 9 THEN 2
        WHEN 10 THEN 1
        ELSE 0
      END
  FROM dbo.SIMULATION_RESULTS r
  JOIN ranked ON ranked.Id = r.Id;

  SELECT
    r.*,
    u.Name AS DriverName,
    t.Name AS TeamName
  FROM dbo.SIMULATION_RESULTS r
  JOIN dbo.[USER] u ON u.Id = r.DriverUserId
  JOIN dbo.TEAM t ON t.Id = r.TeamId
  WHERE r.SimulationId = @SimulationId
  ORDER BY r.Position ASC, r.TimeSeconds ASC;
END';
EXEC sys.sp_executesql @sql;
