import { asyncHandler } from "../utils/asyncHandler.js";

export function makeAuthController(authService) {
  return {
    signup: asyncHandler(async (req, res) => {
      const { name, email, password, role } = req.body;
      const result = await authService.signup({ name, email, password, role });
      res.status(201).json(result);
    }),

    login: asyncHandler(async (req, res) => {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });
      res.json(result);
    }),

    me: asyncHandler(async (req, res) => {
      const user = await authService.me(req.auth.userId);
      res.json({ user });
    }),
  };
}
