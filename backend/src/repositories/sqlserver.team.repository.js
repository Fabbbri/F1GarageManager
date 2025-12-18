import { TeamRepository } from "./team.repository.js";
import { getSqlPool, sql } from "../db/sqlserver.js";

function hasMessage(err, needle) {
  const msg = String(err?.message || "");
  return msg.toLowerCase().includes(String(needle).toLowerCase());
}

function iso(d) {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : String(d);
}

function mapTeamFromRecordsets(recordsets) {
  const teamRow = recordsets?.[0]?.[0] || null;
  if (!teamRow) return null;

  const sponsors = (recordsets?.[1] || []).map((r) => ({
    id: String(r.Id),
    name: r.Name,
    contribution: Number(r.Contribution ?? 0),
  }));

  const inventory = (recordsets?.[2] || []).map((r) => ({
    id: String(r.Id),
    partName: r.PartName,
    category: r.Category ?? "",
    qty: Number(r.Qty ?? 0),
    unitCost: Number(r.UnitCost ?? 0),
  }));

  const cars = (recordsets?.[3] || []).map((r) => ({
    id: String(r.Id),
    code: r.Code,
    name: r.Name ?? "",
  }));

  const drivers = (recordsets?.[4] || []).map((r) => ({
    id: String(r.Id),
    name: r.Name,
    skill: Number(r.Skill ?? 50),
  }));

  return {
    id: String(teamRow.Id),
    name: teamRow.Name,
    country: teamRow.Country ?? "",
    createdAt: iso(teamRow.CreatedAt),
    updatedAt: iso(teamRow.UpdatedAt),
    budget: {
      total: Number(teamRow.BudgetTotal ?? 0),
      spent: Number(teamRow.BudgetSpent ?? 0),
    },
    sponsors,
    inventory,
    cars,
    drivers,
  };
}

function mapTeamFromListRow(row) {
  if (!row) return null;

  return {
    id: String(row.Id),
    name: row.Name,
    country: row.Country ?? "",
    createdAt: iso(row.CreatedAt),
    updatedAt: iso(row.UpdatedAt),
    budget: {
      total: Number(row.BudgetTotal ?? 0),
      spent: Number(row.BudgetSpent ?? 0),
    },
    sponsors: [],
    inventory: [],
    cars: [],
    drivers: [],
  };
}

export class SqlServerTeamRepository extends TeamRepository {
  async list() {
    const pool = await getSqlPool();
    const result = await pool.request().execute("dbo.Team_List");
    return (result.recordset || []).map(mapTeamFromListRow);
  }

  async findById(id) {
    const pool = await getSqlPool();
    const result = await pool
      .request()
      .input("Id", sql.UniqueIdentifier, id)
      .execute("dbo.Team_GetById");

    return mapTeamFromRecordsets(result.recordsets);
  }

  async create(team) {
    const pool = await getSqlPool();
    try {
      const result = await pool
        .request()
        .input("Id", sql.UniqueIdentifier, team.id)
        .input("Name", sql.NVarChar(120), team.name)
        .input("Country", sql.NVarChar(120), team.country || null)
        .execute("dbo.Team_Create");

      return mapTeamFromRecordsets(result.recordsets);
    } catch (e) {
      // Duplicate keys or SP-level message
      if (e?.number === 2627 || e?.number === 2601 || hasMessage(e, "ya existe un equipo")) {
        const err = new Error("Ya existe un equipo con ese ID.");
        err.status = 409;
        throw err;
      }
      throw e;
    }
  }

  async update(id, patch) {
    const pool = await getSqlPool();
    try {
      const result = await pool
        .request()
        .input("Id", sql.UniqueIdentifier, id)
        .input("Name", sql.NVarChar(120), patch?.name ?? null)
        .input("Country", sql.NVarChar(120), patch?.country ?? null)
        .execute("dbo.Team_Update");

      return mapTeamFromRecordsets(result.recordsets);
    } catch (e) {
      if (hasMessage(e, "equipo no encontrado")) return null;
      throw e;
    }
  }

  async setBudget(teamId, { total, spent }) {
    const pool = await getSqlPool();
    try {
      const result = await pool
        .request()
        .input("TeamId", sql.UniqueIdentifier, teamId)
        .input("Total", sql.Decimal(18, 2), total ?? null)
        .input("Spent", sql.Decimal(18, 2), spent ?? null)
        .execute("dbo.Team_SetBudget");

      return mapTeamFromRecordsets(result.recordsets);
    } catch (e) {
      if (hasMessage(e, "equipo no encontrado")) return null;
      throw e;
    }
  }

  async addSponsor(teamId, sponsor) {
    const pool = await getSqlPool();
    try {
      const result = await pool
        .request()
        .input("TeamId", sql.UniqueIdentifier, teamId)
        .input("SponsorId", sql.UniqueIdentifier, sponsor.id)
        .input("Name", sql.NVarChar(120), sponsor.name)
        .input("Contribution", sql.Decimal(18, 2), Number(sponsor.contribution ?? 0))
        .execute("dbo.Team_AddSponsor");

      return mapTeamFromRecordsets(result.recordsets);
    } catch (e) {
      if (hasMessage(e, "equipo no encontrado")) return null;
      throw e;
    }
  }

  async removeSponsor(teamId, sponsorId) {
    const pool = await getSqlPool();
    try {
      const result = await pool
        .request()
        .input("TeamId", sql.UniqueIdentifier, teamId)
        .input("SponsorId", sql.UniqueIdentifier, sponsorId)
        .execute("dbo.Team_RemoveSponsor");

      return mapTeamFromRecordsets(result.recordsets);
    } catch (e) {
      if (hasMessage(e, "patrocinador no encontrado")) return null;
      if (hasMessage(e, "equipo no encontrado")) return null;
      throw e;
    }
  }

  async addCar(teamId, car) {
    const pool = await getSqlPool();
    try {
      const result = await pool
        .request()
        .input("TeamId", sql.UniqueIdentifier, teamId)
        .input("CarId", sql.UniqueIdentifier, car.id)
        .input("Code", sql.NVarChar(40), car.code)
        .input("Name", sql.NVarChar(120), car.name || null)
        .execute("dbo.Team_AddCar");

      return mapTeamFromRecordsets(result.recordsets);
    } catch (e) {
      if (hasMessage(e, "equipo no encontrado")) return null;
      throw e;
    }
  }

  async removeCar(teamId, carId) {
    const pool = await getSqlPool();
    try {
      const result = await pool
        .request()
        .input("TeamId", sql.UniqueIdentifier, teamId)
        .input("CarId", sql.UniqueIdentifier, carId)
        .execute("dbo.Team_RemoveCar");

      return mapTeamFromRecordsets(result.recordsets);
    } catch (e) {
      if (hasMessage(e, "carro no encontrado")) return null;
      if (hasMessage(e, "equipo no encontrado")) return null;
      throw e;
    }
  }

  async addDriver(teamId, driver) {
    const pool = await getSqlPool();
    try {
      const result = await pool
        .request()
        .input("TeamId", sql.UniqueIdentifier, teamId)
        .input("DriverId", sql.UniqueIdentifier, driver.id)
        .input("Name", sql.NVarChar(120), driver.name)
        .input("Skill", sql.Int, Number(driver.skill ?? 50))
        .execute("dbo.Team_AddDriver");

      return mapTeamFromRecordsets(result.recordsets);
    } catch (e) {
      if (hasMessage(e, "equipo no encontrado")) return null;
      throw e;
    }
  }

  async removeDriver(teamId, driverId) {
    const pool = await getSqlPool();
    try {
      const result = await pool
        .request()
        .input("TeamId", sql.UniqueIdentifier, teamId)
        .input("DriverId", sql.UniqueIdentifier, driverId)
        .execute("dbo.Team_RemoveDriver");

      return mapTeamFromRecordsets(result.recordsets);
    } catch (e) {
      if (hasMessage(e, "conductor no encontrado")) return null;
      if (hasMessage(e, "equipo no encontrado")) return null;
      throw e;
    }
  }

  async addInventoryItem(teamId, item) {
    const pool = await getSqlPool();
    try {
      const result = await pool
        .request()
        .input("TeamId", sql.UniqueIdentifier, teamId)
        .input("ItemId", sql.UniqueIdentifier, item.id)
        .input("PartName", sql.NVarChar(160), item.partName)
        .input("Category", sql.NVarChar(120), item.category || null)
        .input("Qty", sql.Int, Number(item.qty ?? 0))
        .input("UnitCost", sql.Decimal(18, 2), Number(item.unitCost ?? 0))
        .execute("dbo.Team_AddInventoryItem");

      return mapTeamFromRecordsets(result.recordsets);
    } catch (e) {
      if (hasMessage(e, "equipo no encontrado")) return null;
      throw e;
    }
  }

  async removeInventoryItem(teamId, itemId) {
    const pool = await getSqlPool();
    try {
      const result = await pool
        .request()
        .input("TeamId", sql.UniqueIdentifier, teamId)
        .input("ItemId", sql.UniqueIdentifier, itemId)
        .execute("dbo.Team_RemoveInventoryItem");

      return mapTeamFromRecordsets(result.recordsets);
    } catch (e) {
      if (hasMessage(e, "ítem de inventario no encontrado") || hasMessage(e, "item de inventario no encontrado")) return null;
      if (hasMessage(e, "equipo no encontrado")) return null;
      throw e;
    }
  }

  async remove(id) {
    const pool = await getSqlPool();
    const result = await pool
      .request()
      .input("TeamId", sql.UniqueIdentifier, id)
      .execute("dbo.Team_Delete");

    const affected = result.recordset?.[0]?.affected ?? 0;
    return affected > 0;
  }
}
