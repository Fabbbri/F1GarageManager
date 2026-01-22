import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

export function makeAdminRoutes(adminController) {
  const r = Router();

  // Vista Admin: solo ADMIN
  r.get("/grafana-links", requireAuth, requireRole("ADMIN"), adminController.grafanaLinks);

  return r;
}
