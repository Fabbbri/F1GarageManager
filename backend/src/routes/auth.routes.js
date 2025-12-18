import { Router } from "express";
import { requireAuth } from "../middlewares/auth.middleware.js";

export function makeAuthRoutes(authController) {
  const router = Router();

  router.post("/signup", authController.signup);
  router.post("/login", authController.login);
  router.get("/me", requireAuth, authController.me);

  return router;
}
