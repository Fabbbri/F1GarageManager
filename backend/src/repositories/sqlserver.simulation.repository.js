import sql from "mssql";
import { getSqlPool } from "../db/sqlserver.js";

function iso(d) {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : String(d);
}

export class SqlServerSimulationRepository {
  async listResults({ trackId, driverUserId, simulationId, top = 200 }) {
    const pool = await getSqlPool();
    const req = pool.request();

    req.input("Top", sql.Int, top);
    req.input("TrackId", sql.UniqueIdentifier, trackId || null);
    req.input("DriverUserId", sql.UniqueIdentifier, driverUserId || null);
    req.input("SimulationId", sql.UniqueIdentifier, simulationId || null);

    const result = await req.execute("dbo.Simulation_ListResults");

    return (result.recordset || []).map((r) => ({
      simulationId: String(r.SimulationId),
      trackId: String(r.TrackId),
      driverUserId: String(r.DriverUserId),
      teamId: r.TeamId ? String(r.TeamId) : null,
      carId: r.CarId ? String(r.CarId) : null,
      position: r.Position != null ? Number(r.Position) : null,
      points: r.Points != null ? Number(r.Points) : 0,
      timeSec: r.TimeSeconds != null ? Number(r.TimeSeconds) : null,
      startedAt: iso(r.StartedAt),
    }));
  }

  async create({ trackId, participants }) {
    const pool = await getSqlPool();

    // SP recomendado: dbo.Simulation_Create
    // Idealmente que reciba trackId y devuelva SimulationId
    const result = await pool
      .request()
      .input("TrackId", sql.UniqueIdentifier, trackId)
      .execute("dbo.Simulation_Create");

    const simRow = result.recordset?.[0];
    const simulationId = simRow?.Id ? String(simRow.Id) : String(simRow?.SimulationId || "");

    // Dejar registrados participantes (opcional)
    // Si ya tenés SP para participantes, úsalo aquí.
    // Si no, lo podés omitir (el front no lo usa para arrancar aún).
    // Ejemplo (si existiera): dbo.Simulation_AddParticipant

    return {
      id: simulationId,
      trackId: String(trackId),
      startedAt: iso(simRow?.StartedAt),
      participants,
    };
  }
}
