export class TeamService {
  constructor(teamRepo, partRepo = null) {
    this.teamRepo = teamRepo;
    this.partRepo = partRepo;
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
      contributions: [],
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
    // Regla clave (6.4): el presupuesto se calcula únicamente a partir de aportes.
    // Mantenemos el endpoint por compatibilidad pero no permitimos mutarlo manualmente.
    throw this._err(400, "El presupuesto se calcula únicamente a partir de aportes registrados.");
  }

  // -------- Sponsors ----------
  async addSponsor(teamId, { name, contribution, description }) {
    await this.getById(teamId);
    if (!name?.trim()) throw this._err(400, "Nombre de patrocinador requerido.");

    const numericContribution = Number(contribution || 0);
    if (!Number.isFinite(numericContribution) || numericContribution < 0) {
      throw this._err(400, "Contribución inválida.");
    }

    const sponsor = {
      id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
      name: name.trim(),
      contribution: numericContribution,
      description: (description || "").trim(),
      createdAt: new Date().toISOString(),
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

  // -------- Contributions (Budget source) ----------
  async addContribution(teamId, { sponsorId, date, amount, description }) {
    const team = await this.getById(teamId);

    if (!sponsorId) throw this._err(400, "sponsorId requerido.");
    const sponsor = (team.sponsors || []).find(s => s.id === String(sponsorId));
    if (!sponsor) throw this._err(400, "Patrocinador inválido.");

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw this._err(400, "Monto inválido.");

    const d = new Date(date);
    if (!date || Number.isNaN(d.getTime())) throw this._err(400, "Fecha inválida.");

    const contribution = {
      id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
      sponsorId: sponsor.id,
      sponsorName: sponsor.name,
      date: d.toISOString(),
      amount: numericAmount,
      description: (description || "").trim(),
    };

    const updated = await this.teamRepo.addContribution(teamId, contribution);
    if (!updated) throw this._err(404, "Equipo no encontrado.");
    return updated;
  }

  // -------- Drivers ----------
  async addDriver(teamId, { name, skill }) {
    await this.getById(teamId);
    if (!name?.trim()) throw this._err(400, "Nombre de conductor requerido.");

    const numericSkill = Number(skill ?? 50);
    if (!Number.isInteger(numericSkill) || numericSkill < 0 || numericSkill > 100) {
      throw this._err(400, "Habilidad inválida: debe ser un entero entre 0 y 100.");
    }

    const driver = {
      id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
      name: name.trim(),
      skill: numericSkill,
      results: [],
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

  async addDriverResult(teamId, driverId, { date, race, position, points }) {
    const team = await this.getById(teamId);
    const driver = (team.drivers || []).find(d => d.id === String(driverId));
    if (!driver) throw this._err(404, "Conductor no encontrado.");

    const d = new Date(date);
    if (!date || Number.isNaN(d.getTime())) throw this._err(400, "Fecha inválida.");
    if (!race?.trim()) throw this._err(400, "Carrera requerida.");

    const pos = Number(position);
    if (!Number.isInteger(pos) || pos <= 0) throw this._err(400, "Posición inválida.");

    const pts = Number(points);
    if (!Number.isFinite(pts) || pts < 0) throw this._err(400, "Puntos inválidos.");

    const result = {
      id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
      date: d.toISOString(),
      race: race.trim(),
      position: pos,
      points: pts,
    };

    const updated = await this.teamRepo.addDriverResult(teamId, String(driverId), result);
    if (!updated) throw this._err(404, "Equipo o conductor no encontrado.");
    return updated;
  }

  async getDriverStats(teamId, driverId) {
    const team = await this.getById(teamId);
    const driver = (team.drivers || []).find(d => d.id === String(driverId));
    if (!driver) throw this._err(404, "Conductor no encontrado.");

    const results = driver.results || [];
    const races = results.length;
    const avgPosition = races ? results.reduce((s, r) => s + Number(r.position || 0), 0) / races : 0;
    const avgPoints = races ? results.reduce((s, r) => s + Number(r.points || 0), 0) / races : 0;

    return {
      driverId: driver.id,
      races,
      avgPosition,
      avgPoints,
      bestPosition: races ? Math.min(...results.map(r => Number(r.position || Infinity))) : null,
      totalPoints: results.reduce((s, r) => s + Number(r.points || 0), 0),
    };
  }

  // -------- Store purchase ----------
  async purchasePart(teamId, { partId, qty }) {
    if (!this.partRepo) throw this._err(500, "Catálogo de partes no configurado.");
    await this.getById(teamId);

    if (!partId) throw this._err(400, "partId requerido.");
    const nQty = Number(qty);
    if (!Number.isInteger(nQty) || nQty <= 0) throw this._err(400, "Cantidad inválida.");

    const part = await this.partRepo.findById(String(partId));
    if (!part) throw this._err(404, "Parte no encontrada.");
    if (Number(part.stock || 0) < nQty) throw this._err(400, "Stock insuficiente.");

    await this.partRepo.decrementStock(String(partId), nQty);

    const updated = await this.teamRepo.upsertInventoryFromPurchase(teamId, {
      partId: part.id,
      partName: part.name,
      category: part.category,
      qty: nQty,
      unitCost: part.price,
      performance: part.performance,
    });
    if (!updated) throw this._err(404, "Equipo no encontrado.");
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
