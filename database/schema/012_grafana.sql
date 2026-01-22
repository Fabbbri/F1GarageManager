/* =========================================================
   10.1 - Integración Grafana (Opción 1: Hipervínculos)
   Script listo para ejecutar (1 solo .sql)

    Crea tabla dbo.APP_CONFIG (si no existe)
    Guarda config de Grafana (base url + uid + panel keys)
    Crea SP dbo.Admin_GrafanaLinks (formato del proyecto)
    Devuelve links listos para renderizar en Admin (Title, Url)

   IMPORTANTE:
   - Ya dejé tu UID: adfg9kw
   - Base URL: http://localhost:3000
   - Como no me diste los viewPanel de 3B/3C/3D/3E, dejé valores
     por defecto (panel-3 ... panel-6). Si en tu Grafana son otros,
     solo cambiá los valores en el MERGE y listo.
   ========================================================= */

SET NOCOUNT ON;

-- =========================
-- Tabla de configuración
-- =========================
IF OBJECT_ID('dbo.APP_CONFIG', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.APP_CONFIG (
    [Key]   NVARCHAR(80)   NOT NULL,
    [Value] NVARCHAR(4000) NOT NULL,
    CONSTRAINT PK_APP_CONFIG PRIMARY KEY ([Key])
  );
END
GO

-- =========================
-- Configuración (AJUSTADA A TU CASO)
-- =========================
-- UID del dashboard (de tu URL: /d/adfg9kw/...)
-- Panel IDs: salen en el Share Link como viewPanel=panel-X
-- Ejemplo que enviaste: viewPanel=panel-3
MERGE dbo.APP_CONFIG AS T
USING (VALUES
  (N'GRAFANA_BASE_URL',      N'http://localhost:3000'),
  (N'GRAFANA_DASHBOARD_UID', N'adfg9kw'),

  -- Paneles principales (si los tenés)
  (N'GRAFANA_PANEL_RANKING', N'panel-1'),
  (N'GRAFANA_PANEL_SETUPS',  N'panel-2'),

  -- Paneles que hiciste: 3B, 3C, 3D y 3E
  (N'GRAFANA_PANEL_3B_TIME', N'panel-4'),
  (N'GRAFANA_PANEL_3C_P',    N'panel-5'),
  (N'GRAFANA_PANEL_3D_A',    N'panel-6'),
  (N'GRAFANA_PANEL_3E_M',    N'panel-7')
) AS S([Key],[Value])
ON T.[Key] = S.[Key]
WHEN MATCHED THEN
  UPDATE SET T.[Value] = S.[Value]
WHEN NOT MATCHED THEN
  INSERT([Key],[Value]) VALUES (S.[Key], S.[Value]);
GO

DECLARE @sql NVARCHAR(MAX);

BEGIN TRY

SET @sql = N'CREATE OR ALTER PROCEDURE dbo.Admin_GrafanaLinks
AS
BEGIN
  SET NOCOUNT ON;

  DECLARE @base NVARCHAR(4000) =
    (SELECT [Value] FROM dbo.APP_CONFIG WHERE [Key] = ''GRAFANA_BASE_URL'');

  DECLARE @uid NVARCHAR(4000) =
    (SELECT [Value] FROM dbo.APP_CONFIG WHERE [Key] = ''GRAFANA_DASHBOARD_UID'');

  DECLARE @pRanking NVARCHAR(200) =
    (SELECT [Value] FROM dbo.APP_CONFIG WHERE [Key] = ''GRAFANA_PANEL_RANKING'');

  DECLARE @pSetups NVARCHAR(200) =
    (SELECT [Value] FROM dbo.APP_CONFIG WHERE [Key] = ''GRAFANA_PANEL_SETUPS'');

  DECLARE @p3B NVARCHAR(200) =
    (SELECT [Value] FROM dbo.APP_CONFIG WHERE [Key] = ''GRAFANA_PANEL_3B_TIME'');

  DECLARE @p3C NVARCHAR(200) =
    (SELECT [Value] FROM dbo.APP_CONFIG WHERE [Key] = ''GRAFANA_PANEL_3C_P'');

  DECLARE @p3D NVARCHAR(200) =
    (SELECT [Value] FROM dbo.APP_CONFIG WHERE [Key] = ''GRAFANA_PANEL_3D_A'');

  DECLARE @p3E NVARCHAR(200) =
    (SELECT [Value] FROM dbo.APP_CONFIG WHERE [Key] = ''GRAFANA_PANEL_3E_M'');

  IF @base IS NULL OR LTRIM(RTRIM(@base)) = ''''
  BEGIN
    RAISERROR(''Falta APP_CONFIG.GRAFANA_BASE_URL'', 16, 1);
    RETURN;
  END

  IF @uid IS NULL OR LTRIM(RTRIM(@uid)) = ''''
  BEGIN
    RAISERROR(''Falta APP_CONFIG.GRAFANA_DASHBOARD_UID'', 16, 1);
    RETURN;
  END

  -- Evitar //d/
  IF RIGHT(@base, 1) = ''/''
    SET @base = LEFT(@base, LEN(@base) - 1);

  -- Link principal al dashboard
  SELECT
    ''Dashboard Simulaciones'' AS Title,
    CONCAT(@base, ''/d/'', @uid, ''?orgId=1'') AS Url,
    CAST(0 AS INT) AS SortOrder

  UNION ALL

  -- Ranking (si existe)
  SELECT
    ''Panel Ranking'' AS Title,
    CONCAT(@base, ''/d/'', @uid, ''?orgId=1&viewPanel='', @pRanking) AS Url,
    CAST(10 AS INT) AS SortOrder
  WHERE @pRanking IS NOT NULL AND LTRIM(RTRIM(@pRanking)) <> ''''

  UNION ALL

  -- Setups (si existe)
  SELECT
    ''Panel Setups vs Tiempo'' AS Title,
    CONCAT(@base, ''/d/'', @uid, ''?orgId=1&viewPanel='', @pSetups) AS Url,
    CAST(20 AS INT) AS SortOrder
  WHERE @pSetups IS NOT NULL AND LTRIM(RTRIM(@pSetups)) <> ''''

  UNION ALL

  -- 3B: Tiempo por carro (por pista)
  SELECT
    ''Panel 3B - Tiempo por Carro'' AS Title,
    CONCAT(@base, ''/d/'', @uid, ''?orgId=1&viewPanel='', @p3B) AS Url,
    CAST(30 AS INT) AS SortOrder
  WHERE @p3B IS NOT NULL AND LTRIM(RTRIM(@p3B)) <> ''''

  UNION ALL

  -- 3C: P por carro (por pista)
  SELECT
    ''Panel 3C - P por Carro'' AS Title,
    CONCAT(@base, ''/d/'', @uid, ''?orgId=1&viewPanel='', @p3C) AS Url,
    CAST(40 AS INT) AS SortOrder
  WHERE @p3C IS NOT NULL AND LTRIM(RTRIM(@p3C)) <> ''''

  UNION ALL

  -- 3D: A por carro (por pista)
  SELECT
    ''Panel 3D - A por Carro'' AS Title,
    CONCAT(@base, ''/d/'', @uid, ''?orgId=1&viewPanel='', @p3D) AS Url,
    CAST(50 AS INT) AS SortOrder
  WHERE @p3D IS NOT NULL AND LTRIM(RTRIM(@p3D)) <> ''''

  UNION ALL

  -- 3E: M por carro (por pista)
  SELECT
    ''Panel 3E - M por Carro'' AS Title,
    CONCAT(@base, ''/d/'', @uid, ''?orgId=1&viewPanel='', @p3E) AS Url,
    CAST(60 AS INT) AS SortOrder
  WHERE @p3E IS NOT NULL AND LTRIM(RTRIM(@p3E)) <> ''''

  ORDER BY SortOrder ASC;
END';
EXEC sys.sp_executesql @sql;

END TRY
BEGIN CATCH
  DECLARE @msgSp NVARCHAR(4000) =
    N'No se pudo crear/alterar dbo.Admin_GrafanaLinks. Corré este script con un usuario admin/db_owner. Error: ' + ERROR_MESSAGE();
  RAISERROR(@msgSp, 16, 1);
  RETURN;
END CATCH
GO

/* =========================================================
   Prueba rápida:
   EXEC dbo.Admin_GrafanaLinks;
   ========================================================= */
