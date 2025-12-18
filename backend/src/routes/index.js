import { Router } from "express";

import { InMemoryUserRepository } from "../repositories/inmemory.user.repository.js";
import { AuthService } from "../services/auth.service.js";
import { makeAuthController } from "../controllers/auth.controller.js";
import { makeAuthRoutes } from "./auth.routes.js";

import { InMemoryTeamRepository } from "../repositories/inmemory.team.repository.js";
import { TeamService } from "../services/team.service.js";
import { makeTeamController } from "../controllers/team.controller.js";
import { makeTeamRoutes } from "./team.routes.js";

const router = Router();

// AUTH
const userRepo = new InMemoryUserRepository([]);
const authService = new AuthService(userRepo);
const authController = makeAuthController(authService);
router.use("/auth", makeAuthRoutes(authController));

// TEAMS
const seedTeams = [
  { id: "t1", name: "Red Comet Racing", country: "Costa Rica", createdAt: new Date().toISOString(), budget: 0, sponsors: [], inventory: [], cars: [], drivers: [] }
];
const teamRepo = new InMemoryTeamRepository(seedTeams);
const teamService = new TeamService(teamRepo);
const teamController = makeTeamController(teamService);
router.use("/teams", makeTeamRoutes(teamController));

export default router;
