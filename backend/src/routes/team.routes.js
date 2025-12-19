import { Router } from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

export function makeTeamRoutes(teamController) {
  const r = Router();

  // lectura (Admin/Engineer)
  r.get("/", requireAuth, requireRole("ADMIN", "ENGINEER"), teamController.list);
  r.get("/:id", requireAuth, requireRole("ADMIN", "ENGINEER"), teamController.getById);

  // CRUD equipo (Admin)
  r.post("/", requireAuth, requireRole("ADMIN"), teamController.create);
  r.put("/:id", requireAuth, requireRole("ADMIN"), teamController.update);
  r.delete("/:id", requireAuth, requireRole("ADMIN"), teamController.remove);

  // detalle (Admin/Engineer)
  r.patch("/:id/budget", requireAuth, requireRole("ADMIN", "ENGINEER"), teamController.setBudget);

  r.post("/:id/sponsors", requireAuth, requireRole("ADMIN", "ENGINEER"), teamController.addSponsor);
  r.delete("/:id/sponsors/:sponsorId", requireAuth, requireRole("ADMIN", "ENGINEER"), teamController.removeSponsor);

  r.post("/:id/contributions", requireAuth, requireRole("ADMIN", "ENGINEER"), teamController.addContribution);

  r.post("/:id/drivers", requireAuth, requireRole("ADMIN", "ENGINEER"), teamController.addDriver);
  r.delete("/:id/drivers/:driverId", requireAuth, requireRole("ADMIN", "ENGINEER"), teamController.removeDriver);

  r.post("/:id/drivers/:driverId/results", requireAuth, requireRole("ADMIN", "ENGINEER"), teamController.addDriverResult);
  r.get("/:id/drivers/:driverId/stats", requireAuth, requireRole("ADMIN", "ENGINEER"), teamController.getDriverStats);

  r.post("/:id/store/purchase", requireAuth, requireRole("ADMIN", "ENGINEER"), teamController.purchasePart);

  r.post("/:id/cars", requireAuth, requireRole("ADMIN", "ENGINEER"), teamController.addCar);
  r.delete("/:id/cars/:carId", requireAuth, requireRole("ADMIN", "ENGINEER"), teamController.removeCar);

  r.post("/:id/inventory", requireAuth, requireRole("ADMIN", "ENGINEER"), teamController.addInventoryItem);
  r.delete("/:id/inventory/:itemId", requireAuth, requireRole("ADMIN", "ENGINEER"), teamController.removeInventoryItem);

  return r;
}
