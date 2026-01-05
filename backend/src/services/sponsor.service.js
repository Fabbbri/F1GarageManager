import * as repo from '../repositories/sqlserver.sponsor.repository.js';

export class SponsorService {
  constructor(sponsorRepository) {
    this.repo = sponsorRepository;
  }

  async listSponsors() {
    return this.repo.getAllSponsors();
  }

  async getSponsor(id) {
    const sponsor = await this.repo.getSponsorById(id);
    if (!sponsor) throw this._err(404, 'Sponsor no encontrado.');
    return sponsor;
  }

  async addSponsor({ nombre, fecha }) {
    if (!nombre?.trim()) throw this._err(400, 'Nombre de sponsor requerido.');

    const sponsor = {
      nombre: nombre.trim(),
      fecha: fecha || new Date().toISOString().split('T')[0],
    };

    return this.repo.createSponsor(sponsor);
  }

  async editSponsor(id, { nombre, fecha }) {
    await this.getSponsor(id); // Verifica que exista

    const patch = {};
    if (nombre !== undefined) patch.nombre = String(nombre).trim();
    if (fecha !== undefined) patch.fecha = String(fecha).trim();

    const updated = await this.repo.updateSponsor(id, patch);
    if (!updated) throw this._err(404, 'Sponsor no encontrado.');
    return updated;
  }

  async removeSponsor(id) {
    await this.getSponsor(id); // Verifica que exista
    const ok = await this.repo.deleteSponsor(id);
    if (!ok) throw this._err(404, 'Sponsor no encontrado.');
    return true;
  }

  _err(status, message) {
    const e = new Error(message);
    e.status = status;
    return e;
  }
}