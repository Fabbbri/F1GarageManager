import sql from "mssql";
import { getSqlPool } from "../db/sqlserver.js";

function iso(d) {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : String(d);
}

export class SqlServerSimulationRepository {
  async getActiveTrackById(trackId) {
    const pool = await getSqlPool();
    const r = await pool
      .request()
      .input("Id", sql.UniqueIdentifier, trackId)
      .query(
        `
        SELECT TOP (1)
          t.Id,
          t.Name,
          t.DistanceKm,
          t.Curves,
          t.IsActive
        FROM dbo.TRACKS t
        WHERE t.Id = @Id AND t.IsActive = 1;
        `
      );

    const row = r.recordset?.[0];
    return row
      ? {
          id: String(row.Id),
          name: row.Name,
          distanceKm: Number(row.DistanceKm),
          curves: Number(row.Curves),
          isActive: Boolean(row.IsActive),
        }
      : null;
  }

  async getParticipantSnapshot(driverUserId) {
    const pool = await getSqlPool();
    const req = pool.request();
    req.input("DriverUserId", sql.UniqueIdentifier, driverUserId);

    // 1) Team + finalized car + driver skill
    const base = await req.query(
      `
      SELECT TOP (1)
        td.TeamId,
        c.Id AS CarId,
        td.Skill AS Skill
      FROM dbo.TEAM_DRIVER td
      JOIN dbo.TEAM_CAR c
        ON c.TeamId = td.TeamId
       AND c.DriverId = td.UserId
       AND c.IsFinalized = 1
      WHERE td.UserId = @DriverUserId;
      `
    );

    const row = base.recordset?.[0];
    if (!row) return null;

    const teamId = String(row.TeamId);
    const carId = String(row.CarId);
    const skill = Number(row.Skill ?? 0);

    // 2) Totals P/A/M from installed parts (5 required categories)
    const totalsReq = pool.request();
    totalsReq.input("TeamId", sql.UniqueIdentifier, teamId);
    totalsReq.input("CarId", sql.UniqueIdentifier, carId);

    const totals = await totalsReq.query(
      `
      SELECT
        COUNT(DISTINCT ip.CategoryKey) AS RequiredCount,
        SUM(COALESCE(p.P, 0)) AS TotalP,
        SUM(COALESCE(p.A, 0)) AS TotalA,
        SUM(COALESCE(p.M, 0)) AS TotalM
      FROM dbo.TEAM_CAR_INSTALLED_PART ip
      JOIN dbo.TEAM_INVENTORY_ITEM ii ON ii.Id = ip.InventoryItemId
      JOIN dbo.PART p ON p.Id = ii.PartId
      WHERE ip.TeamId = @TeamId
        AND ip.CarId = @CarId
        AND ip.CategoryKey IN (
          'Power Unit',
          'Paquete aerodinámico',
          'Neumáticos',
          'Suspensión',
          'Caja de cambios'
        );
      `
    );

    const t = totals.recordset?.[0] || {};
    return {
      driverUserId: String(driverUserId),
      teamId,
      carId,
      skill,
      requiredCount: Number(t.RequiredCount ?? 0),
      totalP: Number(t.TotalP ?? 0),
      totalA: Number(t.TotalA ?? 0),
      totalM: Number(t.TotalM ?? 0),
    };
  }

  async listResults({ trackId, driverUserId, simulationId, top = 200 }) {
    const pool = await getSqlPool();
    const req = pool.request();

    req.input("Top", sql.Int, top);
    req.input("TrackId", sql.UniqueIdentifier, trackId || null);
    req.input("DriverUserId", sql.UniqueIdentifier, driverUserId || null);
    req.input("SimulationId", sql.UniqueIdentifier, simulationId || null);

    const result = await req.execute("dbo.Simulation_ListResults");

    return (result.recordset || []).map((r) => ({
      resultId: r.ResultId ? String(r.ResultId) : (r.Id ? String(r.Id) : null),
      simulationId: String(r.SimulationId),
      trackId: String(r.TrackId),
      trackName: r.TrackName ?? null,
      driverUserId: String(r.DriverUserId),
      driverName: r.DriverName ?? null,
      teamId: r.TeamId ? String(r.TeamId) : null,
      teamName: r.TeamName ?? null,
      carId: r.CarId ? String(r.CarId) : null,
      position: r.Position != null ? Number(r.Position) : null,
      points: r.Points != null ? Number(r.Points) : 0,
      timeSec: r.TimeSeconds != null ? Number(r.TimeSeconds) : null,
      totalP: r.TotalP != null ? Number(r.TotalP) : null,
      totalA: r.TotalA != null ? Number(r.TotalA) : null,
      totalM: r.TotalM != null ? Number(r.TotalM) : null,
      totalH: r.TotalH != null ? Number(r.TotalH) : null,
      vRecta: r.VRecta != null ? Number(r.VRecta) : null,
      vCurva: r.VCurva != null ? Number(r.VCurva) : null,
      penaltySeconds: r.PenaltySeconds != null ? Number(r.PenaltySeconds) : null,
      startedAt: iso(r.StartedAt),
    }));
  }

  async createWithResults({
    simulationId,
    trackId,
    createdByUserId = null,
    notes = null,
    results,
  }) {
    const pool = await getSqlPool();
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      const header = await new sql.Request(tx)
        .input("Id", sql.UniqueIdentifier, simulationId)
        .input("TrackId", sql.UniqueIdentifier, trackId)
        .input("CreatedByUserId", sql.UniqueIdentifier, createdByUserId)
        .input("StartedAt", sql.DateTime2(0), null)
        .input("Notes", sql.NVarChar(300), notes)
        .execute("dbo.Simulation_Create");

      const simRow = header.recordset?.[0] || null;

      for (const r of results) {
        await new sql.Request(tx)
          .input("Id", sql.UniqueIdentifier, r.id)
          .input("SimulationId", sql.UniqueIdentifier, simulationId)
          .input("TeamId", sql.UniqueIdentifier, r.teamId)
          .input("DriverUserId", sql.UniqueIdentifier, r.driverUserId)
          .input("CarId", sql.UniqueIdentifier, r.carId)
          .input("Points", sql.Int, 0)
          .input("TimeSeconds", sql.Int, r.timeSeconds)
          .input("Position", sql.Int, null)
          .input("TotalP", sql.Int, r.totalP)
          .input("TotalA", sql.Int, r.totalA)
          .input("TotalM", sql.Int, r.totalM)
          .input("TotalH", sql.Int, r.totalH)
          .input("VRecta", sql.Decimal(10, 2), r.vRecta)
          .input("VCurva", sql.Decimal(10, 2), r.vCurva)
          .input("PenaltySeconds", sql.Int, r.penaltySeconds)
          .input("SetupJson", sql.NVarChar(sql.MAX), r.setupJson)
          .execute("dbo.Simulation_AddResult");
      }

      await new sql.Request(tx)
        .input("SimulationId", sql.UniqueIdentifier, simulationId)
        .execute("dbo.Simulation_SetPositionsAndPointsByTime");

      // Read final results (same shape as /results)
      const final = await new sql.Request(tx)
        .input("Top", sql.Int, Math.max(200, results.length + 50))
        .input("TrackId", sql.UniqueIdentifier, null)
        .input("DriverUserId", sql.UniqueIdentifier, null)
        .input("SimulationId", sql.UniqueIdentifier, simulationId)
        .execute("dbo.Simulation_ListResults");

      await tx.commit();

      return {
        simulation: {
          id: String(simulationId),
          trackId: String(trackId),
          startedAt: iso(simRow?.StartedAt),
          createdByUserId: simRow?.CreatedByUserId ? String(simRow.CreatedByUserId) : null,
          status: simRow?.Status ?? "COMPLETED",
          notes: simRow?.Notes ?? null,
        },
        results: (final.recordset || []).map((x) => ({
          resultId: x.ResultId ? String(x.ResultId) : (x.Id ? String(x.Id) : null),
          simulationId: String(x.SimulationId),
          trackId: String(x.TrackId),
          trackName: x.TrackName ?? null,
          driverUserId: String(x.DriverUserId),
          driverName: x.DriverName ?? null,
          teamId: x.TeamId ? String(x.TeamId) : null,
          teamName: x.TeamName ?? null,
          carId: x.CarId ? String(x.CarId) : null,
          position: x.Position != null ? Number(x.Position) : null,
          points: x.Points != null ? Number(x.Points) : 0,
          timeSec: x.TimeSeconds != null ? Number(x.TimeSeconds) : null,
          totalP: x.TotalP != null ? Number(x.TotalP) : null,
          totalA: x.TotalA != null ? Number(x.TotalA) : null,
          totalM: x.TotalM != null ? Number(x.TotalM) : null,
          totalH: x.TotalH != null ? Number(x.TotalH) : null,
          vRecta: x.VRecta != null ? Number(x.VRecta) : null,
          vCurva: x.VCurva != null ? Number(x.VCurva) : null,
          penaltySeconds: x.PenaltySeconds != null ? Number(x.PenaltySeconds) : null,
          startedAt: iso(x.StartedAt),
        })),
      };
    } catch (e) {
      try {
        await tx.rollback();
      } catch {
        // ignore
      }
      throw e;
    }
  }
}
