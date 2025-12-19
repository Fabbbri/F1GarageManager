import { PartRepository } from "./part.repository.js";

export class InMemoryPartRepository extends PartRepository {
  constructor(seedParts = []) {
    super();
    this.byId = new Map();
    seedParts.forEach((p) => this.byId.set(p.id, p));
  }

  async list() {
    return Array.from(this.byId.values());
  }

  async findById(id) {
    return this.byId.get(id) || null;
  }

  async create(part) {
    this.byId.set(part.id, part);
    return part;
  }

  async decrementStock(id, qty) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const nextStock = Number(existing.stock || 0) - Number(qty || 0);
    if (nextStock < 0) return null;

    const next = { ...existing, stock: nextStock, updatedAt: new Date().toISOString() };
    this.byId.set(id, next);
    return next;
  }

  async incrementStock(id, qty) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const nextStock = Number(existing.stock || 0) + Number(qty || 0);
    if (nextStock < 0) return null;

    const next = { ...existing, stock: nextStock, updatedAt: new Date().toISOString() };
    this.byId.set(id, next);
    return next;
  }
}
