// "Contrato" que deben cumplir todos los repositorios (memoria hoy, BD mañana)
export class UserRepository {
  async findByEmail(email) { throw new Error("Not implemented"); }
  async findById(id) { throw new Error("Not implemented"); }
  async create(user) { throw new Error("Not implemented"); }
  async list() { throw new Error("Not implemented"); }
}
