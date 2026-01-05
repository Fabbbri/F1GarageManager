function normalizeContribution(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error("Contribución inválida");
  }
  return n;
}



export class TeamService {
  constructor(teamRepo, partRepo = null) {
    this.teamRepo = teamRepo;
    this.partRepo = partRepo;
  }

  static allowedPartCategories() {
    return [
      "Power Unit",
      "Paquete aerodinámico",
      "Neumáticos",
      "Suspensión",
      "Caja de cambios",
    ];
  }

  async addEarning({ teamId, sponsorId, contribution, description }) {
    const normalized = normalizeContribution(contribution);
    return await this.teamRepository.addEarning({
      teamId,
      sponsorId,
      contribution: normalized,
      description,
    });
  }

  async list(auth) {
    if (!auth?.userId) throw this._err(401, "No autenticado.");

    if (typeof this.teamRepo.listVisibleByUser === "function") {
      return await this.teamRepo.listVisibleByUser(auth.userId);
    }
    // fallback para repos en memoria
    return await this.teamRepo.list();
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

  async addContribution(teamId, { sponsorId, date, amount, description }) {
    // valida team exista (ok)
    await this.getById(teamId);

    // sponsorId debe ser int > 0
    console.log("RAW sponsorId:", sponsorId, "type:", typeof sponsorId);
    const sid = Number.parseInt(String(sponsorId), 10);
    console.log("PARSED sid:", sid, "isInteger:", Number.isInteger(sid));
    if (!Number.isInteger(sid) || sid <= 0) throw this._err(400, "Patrocinador inválido.");

    // monto entero >= 0 (o > 0 si preferís)
    const numericAmount = Number.parseInt(String(amount), 10);
    if (!Number.isInteger(numericAmount) || numericAmount < 0) throw this._err(400, "Monto inválido.");

    // fecha opcional (tu SP usa CreatedAt default, así que realmente no hace falta)
    // si querés validarla igual:
    if (date) {
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) throw this._err(400, "Fecha inválida.");
    }

    // ✅ aquí es donde se “conecta” con SQL Server
    // (Tu SP Team_AddEarning ya toma el nombre desde dbo.SPONSOR y usa CreatedAt default)
    return await this.teamRepo.addEarning(teamId, {
      sponsorId: sid,
      contribution: numericAmount,
      description: (description || "").trim() || null,
    });
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
    if (!partId) throw this._err(400, "partId requerido.");
    const nQty = Number(qty);
    if (!Number.isInteger(nQty) || nQty <= 0) throw this._err(400, "Cantidad inválida.");

    // Prefer atomic SQL transaction when available
    if (typeof this.teamRepo.purchasePartTx === "function") {
      try {
        const updated = await this.teamRepo.purchasePartTx(teamId, { partId: String(partId), qty: nQty });
        if (!updated) throw this._err(404, "Equipo no encontrado.");
        return updated;
      } catch (e) {
        const msg = String(e?.message || "").toLowerCase();
        if (msg.includes("stock insuficiente")) throw this._err(400, "Stock insuficiente.");
        if (msg.includes("presupuesto insuficiente")) throw this._err(400, "Presupuesto insuficiente.");
        if (msg.includes("parte no encontrada")) throw this._err(404, "Parte no encontrada.");
        if (msg.includes("cantidad inválida") || msg.includes("cantidad invalida")) throw this._err(400, "Cantidad inválida.");
        throw e;
      }
    }

    // Fallback (memory mode)
    if (!this.partRepo) throw this._err(500, "Catálogo de partes no configurado.");
    const team = await this.getById(teamId);

    const part = await this.partRepo.findById(String(partId));
    if (!part) throw this._err(404, "Parte no encontrada.");
    if (!TeamService.allowedPartCategories().includes(String(part.category || "").trim())) {
      throw this._err(400, "La parte tiene una categoría inválida (debe ser una de las 5 categorías obligatorias).");
    }
    if (Number(part.stock || 0) < nQty) throw this._err(400, "Stock insuficiente.");

    const unitCost = Number(part.price || 0);
    const totalCost = unitCost * nQty;
    const budgetTotal = Number(team.budget?.total ?? 0);
    const budgetSpent = Number(team.budget?.spent ?? 0);
    const remaining = budgetTotal - budgetSpent;
    if (!Number.isFinite(totalCost) || totalCost < 0) throw this._err(400, "Costo total inválido.");
    if (remaining < totalCost) throw this._err(400, `Presupuesto insuficiente. Disponible: ${remaining}. Costo: ${totalCost}.`);

    const dec = await this.partRepo.decrementStock(String(partId), nQty);
    if (!dec) throw this._err(400, "Stock insuficiente.");

    let updated;
    try {
      updated = await this.teamRepo.upsertInventoryFromPurchase(teamId, {
        partId: part.id,
        partName: part.name,
        category: part.category,
        qty: nQty,
        unitCost,
        performance: part.performance,
        acquiredAt: new Date().toISOString(),
      });
    } catch (e) {
      await this.partRepo.incrementStock?.(String(partId), nQty).catch(() => {});
      const msg = String(e?.message || "");
      if (msg.toLowerCase().includes("presupuesto")) throw this._err(400, msg);
      throw e;
    }
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
      acquiredAt: new Date().toISOString(),
    };

    const updated = await this.teamRepo.addInventoryItem(teamId, item);
    if (!updated) throw this._err(404, "Equipo no encontrado.");
    return updated;
  }

  async removeInventoryItem(teamId, itemId) {
    const team = await this.getById(teamId);

    const installedSomewhere = (team.cars || []).some((c) =>
      (c.installedParts || []).some((p) => String(p.inventoryItemId) === String(itemId))
    );
    if (installedSomewhere) throw this._err(400, "No podés eliminar una parte que está instalada en un carro.");

    const updated = await this.teamRepo.removeInventoryItem(teamId, itemId);
    if (!updated) throw this._err(404, "Ítem de inventario no encontrado.");
    return updated;
  }

  // -------- Assembly / Install rules (6.6) ----------
  async installPart(teamId, { carId, inventoryItemId }) {
    const team = await this.getById(teamId);
    if (!carId) throw this._err(400, "carId requerido.");
    if (!inventoryItemId) throw this._err(400, "inventoryItemId requerido.");

    const car = (team.cars || []).find((c) => c.id === String(carId));
    if (!car) throw this._err(404, "Carro no encontrado.");
    if (car.isFinalized) throw this._err(400, "El carro está finalizado. Usá 'Editar carro' para modificarlo.");

    const inv = (team.inventory || []).find((i) => i.id === String(inventoryItemId));
    if (!inv) throw this._err(404, "Ítem de inventario no encontrado.");
    if (!Number.isInteger(Number(inv.qty)) || Number(inv.qty) <= 0) throw this._err(400, "No hay stock en inventario para instalar.");

    const cat = String(inv.category || "").trim();
    if (!TeamService.allowedPartCategories().includes(cat)) {
      throw this._err(400, "Categoría inválida en inventario. Debe ser una de las 5 categorías obligatorias.");
    }

    // Regla de armado simple: 1 parte por categoría por carro.
    // Si ya existe una instalada en esa categoría, se reemplaza (desinstala + se devuelve al inventario).
    const updated = await this.teamRepo.installPart(teamId, {
      carId: String(carId),
      inventoryItemId: String(inventoryItemId),
    });
    if (!updated) throw this._err(404, "Equipo no encontrado.");
    return updated;
  }

  async uninstallPart(teamId, { carId, installedPartId }) {
    const team = await this.getById(teamId);
    if (!carId) throw this._err(400, "carId requerido.");
    if (!installedPartId) throw this._err(400, "installedPartId requerido.");

    const car = (team.cars || []).find((c) => c.id === String(carId));
    if (!car) throw this._err(404, "Carro no encontrado.");
    if (car.isFinalized) throw this._err(400, "El carro está finalizado. Usá 'Editar carro' para modificarlo.");

    const updated = await this.teamRepo.uninstallPart(teamId, {
      carId: String(carId),
      installedPartId: String(installedPartId),
    });
    if (!updated) throw this._err(404, "Parte instalada no encontrada.");
    return updated;
  }

  async assignCarDriver(teamId, { carId, driverId }) {
    const team = await this.getById(teamId);
    if (!carId) throw this._err(400, "carId requerido.");

    const car = (team.cars || []).find((c) => c.id === String(carId));
    if (!car) throw this._err(404, "Carro no encontrado.");
    if (car.isFinalized) throw this._err(400, "El carro está finalizado. Usá 'Editar carro' para modificarlo.");

    if (driverId !== null && driverId !== undefined && String(driverId) !== "") {
      const exists = (team.drivers || []).some((d) => d.id === String(driverId));
      if (!exists) throw this._err(404, "Conductor no encontrado.");
    }

    const updated = await this.teamRepo.assignCarDriver(teamId, {
      carId: String(carId),
      driverId: driverId ? String(driverId) : null,
    });
    if (!updated) throw this._err(404, "Equipo o carro no encontrado.");
    return updated;
  }

  async finalizeCar(teamId, { carId }) {
    const team = await this.getById(teamId);
    if (!carId) throw this._err(400, "carId requerido.");

    const car = (team.cars || []).find((c) => c.id === String(carId));
    if (!car) throw this._err(404, "Carro no encontrado.");

    if (!car.driverId) throw this._err(400, "Debe asignar un conductor antes de finalizar el carro.");

    const required = TeamService.allowedPartCategories();
    const installed = car.installedParts || [];
    const hasAll = required.every((cat) => installed.some((p) => String(p.categoryKey) === cat));
    if (!hasAll) throw this._err(400, "No se puede finalizar: el carro debe tener las 5 categorías obligatorias instaladas.");

    const updated = await this.teamRepo.finalizeCar(teamId, { carId: String(carId) });
    if (!updated) throw this._err(404, "Equipo o carro no encontrado.");
    return updated;
  }

  async unfinalizeCar(teamId, { carId }) {
    await this.getById(teamId);
    if (!carId) throw this._err(400, "carId requerido.");

    const updated = await this.teamRepo.unfinalizeCar(teamId, { carId: String(carId) });
    if (!updated) throw this._err(404, "Equipo o carro no encontrado.");
    return updated;
  }

  async assignEngineer(teamId, userId) {
    return await this.teamRepo.assignEngineer(teamId, userId); // ejecuta SP
  }

  

  _err(status, message) {
    const e = new Error(message);
    e.status = status;
    return e;
  }
}

