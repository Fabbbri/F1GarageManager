import crypto from "crypto";

export class PartService {
  constructor(partRepo) {
    this.partRepo = partRepo;
  }

  static allowedCategories() {
    return [
      "Power Unit",
      "Paquete aerodinámico",
      "Neumáticos",
      "Suspensión",
      "Caja de cambios",
    ];
  }

  async list() {
    return this.partRepo.list();
  }

  async create({ name, category, price, stock, performance }) {
    if (!name?.trim()) throw this._err(400, "Nombre de parte requerido.");

    const cat = String(category || "").trim();
    if (!cat) throw this._err(400, "Categoría requerida.");
    if (!PartService.allowedCategories().includes(cat)) {
      throw this._err(400, "Categoría inválida. Debe ser una de las 5 categorías obligatorias.");
    }

    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) throw this._err(400, "Precio inválido.");

    const numericStock = Number(stock);
    if (!Number.isInteger(numericStock) || numericStock < 0) throw this._err(400, "Stock inválido.");

    const perf = performance || {};
    const p = Number(perf.p);
    const a = Number(perf.a);
    const m = Number(perf.m);
    if (!Number.isInteger(p) || p < 0 || p > 9) throw this._err(400, "Rendimiento inválido: p debe ser entero 0-9.");
    if (!Number.isInteger(a) || a < 0 || a > 9) throw this._err(400, "Rendimiento inválido: a debe ser entero 0-9.");
    if (!Number.isInteger(m) || m < 0 || m > 9) throw this._err(400, "Rendimiento inválido: m debe ser entero 0-9.");

    const normalizedPerf = { p, a, m };

    const part = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(globalThis.crypto?.randomUUID?.() || Date.now()),
      name: name.trim(),
      category: cat,
      price: numericPrice,
      stock: numericStock,
      performance: normalizedPerf,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.partRepo.create(part);
  }

  async restock(partId, { qty }) {
    const id = String(partId || "").trim();
    if (!id) throw this._err(400, "partId requerido.");

    const nQty = Number(qty);
    if (!Number.isInteger(nQty) || nQty <= 0) throw this._err(400, "Cantidad inválida.");

    const updated = await this.partRepo.incrementStock(id, nQty);
    if (!updated) throw this._err(404, "Parte no encontrada.");
    return updated;
  }

  _err(status, message) {
    const e = new Error(message);
    e.status = status;
    return e;
  }
}
