import { asyncHandler } from "../utils/asyncHandler.js";

export function makeSimulationController(simService) {
  return {
    listResults: asyncHandler(async (req, res) => {
      const { trackId, driverUserId, simulationId, top } = req.query;
      res.json({
        results: await simService.listResults({
          trackId,
          driverUserId,
          simulationId,
          top: top ? Number(top) : 200,
        }),
      });
    }),

    create: asyncHandler(async (req, res) => {
      // payload: { trackId, participants: [userId, ...] }
      const simulation = await simService.create(req.body);
      res.status(201).json({ simulation });
    }),
  };
}
