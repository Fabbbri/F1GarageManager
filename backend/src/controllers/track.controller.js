import { asyncHandler } from "../utils/asyncHandler.js";

export function makeTrackController(trackService) {
  return {
    list: asyncHandler(async (req, res) => {
      const onlyActive = String(req.query.onlyActive || "1") !== "0";
      res.json({ tracks: await trackService.list({ onlyActive }) });
    }),

    create: asyncHandler(async (req, res) => {
      res.status(201).json({ track: await trackService.create(req.body) });
    }),

    softDelete: asyncHandler(async (req, res) => {
      await trackService.softDelete(req.params.id);
      res.status(204).send();
    }),
  };
}
