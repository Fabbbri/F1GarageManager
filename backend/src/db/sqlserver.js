import sql from "mssql";
import { env } from "../config/env.js";

let poolPromise;

export { sql };

export function getSqlPool() {
  if (!poolPromise) {
    poolPromise = sql.connect({
      server: env.db.server,
      database: env.db.database,
      user: env.db.user,
      password: env.db.password,
      ...(typeof env.db.port === "number" ? { port: env.db.port } : {}),
      options: {
        encrypt: env.db.encrypt,
        trustServerCertificate: env.db.trustServerCertificate,
        ...(env.db.instanceName ? { instanceName: env.db.instanceName } : {}),
      },
      pool: {
        max: env.db.poolMax,
        min: env.db.poolMin,
        idleTimeoutMillis: env.db.poolIdleTimeoutMillis,
      },
    });
  }

  return poolPromise;
}
