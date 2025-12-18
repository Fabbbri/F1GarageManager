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
    await this.getById(id);

    const updated = await this.teamRepo.setBudget(id, {
      total: total !== undefined ? Number(total) : undefined,
      spent: spent !== undefined ? Number(spent) : undefined,
    });

    if (!updated) throw this._err(404, "Equipo no encontrado.");
    return updated;
  }

  // -------- Sponsors ----------
  async addSponsor(teamId, { name, contribution }) {
    await this.getById(teamId);
    if (!name?.trim()) throw this._err(400, "Nombre de patrocinador requerido.");

    const sponsor = {
      id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
      name: name.trim(),
      contribution: Number(contribution || 0),
    };

    const updated = await this.teamRepo.addSponsor(teamId, sponsor);
    if (!updated) throw this._err(404, "Equipo no encontrado.");
    return updated;
  }

  async removeSponsor(teamId, sponsorId) {
    await this.getById(teamId);
    const updated = await this.teamRepo.removeSponsor(teamId, sponsorId);
    if (!updated) throw this._err(404, "Patrocinador no encontrado.");
    return updated;
  }

  // -------- Drivers ----------
  async addDriver(teamId, { name, skill }) {
    await this.getById(teamId);
    if (!name?.trim()) throw this._err(400, "Nombre de conductor requerido.");

    const driver = {
      id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
      name: name.trim(),
      skill: Number(skill ?? 50),
    };

    const updated = await this.teamRepo.addDriver(teamId, driver);
    if (!updated) throw this._err(404, "Equipo no encontrado.");
    return updated;
  }

  async removeDriver(teamId, driverId) {
    await this.getById(teamId);
    const updated = await this.teamRepo.removeDriver(teamId, driverId);
    if (!updated) throw this._err(404, "Conductor no encontrado.");
    return updated;
  }

  // -------- Cars (MAX 2) ----------
  async addCar(teamId, { code, name }) {
    const team = await this.getById(teamId);

    if (team.cars.length >= 2) throw this._err(400, "Restricción: máximo 2 carros por equipo.");
    if (!code?.trim()) throw this._err(400, "Código del carro requerido.");

    const car = {
      id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
      code: code.trim(),
      name: (name || "").trim(),
    };

    const updated = await this.teamRepo.addCar(teamId, car);
    if (!updated) throw this._err(404, "Equipo no encontrado.");
    return updated;
  }

  async removeCar(teamId, carId) {
    await this.getById(teamId);
    const updated = await this.teamRepo.removeCar(teamId, carId);
    if (!updated) throw this._err(404, "Carro no encontrado.");
    return updated;
  }

  // -------- Inventory ----------
  async addInventoryItem(teamId, { partName, category, qty, unitCost }) {
    await this.getById(teamId);
    if (!partName?.trim()) throw this._err(400, "Nombre de parte requerido.");

    const item = {
      id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
      partName: partName.trim(),
      category: (category || "").trim(),
      qty: Number(qty ?? 0),
      unitCost: Number(unitCost ?? 0),
    };

    const updated = await this.teamRepo.addInventoryItem(teamId, item);
    if (!updated) throw this._err(404, "Equipo no encontrado.");
    return updated;
  }

  async removeInventoryItem(teamId, itemId) {
    await this.getById(teamId);
    const updated = await this.teamRepo.removeInventoryItem(teamId, itemId);
    if (!updated) throw this._err(404, "Ítem de inventario no encontrado.");
    return updated;
  }

  _err(status, message) {
    const e = new Error(message);
    e.status = status;
    return e;
  }
}
