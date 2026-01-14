import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

export function makeUserRoutes(userController) {
  const r = Router();

  // Solo ADMIN puede listar engineers
  r.get("/", requireAuth, requireRole("ADMIN"), userController.list);
  r.get("/engineers/available", requireAuth, requireRole("ADMIN"), userController.listEngineersAvailable);

  

  return r;
}
