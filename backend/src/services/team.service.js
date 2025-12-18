export class TeamService {
  constructor(teamRepo) {
    this.teamRepo = teamRepo;
  }

  async list() {
    return this.teamRepo.list();
  }

  async getById(id) {
    const team = await this.teamRepo.findById(id);
    if (!team) throw this._err(404, "Equipo no encontrado.");
    return team;
  }

  async create({ name, country }) {
    if (!name?.trim()) throw this._err(400, "Nombre requerido.");

    const team = {
      id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
      name: name.trim(),
      country: (country || "").trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),

      budget: { total: 0, spent: 0 },
      sponsors: [],
      inventory: [],
      cars: [],
      drivers: [],
    };

    return this.teamRepo.create(team);
  }

  async update(id, { name, country }) {
    const patch = {};
    if (name !== undefined) patch.name = String(name).trim();
    if (country !== undefined) patch.country = String(country).trim();

    const updated = await this.teamRepo.update(id, patch);
    if (!updated) throw this._err(404, "Equipo no encontrado.");
    return updated;
  }

  async remove(id) {
    const ok = await this.teamRepo.remove(id);
    if (!ok) throw this._err(404, "Equipo no encontrado.");
    return true;
  }

  // -------- Budget ----------
  async setBudget(id, { total, spent }) {
    const team = await this.getById(id);

    const next = {
      ...team,
      budget: {
        total: total !== undefined ? Number(total) : team.budget.total,
        spent: spent !== undefined ? Number(spent) : team.budget.spent,
      },
      updatedAt: new Date().toISOString(),
    };

    return this.teamRepo.replace(id, next);
  }

  // -------- Sponsors ----------
  async addSponsor(teamId, { name, contribution }) {
    const team = await this.getById(teamId);
    if (!name?.trim()) throw this._err(400, "Nombre de patrocinador requerido.");

    const sponsor = {
      id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
      name: name.trim(),
      contribution: Number(contribution || 0),
    };

    const next = {
      ...team,
      sponsors: [sponsor, ...team.sponsors],
      updatedAt: new Date().toISOString(),
    };

    return this.teamRepo.replace(teamId, next);
  }

  async removeSponsor(teamId, sponsorId) {
    const team = await this.getById(teamId);
    const before = team.sponsors.length;
    const sponsors = team.sponsors.filter(s => s.id !== sponsorId);
    if (sponsors.length === before) throw this._err(404, "Patrocinador no encontrado.");

    return this.teamRepo.replace(teamId, { ...team, sponsors, updatedAt: new Date().toISOString() });
  }

  // -------- Drivers ----------
  async addDriver(teamId, { name, skill }) {
    const team = await this.getById(teamId);
    if (!name?.trim()) throw this._err(400, "Nombre de conductor requerido.");

    const driver = {
      id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
      name: name.trim(),
      skill: Number(skill ?? 50),
    };

    return this.teamRepo.replace(teamId, {
      ...team,
      drivers: [driver, ...team.drivers],
      updatedAt: new Date().toISOString(),
    });
  }

  async removeDriver(teamId, driverId) {
    const team = await this.getById(teamId);
    const before = team.drivers.length;
    const drivers = team.drivers.filter(d => d.id !== driverId);
    if (drivers.length === before) throw this._err(404, "Conductor no encontrado.");

    return this.teamRepo.replace(teamId, { ...team, drivers, updatedAt: new Date().toISOString() });
  }

  // -------- Cars (MAX 2) ----------
  async addCar(teamId, { code, name }) {
    const team = await this.getById(teamId);

    if (team.cars.length >= 2) {
      throw this._err(400, "Restricción: máximo 2 carros por equipo.");
    }
    if (!code?.trim()) throw this._err(400, "Código del carro requerido.");

    const car = {
      id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
      code: code.trim(),
      name: (name || "").trim(),
    };

    return this.teamRepo.replace(teamId, {
      ...team,
      cars: [car, ...team.cars],
      updatedAt: new Date().toISOString(),
    });
  }

  async removeCar(teamId, carId) {
    const team = await this.getById(teamId);
    const before = team.cars.length;
    const cars = team.cars.filter(c => c.id !== carId);
    if (cars.length === before) throw this._err(404, "Carro no encontrado.");

    return this.teamRepo.replace(teamId, { ...team, cars, updatedAt: new Date().toISOString() });
  }

  // -------- Inventory ----------
  async addInventoryItem(teamId, { partName, category, qty, unitCost }) {
    const team = await this.getById(teamId);
    if (!partName?.trim()) throw this._err(400, "Nombre de parte requerido.");

    const item = {
      id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
      partName: partName.trim(),
      category: (category || "").trim(),
      qty: Number(qty ?? 0),
      unitCost: Number(unitCost ?? 0),
    };

    return this.teamRepo.replace(teamId, {
      ...team,
      inventory: [item, ...team.inventory],
      updatedAt: new Date().toISOString(),
    });
  }

  async removeInventoryItem(teamId, itemId) {
    const team = await this.getById(teamId);
    const before = team.inventory.length;
    const inventory = team.inventory.filter(i => i.id !== itemId);
    if (inventory.length === before) throw this._err(404, "Ítem de inventario no encontrado.");

    return this.teamRepo.replace(teamId, { ...team, inventory, updatedAt: new Date().toISOString() });
  }

  _err(status, message) {
    const e = new Error(message);
    e.status = status;
    return e;
  }
}
