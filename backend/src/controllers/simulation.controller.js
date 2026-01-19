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

    listMyResults: asyncHandler(async (req, res) => {
      const { trackId, simulationId, top } = req.query;
      const driverUserId = req.auth?.userId;
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
      const createdByUserId = req.auth?.userId || null;
      const out = await simService.create({ ...req.body, createdByUserId });
      res.status(201).json(out);
    }),
  };
}
