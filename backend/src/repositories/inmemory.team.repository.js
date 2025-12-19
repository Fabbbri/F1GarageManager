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

    const sponsors = [sponsor, ...(existing.sponsors || [])];
    const total = sponsors.reduce((sum, s) => sum + Number(s.contribution || 0), 0);

    const next = {
      ...existing,
      sponsors,
      budget: {
        ...(existing.budget || {}),
        total,
      },
      updatedAt: new Date().toISOString(),
    };

    this.byId.set(teamId, next);
    return next;
  }

  async addContribution(teamId, contribution) {
    const existing = await this.findById(teamId);
    if (!existing) return null;

    const contributions = [contribution, ...(existing.contributions || [])];
    const total = contributions.reduce((sum, c) => sum + Number(c.amount || 0), 0);

    const next = {
      ...existing,
      contributions,
      budget: {
        ...(existing.budget || {}),
        total,
      },
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

  async addDriverResult(teamId, driverId, result) {
    const existing = await this.findById(teamId);
    if (!existing) return null;

    const drivers = existing.drivers || [];
    const idx = drivers.findIndex(d => d.id === driverId);
    if (idx < 0) return null;

    const driver = drivers[idx];
    const nextDriver = {
      ...driver,
      results: [result, ...((driver.results || []))],
    };

    const nextDrivers = [...drivers];
    nextDrivers[idx] = nextDriver;

    const next = {
      ...existing,
      drivers: nextDrivers,
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

  async upsertInventoryFromPurchase(teamId, { partId, partName, category, qty, unitCost, performance }) {
    const existing = await this.findById(teamId);
    if (!existing) return null;

    const inventory = existing.inventory || [];
    const idx = inventory.findIndex(i => i.partId && partId && i.partId === partId);

    let nextInventory;
    if (idx >= 0) {
      const current = inventory[idx];
      const updatedItem = {
        ...current,
        qty: Number(current.qty || 0) + Number(qty || 0),
        unitCost: unitCost !== undefined ? Number(unitCost) : Number(current.unitCost || 0),
        performance: performance !== undefined ? performance : current.performance,
      };
      nextInventory = [...inventory];
      nextInventory[idx] = updatedItem;
    } else {
      const item = {
        id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
        partId,
        partName,
        category: category || "",
        qty: Number(qty || 0),
        unitCost: Number(unitCost || 0),
        performance,
      };
      nextInventory = [item, ...inventory];
    }

    const next = {
      ...existing,
      inventory: nextInventory,
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
