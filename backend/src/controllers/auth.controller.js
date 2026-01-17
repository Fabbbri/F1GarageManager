import { asyncHandler } from "../utils/asyncHandler.js";
import { env } from "../config/env.js";

export function makeAuthController(authService) {
  return {
    signup: asyncHandler(async (req, res) => {
      const { name, email, password, role } = req.body;
      const result = await authService.signup({ name, email, password, role });

      await new Promise((resolve, reject) => {
        req.session.regenerate((err) => (err ? reject(err) : resolve()));
      });
      req.session.auth = { userId: result.user.id, role: result.user.role };

      res.status(201).json(result);
    }),

    login: asyncHandler(async (req, res) => {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });

      await new Promise((resolve, reject) => {
        req.session.regenerate((err) => (err ? reject(err) : resolve()));
      });
      req.session.auth = { userId: result.user.id, role: result.user.role };

      res.json(result);
    }),

    logout: asyncHandler(async (req, res) => {
      const cookieOptions = {
        httpOnly: true,
        secure: Boolean(env.session.cookieSecure),
        sameSite: env.session.cookieSameSite,
      };

      await new Promise((resolve) => {
        if (!req.session) return resolve();
        req.session.destroy(() => resolve());
      });

      res.clearCookie(env.session.cookieName, cookieOptions);
      res.json({ ok: true });
    }),

    me: asyncHandler(async (req, res) => {
      const user = await authService.me(req.auth.userId);
      res.json({ user });
    }),
  };
}
