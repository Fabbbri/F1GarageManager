import { hashPassword, verifyPassword } from "./password.service.js";
import { signToken } from "./token.service.js";

export class AuthService {
  constructor(userRepo) {
    this.userRepo = userRepo;
  }

  async signup({ name, email, password, role }) {
    const existing = await this.userRepo.findByEmail(email);
    if (existing) throw this._err(409, "Ese correo ya está registrado.");

    const passwordHash = await hashPassword(password);

    const uuid = globalThis.crypto?.randomUUID?.();
    if (!uuid) throw this._err(500, "No se pudo generar un ID seguro.");

    const user = {
      id: uuid,
      name,
      email,
      passwordHash,
      role,
      createdAt: new Date().toISOString(),
    };

    await this.userRepo.create(user);

    const safeUser = this._safeUser(user);
    const token = signToken({ sub: safeUser.id, role: safeUser.role });

    return { user: safeUser, token };
  }

  async login({ email, password }) {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw this._err(401, "Credenciales inválidas.");

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw this._err(401, "Credenciales inválidas.");

    const safeUser = this._safeUser(user);
    const token = signToken({ sub: safeUser.id, role: safeUser.role });

    return { user: safeUser, token };
  }

  async me(userId) {
    const user = await this.userRepo.findById(userId);
    if (!user) throw this._err(401, "Sesión inválida.");
    return this._safeUser(user);
  }

  _safeUser(user) {
    const { passwordHash, ...rest } = user;
    return rest;
  }

  _err(status, message) {
    const e = new Error(message);
    e.status = status;
    return e;
  }
}
