import { TeamRepository } from "./team.repository.js";

export class InMemoryTeamRepository extends TeamRepository {
  constructor(seedTeams = []) {
    super();
    this.byId = new Map();
    seedTeams.forEach(t => this.byId.set(t.id, t));
  }

  async list() { return Array.from(this.byId.values()); }
  async findById(id) { return this.byId.get(id) || null; }

  async create(team) { this.byId.set(team.id, team); return team; }

  async update(id, patch) {
    const existing = await this.findById(id);
    if (!existing) return null;
    const updated = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
    this.byId.set(id, updated);
    return updated;
  }

  async replace(id, team) {
    const existing = await this.findById(id);
    if (!existing) return null;
    this.byId.set(id, team);
    return team;
  }

  async remove(id) { return this.byId.delete(id); }
}
