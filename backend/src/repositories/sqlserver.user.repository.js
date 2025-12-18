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
        "SELECT Id, Name, Email, PasswordHash, Role, CreatedAt FROM dbo.Users ORDER BY CreatedAt DESC;"
      );

    return (result.recordset || []).map(mapUserRow);
  }
}
