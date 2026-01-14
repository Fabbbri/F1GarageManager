import { asyncHandler } from "../utils/asyncHandler.js";

export function makeUserController(userService) {
  return {
    list: asyncHandler(async (req, res) => {
    const role = req.query.role;
    const unassigned = String(req.query.unassigned || "") === "1";
    const users = await userService.list({ role, unassigned });
    res.json({ users });
    }),
    listEngineersAvailable: asyncHandler(async (req, res) => {
      const users = await userService.listEngineersAvailable();
      res.json({ users });
    }),
  };
}
