import { Router } from "express";

import { env } from "../config/env.js";

import { InMemoryUserRepository } from "../repositories/inmemory.user.repository.js";
import { SqlServerUserRepository } from "../repositories/sqlserver.user.repository.js";
import { AuthService } from "../services/auth.service.js";
import { makeAuthController } from "../controllers/auth.controller.js";
import { makeAuthRoutes } from "./auth.routes.js";

import { InMemoryTeamRepository } from "../repositories/inmemory.team.repository.js";
import { SqlServerTeamRepository } from "../repositories/sqlserver.team.repository.js";
import { TeamService } from "../services/team.service.js";
import { makeTeamController } from "../controllers/team.controller.js";
import { makeTeamRoutes } from "./team.routes.js";

import { InMemoryPartRepository } from "../repositories/inmemory.part.repository.js";
import { PartService } from "../services/part.service.js";
import { makePartController } from "../controllers/part.controller.js";
import { makePartRoutes } from "./part.routes.js";

const router = Router();

// AUTH
const userRepo =
  String(env.userRepository).toLowerCase() === "sqlserver"
    ? new SqlServerUserRepository()
    : new InMemoryUserRepository([]);
const authService = new AuthService(userRepo);
const authController = makeAuthController(authService);
router.use("/auth", makeAuthRoutes(authController));

// TEAMS
const seedTeams = [
  {
    id: "t1",
    name: "Red Comet Racing",
    country: "Costa Rica",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    budget: { total: 0, spent: 0 },
    sponsors: [],
    contributions: [],
    inventory: [],
    cars: [],
    drivers: [],
  }
];
const teamRepo =
  String(env.teamRepository).toLowerCase() === "sqlserver"
    ? new SqlServerTeamRepository()
    : new InMemoryTeamRepository(seedTeams);

// PARTS (catalog)
const seedParts = [
  {
    id: "p1",
    name: "Alerón delantero estándar",
    category: "Aerodinámica",
    price: 12000,
    stock: 8,
    performance: { speed: 2, handling: 6, reliability: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "p2",
    name: "Juego de neumáticos (medium)",
    category: "Neumáticos",
    price: 9000,
    stock: 20,
    performance: { speed: 3, handling: 3, reliability: -1 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];
const partRepo = new InMemoryPartRepository(seedParts);
const partService = new PartService(partRepo);
const partController = makePartController(partService);
router.use("/parts", makePartRoutes(partController));

const teamService = new TeamService(teamRepo, partRepo);
const teamController = makeTeamController(teamService);
router.use("/teams", makeTeamRoutes(teamController));

export default router;
