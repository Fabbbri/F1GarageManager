import { Router } from "express";

import crypto from "crypto";

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
import { SqlServerPartRepository } from "../repositories/sqlserver.part.repository.js";
import { PartService } from "../services/part.service.js";
import { makePartController } from "../controllers/part.controller.js";
import { makePartRoutes } from "./part.routes.js";

import { makeSponsorRoutes } from "./sponsor.routes.js";
import { SponsorController } from "../controllers/sponsor.controller.js";
import { SponsorService } from "../services/sponsor.service.js";
import { SqlServerSponsorRepository } from "../repositories/sqlserver.sponsor.repository.js";

const router = Router();

// AUTH
const userRepo =
  String(env.userRepository).toLowerCase() === "sqlserver"
    ? new SqlServerUserRepository()
    : new InMemoryUserRepository([]);
const authService = new AuthService(userRepo);
const authController = makeAuthController(authService);
router.use("/auth", makeAuthRoutes(authController));

// PARTS (store catalog)
const seedParts = [
  {
    id: crypto.randomUUID(),
    name: "Paquete aerodinámico estándar",
    category: "Paquete aerodinámico",
    price: 12000,
    stock: 8,
    performance: { p: 1, a: 4, m: 2 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    name: "Juego de neumáticos (medium)",
    category: "Neumáticos",
    price: 9000,
    stock: 20,
    performance: { p: 2, a: 2, m: 3 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    name: "Unidad de potencia V6 híbrida",
    category: "Power Unit",
    price: 25000,
    stock: 6,
    performance: { p: 6, a: 0, m: 1 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    name: "Suspensión reforzada",
    category: "Suspensión",
    price: 14000,
    stock: 10,
    performance: { p: 0, a: 1, m: 5 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    name: "Caja de cambios 8 velocidades",
    category: "Caja de cambios",
    price: 16000,
    stock: 7,
    performance: { p: 2, a: 1, m: 2 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const partRepo =
  String(env.partRepository).toLowerCase() === "sqlserver"
    ? new SqlServerPartRepository()
    : new InMemoryPartRepository(seedParts);
const partService = new PartService(partRepo);
const partController = makePartController(partService);
router.use("/parts", makePartRoutes(partController));

// SPONSORS
const sponsorRepo = new SqlServerSponsorRepository();
const sponsorService = new SponsorService(sponsorRepo);
const sponsorController = new SponsorController(sponsorService);
router.use("/sponsors", makeSponsorRoutes(sponsorController));

// TEAMS
const teamRepo =
  String(env.teamRepository).toLowerCase() === "sqlserver"
    ? new SqlServerTeamRepository()
    : new InMemoryTeamRepository([]); // 👈 no metas seedTeams “fake” si estás probando BD

const teamService = new TeamService(teamRepo, partRepo);
const teamController = makeTeamController(teamService);
router.use("/teams", makeTeamRoutes(teamController));

export default router;
