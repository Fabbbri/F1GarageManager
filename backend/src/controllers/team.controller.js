import { asyncHandler } from "../utils/asyncHandler.js";

export function makeTeamController(teamService) {
  return {
    list: asyncHandler(async (req, res) => res.json({ teams: await teamService.list() })),
    getById: asyncHandler(async (req, res) => res.json({ team: await teamService.getById(req.params.id) })),
    create: asyncHandler(async (req, res) => res.status(201).json({ team: await teamService.create(req.body) })),
    update: asyncHandler(async (req, res) => res.json({ team: await teamService.update(req.params.id, req.body) })),
    remove: asyncHandler(async (req, res) => { await teamService.remove(req.params.id); res.status(204).send(); }),

    setBudget: asyncHandler(async (req, res) => res.json({ team: await teamService.setBudget(req.params.id, req.body) })),

    addSponsor: asyncHandler(async (req, res) => res.status(201).json({ team: await teamService.addSponsor(req.params.id, req.body) })),
    removeSponsor: asyncHandler(async (req, res) => res.json({ team: await teamService.removeSponsor(req.params.id, req.params.sponsorId) })),

    addDriver: asyncHandler(async (req, res) => res.status(201).json({ team: await teamService.addDriver(req.params.id, req.body) })),
    removeDriver: asyncHandler(async (req, res) => res.json({ team: await teamService.removeDriver(req.params.id, req.params.driverId) })),

    addCar: asyncHandler(async (req, res) => res.status(201).json({ team: await teamService.addCar(req.params.id, req.body) })),
    removeCar: asyncHandler(async (req, res) => res.json({ team: await teamService.removeCar(req.params.id, req.params.carId) })),

    addInventoryItem: asyncHandler(async (req, res) => res.status(201).json({ team: await teamService.addInventoryItem(req.params.id, req.body) })),
    removeInventoryItem: asyncHandler(async (req, res) => res.json({ team: await teamService.removeInventoryItem(req.params.id, req.params.itemId) })),
  };
}
