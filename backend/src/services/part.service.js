export class PartService {
  constructor(partRepo) {
    this.partRepo = partRepo;
  }

  async list() {
    return this.partRepo.list();
  }

  async create({ name, category, price, stock, performance }) {
    if (!name?.trim()) throw this._err(400, "Nombre de parte requerido.");

    const numericPrice = Number(price);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) throw this._err(400, "Precio inválido.");

    const numericStock = Number(stock);
    if (!Number.isInteger(numericStock) || numericStock < 0) throw this._err(400, "Stock inválido.");

    const perf = performance || {};
    const normalizedPerf = {
      speed: perf.speed !== undefined ? Number(perf.speed) : 0,
      handling: perf.handling !== undefined ? Number(perf.handling) : 0,
      reliability: perf.reliability !== undefined ? Number(perf.reliability) : 0,
    };

    const part = {
      id: globalThis.crypto?.randomUUID?.() || String(Date.now()),
      name: name.trim(),
      category: (category || "").trim(),
      price: numericPrice,
      stock: numericStock,
      performance: normalizedPerf,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.partRepo.create(part);
  }

  _err(status, message) {
    const e = new Error(message);
    e.status = status;
    return e;
  }
}
