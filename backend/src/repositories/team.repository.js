export class TeamRepository {
  async list() { throw new Error("Not implemented"); }
  async findById(id) { throw new Error("Not implemented"); }
  async create(team) { throw new Error("Not implemented"); }
  async update(id, patch) { throw new Error("Not implemented"); }
  // Operations used by business rules
  async setBudget(teamId, { total, spent }) { throw new Error("Not implemented"); }
  async addSponsor(teamId, sponsor) { throw new Error("Not implemented"); }
  async removeSponsor(teamId, sponsorId) { throw new Error("Not implemented"); }
  async addDriver(teamId, driver) { throw new Error("Not implemented"); }
  async removeDriver(teamId, driverId) { throw new Error("Not implemented"); }
  async addCar(teamId, car) { throw new Error("Not implemented"); }
  async removeCar(teamId, carId) { throw new Error("Not implemented"); }
  async addInventoryItem(teamId, item) { throw new Error("Not implemented"); }
  async removeInventoryItem(teamId, itemId) { throw new Error("Not implemented"); }
  async remove(id) { throw new Error("Not implemented"); }
}
