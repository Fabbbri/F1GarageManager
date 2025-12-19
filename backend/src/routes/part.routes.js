import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

export function makePartRoutes(partController) {
  const r = Router();

  r.get("/", requireAuth, requireRole("ADMIN", "ENGINEER"), partController.list);
  r.post("/", requireAuth, requireRole("ADMIN", "ENGINEER"), partController.create);

  return r;
}
