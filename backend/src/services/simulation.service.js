export class SimulationService {
  constructor(simRepo) {
    this.simRepo = simRepo;
  }

  async listResults({ trackId, driverUserId, simulationId, top }) {
    return await this.simRepo.listResults({ trackId, driverUserId, simulationId, top });
  }

  async create({ trackId, participants }) {
    if (!trackId) throw this._err(400, "trackId requerido.");
    if (!Array.isArray(participants) || participants.length < 3) {
      throw this._err(400, "Mínimo 3 participantes.");
    }
    // solo crea header (sin matemática)
    return await this.simRepo.create({ trackId, participants });
  }

  _err(status, message) {
    const e = new Error(message);
    e.status = status;
    return e;
  }
}
