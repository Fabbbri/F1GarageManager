import { PartRepository } from "./part.repository.js";
import { getSqlPool, sql } from "../db/sqlserver.js";

function hasMessage(err, needle) {
  const msg = String(err?.message || "");
  return msg.toLowerCase().includes(String(needle).toLowerCase());
}

function iso(d) {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : String(d);
}

function mapPartRow(row) {
  if (!row) return null;

  return {
    id: String(row.Id),
    name: row.Name,
    category: row.Category,
    price: Number(row.Price ?? 0),
    stock: Number(row.Stock ?? 0),
    performance: {
      p: Number(row.P ?? 0),
      a: Number(row.A ?? 0),
      m: Number(row.M ?? 0),
    },
    createdAt: iso(row.CreatedAt),
    updatedAt: iso(row.UpdatedAt),
  };
}

export class SqlServerPartRepository extends PartRepository {
  async list() {
    const pool = await getSqlPool();
    const result = await pool.request().execute("dbo.Part_List");
    return (result.recordset || []).map(mapPartRow);
  }

  async findById(id) {
    const pool = await getSqlPool();
    const result = await pool
      .request()
      .input("Id", sql.UniqueIdentifier, id)
      .execute("dbo.Part_GetById");

    return mapPartRow(result.recordset?.[0] || null);
  }

  async create(part) {
    const pool = await getSqlPool();

    try {
      const result = await pool
        .request()
        .input("Id", sql.UniqueIdentifier, part.id)
        .input("Name", sql.NVarChar(160), part.name)
        .input("Category", sql.NVarChar(120), part.category)
        .input("Price", sql.Decimal(18, 2), part.price)
        .input("Stock", sql.Int, part.stock)
        .input("P", sql.Int, part.performance?.p ?? 0)
        .input("A", sql.Int, part.performance?.a ?? 0)
        .input("M", sql.Int, part.performance?.m ?? 0)
        .execute("dbo.Part_Create");

      return mapPartRow(result.recordset?.[0] || null);
    } catch (e) {
      if (e?.number === 2627 || e?.number === 2601 || hasMessage(e, "UX_Parts_Name")) {
        const err = new Error("Ya existe una parte con ese nombre.");
        err.status = 409;
        throw err;
      }
      throw e;
    }
  }

  async decrementStock(id, qty) {
    const pool = await getSqlPool();

    try {
      const result = await pool
        .request()
        .input("Id", sql.UniqueIdentifier, id)
        .input("Qty", sql.Int, qty)
        .execute("dbo.Part_DecrementStock");

      return mapPartRow(result.recordset?.[0] || null);
    } catch (e) {
      if (hasMessage(e, "stock insuficiente")) return null;
      if (hasMessage(e, "parte no encontrada")) return null;
      throw e;
    }
  }

  async incrementStock(id, qty) {
    const pool = await getSqlPool();

    try {
      const result = await pool
        .request()
        .input("Id", sql.UniqueIdentifier, id)
        .input("Qty", sql.Int, qty)
        .execute("dbo.Part_IncrementStock");

      return mapPartRow(result.recordset?.[0] || null);
    } catch (e) {
      if (hasMessage(e, "parte no encontrada")) return null;
      throw e;
    }
  }
}
