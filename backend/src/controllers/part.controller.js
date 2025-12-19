import { asyncHandler } from "../utils/asyncHandler.js";

export function makePartController(partService) {
  return {
    list: asyncHandler(async (req, res) => res.json({ parts: await partService.list() })),
    create: asyncHandler(async (req, res) => res.status(201).json({ part: await partService.create(req.body) })),
    restock: asyncHandler(async (req, res) => {
      const partId = req.params.id;
      const qty = req.body?.qty;
      return res.json({ part: await partService.restock(partId, { qty }) });
    }),
  };
}
