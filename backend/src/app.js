import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import { asyncHandler } from "./utils/asyncHandler.js";
import { getSqlPool } from "./db/sqlserver.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.corsOrigin, credentials: true }));
  app.use(express.json());

  app.get("/", (req, res) => {
    res.json({
      ok: true,
      message: "F1 Garage Manager backend is running.",
      endpoints: {
        health: "/health",
        dbHealth: "/health/db",
        apiBase: "/api",
      },
    });
  });

  app.get("/health", (req, res) => res.json({ ok: true }));

  // Quick DB connectivity check (only meaningful when USER_REPOSITORY=sqlserver)
  app.get(
    "/health/db",
    asyncHandler(async (req, res) => {
      if (String(env.userRepository).toLowerCase() !== "sqlserver") {
        return res.json({ ok: true, db: { enabled: false, repository: env.userRepository } });
      }

      const pool = await getSqlPool();
      const result = await pool.request().query(
        "SELECT @@SERVERNAME AS serverName, DB_NAME() AS databaseName;"
      );

      return res.json({ ok: true, db: { enabled: true, ...result.recordset?.[0] } });
    })
  );

  app.use("/api", routes);

  app.use(errorMiddleware);

  return app;
}
