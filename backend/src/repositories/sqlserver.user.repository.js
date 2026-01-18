import { UserRepository } from "./user.repository.js";
import { getSqlPool, sql } from "../db/sqlserver.js";

function mapUserRow(row) {
  if (!row) return null;

  return {
    id: String(row.Id),
    name: row.Name,
    email: row.Email,
    passwordHash: row.PasswordHash,
    role: row.Role,
    createdAt: row.CreatedAt instanceof Date ? row.CreatedAt.toISOString() : row.CreatedAt,
  };
}

export class SqlServerUserRepository extends UserRepository {
  async findByEmail(email) {
    const pool = await getSqlPool();
    const result = await pool
      .request()
      .input("Email", sql.NVarChar(320), email)
      .execute("dbo.User_GetByEmail");

    return mapUserRow(result.recordset?.[0] || null);
  }

  async findById(id) {
    const pool = await getSqlPool();
    const result = await pool
      .request()
      .input("Id", sql.UniqueIdentifier, id)
      .execute("dbo.User_GetById");

    return mapUserRow(result.recordset?.[0] || null);
  }

  async create(user) {
    const pool = await getSqlPool();

    const result = await pool
      .request()
      .input("Id", sql.UniqueIdentifier, user.id)
      .input("Name", sql.NVarChar(120), user.name)
      .input("Email", sql.NVarChar(320), user.email)
      .input("PasswordHash", sql.NVarChar(255), user.passwordHash)
      .input("Role", sql.NVarChar(20), user.role)
      .execute("dbo.User_Create");

    return mapUserRow(result.recordset?.[0] || null);
  }

  async list() {
    // Not needed for auth right now; keep minimal.
    const pool = await getSqlPool();
    const result = await pool
      .request()
      .query(
        "SELECT Id, Name, Email, PasswordHash, Role, CreatedAt FROM dbo.[USER] ORDER BY CreatedAt DESC;"
      );

    return (result.recordset || []).map(mapUserRow);
  }

  async list({ role, unassigned } = {}) {
    const pool = await getSqlPool();
    const req = pool.request();

    let sqlText = `
      SELECT u.Id, u.Name, u.Email, u.Role
      FROM dbo.[USER] u
    `;

    const where = [];

    if (unassigned) {
      sqlText += ` LEFT JOIN dbo.TEAM_ENGINEER te ON te.UserId = u.Id `;
      where.push(` te.UserId IS NULL `);
    }

    if (role) {
      where.push(` u.Role = @Role `);
      req.input("Role", sql.NVarChar(20), role);
    }

    if (where.length) sqlText += ` WHERE ` + where.join(" AND ");
    sqlText += ` ORDER BY u.Name ASC;`;

    const r = await req.query(sqlText);

    return (r.recordset || []).map((u) => ({
      id: String(u.Id),
      name: u.Name,
      email: u.Email,
      role: u.Role,
    }));
  }

  async listEngineersAvailable() {
    const pool = await getSqlPool();
    const r = await pool.request().execute("dbo.User_ListEngineersAvailable");

    return (r.recordset || []).map((u) => ({
      id: String(u.Id),
      name: u.Name ?? "",
      email: u.Email ?? "",
      role: u.Role ?? "",
    }));
  }
  async listDriversAvailable() {
    const pool = await getSqlPool();
    const r = await pool.request().execute("dbo.User_ListDriversAvailable");
    return (r.recordset || []).map(u => ({
      id: String(u.Id),
      name: u.Name ?? "",
      email: u.Email ?? "",
      role: u.Role ?? "",
    }));
  }

  async hasAnyAdmin() {
    const pool = await getSqlPool();
    const result = await pool
      .request()
      .input("Role", sql.NVarChar(20), "ADMIN")
      .query("SELECT TOP (1) 1 AS ok FROM dbo.[USER] WHERE Role = @Role;");

    return (result.recordset || []).length > 0;
  }

  async listDriversFinalized() {
    const pool = await getSqlPool();
    const result = await pool.request().execute("dbo.User_ListDriversFinalized");
    return (result.recordset || []).map((r) => ({
      id: String(r.Id),
      name: r.Name,
      email: r.Email,
      role: r.Role,
    }));
  }
}

