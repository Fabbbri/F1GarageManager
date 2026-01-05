import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

export function makeSponsorRoutes(sponsorController) {
  const r = Router();

  // DEBUG: sin autenticación
  r.get("/debug", (req, res, next) => sponsorController.list(req, res, next));

  // lectura (Admin/Engineer)
  r.get("/", requireAuth, requireRole("ADMIN", "ENGINEER"), (req, res, next) => sponsorController.list(req, res, next));
  r.get("/:id", requireAuth, requireRole("ADMIN", "ENGINEER"), (req, res, next) => sponsorController.getById(req, res, next));

  // CRUD sponsor (solo Admin)
  r.post("/", requireAuth, requireRole("ADMIN"), (req, res, next) => sponsorController.create(req, res, next));
  r.put("/:id", requireAuth, requireRole("ADMIN"), (req, res, next) => sponsorController.update(req, res, next));
  r.delete("/:id", requireAuth, requireRole("ADMIN"), (req, res, next) => sponsorController.remove(req, res, next));

  return r;
}