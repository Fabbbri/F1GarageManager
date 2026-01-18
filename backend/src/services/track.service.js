export class TrackService {
  constructor(trackRepo) {
    this.trackRepo = trackRepo;
  }

  async list({ onlyActive }) {
    return await this.trackRepo.list({ onlyActive });
  }

  async create({ name, distanceKm, curves }) {
    if (!name || !String(name).trim()) throw this._err(400, "Nombre requerido.");
    const dist = Number(distanceKm);
    const c = Number(curves);
    if (!Number.isFinite(dist) || dist <= 0) throw this._err(400, "Distancia inválida.");
    if (!Number.isInteger(c) || c < 0) throw this._err(400, "Curvas inválidas.");
    return await this.trackRepo.create({ name: String(name).trim(), distanceKm: dist, curves: c });
  }

  async softDelete(id) {
    return await this.trackRepo.softDelete(id);
  }

  _err(status, message) {
    const e = new Error(message);
    e.status = status;
    return e;
  }
}
