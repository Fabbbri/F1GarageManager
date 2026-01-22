import { asyncHandler } from "../utils/asyncHandler.js";

export function makeAdminController(adminService) {
  return {
    grafanaLinks: asyncHandler(async (_req, res) => {
      res.json({ links: await adminService.getGrafanaLinks() });
    }),
  };
}
