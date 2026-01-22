import { getSqlPool } from "../db/sqlserver.js";

export function makeAdminRepository() {
  return {
    async getGrafanaLinks() {
      const pool = await getSqlPool();
      const r = await pool.request().execute("dbo.Admin_GrafanaLinks");

      const rows = r?.recordset || [];
      return rows.map((x) => ({
        title: x.Title ?? x.title,
        url: x.Url ?? x.url,
        sortOrder: x.SortOrder ?? x.sortOrder ?? 0,
      }));
    },
  };
}
