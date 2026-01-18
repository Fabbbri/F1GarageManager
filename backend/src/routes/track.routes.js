import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

export function makeTrackRoutes(trackController) {
  const r = Router();

  // DEBUG: sin autenticación (opcional, igual que sponsors)
  r.get("/debug", (req, res, next) => trackController.list(req, res, next));

  // lectura (Admin/Engineer)
  r.get("/", requireAuth, requireRole("ADMIN", "ENGINEER"), (req, res, next) =>
    trackController.list(req, res, next)
  );

  // crear/eliminar (solo Admin)
  r.post("/", requireAuth, requireRole("ADMIN"), (req, res, next) =>
    trackController.create(req, res, next)
  );

  r.delete("/:id", requireAuth, requireRole("ADMIN"), (req, res, next) =>
    trackController.remove(req, res, next)
  );

  return r;
}
