import { UserRepository } from "./user.repository.js";

export class InMemoryUserRepository extends UserRepository {
  constructor(seedUsers = []) {
    super();
    this.byId = new Map();
    this.byEmail = new Map();

    seedUsers.forEach(u => this._insert(u));
  }

  _insert(user) {
    this.byId.set(user.id, user);
    this.byEmail.set(user.email.toLowerCase(), user);
  }

  async findByEmail(email) {
    return this.byEmail.get(email.toLowerCase()) || null;
  }

  async findById(id) {
    return this.byId.get(id) || null;
  }

  async create(user) {
    this._insert(user);
    return user;
  }

  async list() {
    return Array.from(this.byId.values());
  }
}
