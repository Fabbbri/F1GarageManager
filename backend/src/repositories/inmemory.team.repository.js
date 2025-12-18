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

  async setBudget(teamId, { total, spent }) {
    const existing = await this.findById(teamId);
    if (!existing) return null;

    const next = {
      ...existing,
      budget: {
        total: total !== undefined ? Number(total) : Number(existing.budget?.total ?? 0),
        spent: spent !== undefined ? Number(spent) : Number(existing.budget?.spent ?? 0),
      },
      updatedAt: new Date().toISOString(),
    };

    this.byId.set(teamId, next);
    return next;
  }

  async addSponsor(teamId, sponsor) {
    const existing = await this.findById(teamId);
    if (!existing) return null;

    const next = {
      ...existing,
      sponsors: [sponsor, ...(existing.sponsors || [])],
      updatedAt: new Date().toISOString(),
    };

    this.byId.set(teamId, next);
    return next;
  }

  async removeSponsor(teamId, sponsorId) {
    const existing = await this.findById(teamId);
    if (!existing) return null;

    const nextSponsors = (existing.sponsors || []).filter(s => s.id !== sponsorId);
    if (nextSponsors.length === (existing.sponsors || []).length) return null;

    const next = { ...existing, sponsors: nextSponsors, updatedAt: new Date().toISOString() };
    this.byId.set(teamId, next);
    return next;
  }

  async addDriver(teamId, driver) {
    const existing = await this.findById(teamId);
    if (!existing) return null;

    const next = {
      ...existing,
      drivers: [driver, ...(existing.drivers || [])],
      updatedAt: new Date().toISOString(),
    };

    this.byId.set(teamId, next);
    return next;
  }

  async removeDriver(teamId, driverId) {
    const existing = await this.findById(teamId);
    if (!existing) return null;

    const nextDrivers = (existing.drivers || []).filter(d => d.id !== driverId);
    if (nextDrivers.length === (existing.drivers || []).length) return null;

    const next = { ...existing, drivers: nextDrivers, updatedAt: new Date().toISOString() };
    this.byId.set(teamId, next);
    return next;
  }

  async addCar(teamId, car) {
    const existing = await this.findById(teamId);
    if (!existing) return null;

    const next = {
      ...existing,
      cars: [car, ...(existing.cars || [])],
      updatedAt: new Date().toISOString(),
    };

    this.byId.set(teamId, next);
    return next;
  }

  async removeCar(teamId, carId) {
    const existing = await this.findById(teamId);
    if (!existing) return null;

    const nextCars = (existing.cars || []).filter(c => c.id !== carId);
    if (nextCars.length === (existing.cars || []).length) return null;

    const next = { ...existing, cars: nextCars, updatedAt: new Date().toISOString() };
    this.byId.set(teamId, next);
    return next;
  }

  async addInventoryItem(teamId, item) {
    const existing = await this.findById(teamId);
    if (!existing) return null;

    const next = {
      ...existing,
      inventory: [item, ...(existing.inventory || [])],
      updatedAt: new Date().toISOString(),
    };

    this.byId.set(teamId, next);
    return next;
  }

  async removeInventoryItem(teamId, itemId) {
    const existing = await this.findById(teamId);
    if (!existing) return null;

    const nextInv = (existing.inventory || []).filter(i => i.id !== itemId);
    if (nextInv.length === (existing.inventory || []).length) return null;

    const next = { ...existing, inventory: nextInv, updatedAt: new Date().toISOString() };
    this.byId.set(teamId, next);
    return next;
  }

  async remove(id) { return this.byId.delete(id); }
}
