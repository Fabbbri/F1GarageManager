export function makeAdminService(adminRepository) {
  return {
    async getGrafanaLinks() {
      const links = await adminRepository.getGrafanaLinks();
      return [...links].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    },
  };
}
