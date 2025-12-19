import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || "dev_secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "2h",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:3000",

  // Which user repository to use: "memory" | "sqlserver"
  userRepository: process.env.USER_REPOSITORY || "memory",

  // Which team repository to use: "memory" | "sqlserver"
  teamRepository: process.env.TEAM_REPOSITORY || "memory",

  // Which parts repository (store catalog) to use: "memory" | "sqlserver"
  // Defaults to TEAM_REPOSITORY when not specified.
  partRepository: process.env.PART_REPOSITORY || process.env.TEAM_REPOSITORY || "memory",

  // SQL Server connection (only used when USER_REPOSITORY=sqlserver)
  // Supports DB_SERVER as "localhost\\SQLEXPRESS" or separate DB_SERVER + DB_INSTANCE.
  db: (() => {
    const rawServer = process.env.DB_SERVER || "localhost";
    // dotenv users often write DB_SERVER=localhost\\SQLEXPRESS, which becomes a string
    // with two backslashes. Split and drop empty segments to support both forms.
    const parts = rawServer.split("\\").filter(Boolean);
    const serverOnly = parts[0] || "localhost";
    const instanceFromServer = parts.length >= 2 ? parts[1] : undefined;

    const instanceName = instanceFromServer || process.env.DB_INSTANCE || undefined;
    const explicitPort = process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined;

    return {
      server: serverOnly,
      instanceName,
    database: process.env.DB_DATABASE || "F1GarageManager",
    user: process.env.DB_USER || "sa",
    password: process.env.DB_PASSWORD || "YourStrong!Passw0rd",
    // For named instances, leaving port undefined allows SQL Browser lookup.
    port: explicitPort ?? (instanceName ? undefined : 1433),
    encrypt: (process.env.DB_ENCRYPT || "false").toLowerCase() === "true",
    trustServerCertificate:
      (process.env.DB_TRUST_SERVER_CERTIFICATE || "true").toLowerCase() === "true",
    poolMax: process.env.DB_POOL_MAX ? Number(process.env.DB_POOL_MAX) : 10,
    poolMin: process.env.DB_POOL_MIN ? Number(process.env.DB_POOL_MIN) : 0,
    poolIdleTimeoutMillis: process.env.DB_POOL_IDLE_TIMEOUT_MS
      ? Number(process.env.DB_POOL_IDLE_TIMEOUT_MS)
      : 30000,
    };
  })(),
};
