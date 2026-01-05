import { asyncHandler } from "../utils/asyncHandler.js";

export function makeUserController(userService) {
  return {
    list: asyncHandler(async (req, res) => {
      const role = req.query.role;
      const users = await userService.list({ role });
      res.json({ users });
    }),
  };
}
