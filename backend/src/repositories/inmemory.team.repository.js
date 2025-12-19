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

    const nextCar = {
      ...car,
      driverId: car.driverId ?? null,
      isFinalized: Boolean(car.isFinalized ?? false),
      installedParts: car.installedParts || [],
    };

    const next = {
      ...existing,
      cars: [nextCar, ...(existing.cars || [])],
      updatedAt: new Date().toISOString(),
    };

    this.byId.set(teamId, next);
    return next;
  }

  async removeCar(teamId, carId) {
    const existing = await this.findById(teamId);
    if (!existing) return null;

    const cars = existing.cars || [];
    const car = cars.find(c => c.id === carId);
    if (!car) return null;

    // Si el carro tiene partes instaladas, se devuelven al inventario.
    const installed = car.installedParts || [];
    let nextInventory = existing.inventory || [];
    if (installed.length) {
      nextInventory = [...nextInventory];
      for (const p of installed) {
        const idx = nextInventory.findIndex(i => i.id === String(p.inventoryItemId));
        if (idx >= 0) {
          nextInventory[idx] = {
            ...nextInventory[idx],
            qty: Number(nextInventory[idx].qty || 0) + 1,
          };
        }
      }
    }

    const nextCars = cars.filter(c => c.id !== carId);

    const next = { ...existing, cars: nextCars, updatedAt: new Date().toISOString() };
    if (installed.length) next.inventory = nextInventory;
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

    const totalCost = Number(unitCost || 0) * Number(qty || 0);
    const budget = existing.budget || { total: 0, spent: 0 };
    const nextBudget = {
      total: Number(budget.total || 0),
      spent: Number(budget.spent || 0) + (Number.isFinite(totalCost) ? totalCost : 0),
    };

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
        acquiredAt: new Date().toISOString(),
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
        acquiredAt: new Date().toISOString(),
      };
      nextInventory = [item, ...inventory];
    }

    const next = {
      ...existing,
      budget: nextBudget,
      inventory: nextInventory,
      updatedAt: new Date().toISOString(),
    };

    this.byId.set(teamId, next);
    return next;
  }

  async installPart(teamId, { carId, inventoryItemId }) {
    const existing = await this.findById(teamId);
    if (!existing) return null;

    const cars = existing.cars || [];
    const carIdx = cars.findIndex(c => c.id === String(carId));
    if (carIdx < 0) return null;
    const car = cars[carIdx];

    const inventory = existing.inventory || [];
    const invIdx = inventory.findIndex(i => i.id === String(inventoryItemId));
    if (invIdx < 0) return null;

    const inv = inventory[invIdx];
    const currentQty = Number(inv.qty || 0);
    if (!Number.isInteger(currentQty) || currentQty <= 0) return null;

    const categoryKey = String(inv.category || "").trim();
    const installedParts = car.installedParts || [];
    const existingInstalledIdx = installedParts.findIndex(p => String(p.categoryKey) === categoryKey);

    let nextInventory = [...inventory];
    let nextInstalledParts = [...installedParts];

    // Reemplazo: devolver la vieja al inventario
    if (existingInstalledIdx >= 0) {
      const old = nextInstalledParts[existingInstalledIdx];
      const oldInvIdx = nextInventory.findIndex(i => i.id === String(old.inventoryItemId));
      if (oldInvIdx >= 0) {
        nextInventory[oldInvIdx] = {
          ...nextInventory[oldInvIdx],
          qty: Number(nextInventory[oldInvIdx].qty || 0) + 1,
        };
      }
      nextInstalledParts.splice(existingInstalledIdx, 1);
    }

    // Consumir stock
    nextInventory[invIdx] = {
      ...nextInventory[invIdx],
      qty: currentQty - 1,
    };

    const installed = {
      id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
      inventoryItemId: String(inv.id),
      partName: inv.partName,
      category: inv.category || "",
      categoryKey,
      p: Number(inv.performance?.p ?? 0),
      a: Number(inv.performance?.a ?? 0),
      m: Number(inv.performance?.m ?? 0),
      installedAt: new Date().toISOString(),
    };
    nextInstalledParts.unshift(installed);

    const nextCars = [...cars];
    nextCars[carIdx] = { ...car, installedParts: nextInstalledParts, isFinalized: false };

    const next = {
      ...existing,
      cars: nextCars,
      inventory: nextInventory,
      updatedAt: new Date().toISOString(),
    };

    this.byId.set(teamId, next);
    return next;
  }

  async uninstallPart(teamId, { carId, installedPartId }) {
    const existing = await this.findById(teamId);
    if (!existing) return null;

    const cars = existing.cars || [];
    const carIdx = cars.findIndex(c => c.id === String(carId));
    if (carIdx < 0) return null;
    const car = cars[carIdx];

    const installedParts = car.installedParts || [];
    const idx = installedParts.findIndex(p => p.id === String(installedPartId));
    if (idx < 0) return null;

    const removed = installedParts[idx];
    const nextInstalledParts = [...installedParts];
    nextInstalledParts.splice(idx, 1);

    const inventory = existing.inventory || [];
    const invIdx = inventory.findIndex(i => i.id === String(removed.inventoryItemId));
    if (invIdx < 0) return null;

    const nextInventory = [...inventory];
    nextInventory[invIdx] = {
      ...nextInventory[invIdx],
      qty: Number(nextInventory[invIdx].qty || 0) + 1,
    };

    const nextCars = [...cars];
    nextCars[carIdx] = { ...car, installedParts: nextInstalledParts, isFinalized: false };

    const next = {
      ...existing,
      cars: nextCars,
      inventory: nextInventory,
      updatedAt: new Date().toISOString(),
    };
    this.byId.set(teamId, next);
    return next;
  }

  async assignCarDriver(teamId, { carId, driverId }) {
    const existing = await this.findById(teamId);
    if (!existing) return null;

    const cars = existing.cars || [];
    const carIdx = cars.findIndex(c => c.id === String(carId));
    if (carIdx < 0) return null;

    if (driverId !== null && driverId !== undefined && driverId !== "") {
      const ok = (existing.drivers || []).some(d => d.id === String(driverId));
      if (!ok) return null;
    }

    const nextCars = [...cars];
    nextCars[carIdx] = { ...cars[carIdx], driverId: driverId ? String(driverId) : null };

    const next = { ...existing, cars: nextCars, updatedAt: new Date().toISOString() };
    this.byId.set(teamId, next);
    return next;
  }

  async finalizeCar(teamId, { carId }) {
    const existing = await this.findById(teamId);
    if (!existing) return null;

    const cars = existing.cars || [];
    const carIdx = cars.findIndex(c => c.id === String(carId));
    if (carIdx < 0) return null;

    const car = cars[carIdx];
    if (!car.driverId) return null;
    const installed = car.installedParts || [];
    const required = [
      "Power Unit",
      "Paquete aerodinámico",
      "Neumáticos",
      "Suspensión",
      "Caja de cambios",
    ];

    const hasAll = required.every(cat => installed.some(p => String(p.categoryKey) === cat));
    if (!hasAll) return null;

    const nextCars = [...cars];
    nextCars[carIdx] = { ...car, isFinalized: true };
    const next = { ...existing, cars: nextCars, updatedAt: new Date().toISOString() };
    this.byId.set(teamId, next);
    return next;
  }

  async unfinalizeCar(teamId, { carId }) {
    const existing = await this.findById(teamId);
    if (!existing) return null;

    const cars = existing.cars || [];
    const carIdx = cars.findIndex(c => c.id === String(carId));
    if (carIdx < 0) return null;

    const car = cars[carIdx];
    const nextCars = [...cars];
    nextCars[carIdx] = { ...car, isFinalized: false };

    const next = { ...existing, cars: nextCars, updatedAt: new Date().toISOString() };
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
