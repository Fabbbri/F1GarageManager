-- 1) Agregar columna SponsorId si no existe
IF COL_LENGTH('dbo.TEAM_EARNINGS', 'SponsorId') IS NULL
BEGIN
  ALTER TABLE dbo.TEAM_EARNINGS ADD SponsorId INT NULL;
END
GO

BEGIN TRAN;
-- 2) Insertar en SPONSOR los nombres que ya existen en TEAM_EARNINGS y aún no están en SPONSOR
;WITH src AS (
  SELECT
    NombreLimpio = LTRIM(RTRIM(Name)),
    FechaMin = CONVERT(date, MIN(CreatedAt))
  FROM dbo.TEAM_EARNINGS
  WHERE Name IS NOT NULL AND LTRIM(RTRIM(Name)) <> ''
  GROUP BY LTRIM(RTRIM(Name))
)
INSERT INTO dbo.SPONSOR (nombre, fecha)
SELECT s.NombreLimpio, s.FechaMin
FROM src s
WHERE NOT EXISTS (
  SELECT 1 FROM dbo.SPONSOR sp WHERE sp.nombre = s.NombreLimpio
);

-- 3) Rellenar SponsorId en TEAM_EARNINGS por match de nombre
UPDATE te
SET SponsorId = sp.id
FROM dbo.TEAM_EARNINGS te
JOIN dbo.SPONSOR sp
  ON sp.nombre = LTRIM(RTRIM(te.Name))
WHERE te.SponsorId IS NULL;

-- 4) (Opcional) Si hay filas sin nombre, asignarlas a un sponsor "Desconocido"
IF EXISTS (
  SELECT 1
  FROM dbo.TEAM_EARNINGS
  WHERE SponsorId IS NULL
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM dbo.SPONSOR WHERE nombre = N'Desconocido')
  BEGIN
    INSERT INTO dbo.SPONSOR(nombre, fecha)
    VALUES (N'Desconocido', CONVERT(date, SYSDATETIME()));
  END

  UPDATE te
  SET SponsorId = (SELECT id FROM dbo.SPONSOR WHERE nombre = N'Desconocido')
  FROM dbo.TEAM_EARNINGS te
  WHERE te.SponsorId IS NULL;
END

-- 5) Si ya todo quedó con SponsorId, lo hacemos NOT NULL + FK + índice
IF NOT EXISTS (SELECT 1 FROM dbo.TEAM_EARNINGS WHERE SponsorId IS NULL)
BEGIN
  ALTER TABLE dbo.TEAM_EARNINGS ALTER COLUMN SponsorId INT NOT NULL;

  IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_TeamEarnings_Sponsor'
      AND parent_object_id = OBJECT_ID('dbo.TEAM_EARNINGS')
  )
  BEGIN
    ALTER TABLE dbo.TEAM_EARNINGS
      ADD CONSTRAINT FK_TeamEarnings_Sponsor
      FOREIGN KEY (SponsorId) REFERENCES dbo.SPONSOR(id);
  END

  IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID('dbo.TEAM_EARNINGS')
      AND name = 'IX_TeamEarnings_SponsorId'
  )
  BEGIN
    CREATE INDEX IX_TeamEarnings_SponsorId ON dbo.TEAM_EARNINGS(SponsorId);
  END
END

COMMIT TRAN;
