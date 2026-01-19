import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

export function makeSimulationRoutes(simController) {
  const r = Router();

  // DEBUG (opcional)
  r.get("/debug/results", (req, res, next) => simController.listResults(req, res, next));

  // resultados (Admin/Engineer)
  r.get("/results", requireAuth, requireRole("ADMIN"), (req, res, next) =>
    simController.listResults(req, res, next)
  );

  // resultados del usuario autenticado (Driver/Admin)
  r.get("/my/results", requireAuth, (req, res, next) =>
    simController.listMyResults(req, res, next)
  );

  // crear simulación (Admin/Engineer) — aunque en UI esté deshabilitado
  r.post("/", requireAuth, requireRole("ADMIN"), (req, res, next) =>
    simController.create(req, res, next)
  );

  return r;
}
