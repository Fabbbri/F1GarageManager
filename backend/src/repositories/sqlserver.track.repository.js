import sql from "mssql";
import { getSqlPool } from "../db/sqlserver.js";

function iso(d) {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : String(d);
}

export class SqlServerTrackRepository {
  async list({ onlyActive }) {
    const pool = await getSqlPool();
    const result = await pool
      .request()
      .input("OnlyActive", sql.Bit, onlyActive ? 1 : 0)
      .execute("dbo.Track_List");

    return (result.recordset || []).map((r) => ({
      id: String(r.Id),
      name: r.Name,
      distanceKm: Number(r.DistanceKm),
      curves: Number(r.Curves),
      active: !!r.Active,
      createdAt: iso(r.CreatedAt),
    }));
  }

  async create({ name, distanceKm, curves }) {
    const pool = await getSqlPool();
    const result = await pool
      .request()
      .input("Name", sql.NVarChar(120), name)
      .input("DistanceKm", sql.Decimal(10, 3), distanceKm)
      .input("Curves", sql.Int, curves)
      .execute("dbo.Track_Create");

    const r = result.recordset?.[0];
    return r
      ? {
          id: String(r.Id),
          name: r.Name,
          distanceKm: Number(r.DistanceKm),
          curves: Number(r.Curves),
          active: !!r.Active,
          createdAt: iso(r.CreatedAt),
        }
      : null;
  }

  async softDelete(id) {
    const pool = await getSqlPool();
    await pool.request().input("Id", sql.UniqueIdentifier, id).execute("dbo.Track_SoftDelete");
  }
}
