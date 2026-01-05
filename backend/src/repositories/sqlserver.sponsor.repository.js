import { getSqlPool, sql } from '../db/sqlserver.js';

export class SqlServerSponsorRepository {
  async getAllSponsors() {
    const pool = await getSqlPool();
    // DEBUG: SELECT directo sin SP
    const r = await pool.request().query('SELECT id, nombre, fecha FROM dbo.SPONSOR ORDER BY id DESC');
    return r.recordset || [];
  }

  async getSponsorById(id) {
    const pool = await getSqlPool();
    const r = await pool.request()
      .input('SponsorId', sql.Int, id)
      .execute('dbo.Sponsor_GetById');
    return r.recordset?.[0] ?? null;
  }

  async createSponsor({ nombre, fecha }) {
    const pool = await getSqlPool();
    const r = await pool.request()
      .input('Nombre', sql.NVarChar(150), nombre)
      .input('Fecha', sql.Date, fecha || null)
      .execute('dbo.Sponsor_Add');
    
    const newId = r.recordset?.[0]?.NewSponsorId;
    if (newId) {
      return await this.getSponsorById(newId);
    }
    return null;
  }

  async updateSponsor(id, { nombre, fecha }) {
    const pool = await getSqlPool();
    const r = await pool.request()
      .input('SponsorId', sql.Int, id)
      .input('Nombre', sql.NVarChar(150), nombre ?? null)
      .input('Fecha', sql.Date, fecha ?? null)
      .execute('dbo.Sponsor_Update');
    return r.recordset?.[0] ?? null;
  }

  async deleteSponsor(id) {
    const pool = await getSqlPool();
    const r = await pool.request()
      .input('SponsorId', sql.Int, id)
      .execute('dbo.Sponsor_Remove');
    return r.recordset?.[0] ?? null;
  }
}