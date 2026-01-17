import { hashPassword, verifyPassword } from "./password.service.js";
import { signToken } from "./token.service.js";
import { env } from "../config/env.js";

export class AuthService {
  constructor(userRepo) {
    this.userRepo = userRepo;
  }

  _normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
  }

  _validateSignupInput({ name, email, password, role }) {
    const cleanName = String(name || "").trim();
    if (cleanName.length < 2 || cleanName.length > 120) {
      throw this._err(400, "Nombre inválido (2-120 caracteres).");
    }

    const cleanEmail = this._normalizeEmail(email);
    // Practical email validation (avoid over-strict RFC regex)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 320) {
      throw this._err(400, "Correo inválido.");
    }

    const cleanRole = String(role || "").toUpperCase();
    if (!cleanRole || !["ADMIN", "ENGINEER", "DRIVER"].includes(cleanRole)) {
      throw this._err(400, "Rol inválido. Debe ser ADMIN, ENGINEER o DRIVER.");
    }

    this._validatePassword({ password, email: cleanEmail, name: cleanName });

    return { name: cleanName, email: cleanEmail, role: cleanRole };
  }

  _validatePassword({ password, email, name }) {
    const pwd = String(password || "");
    if (pwd.length < 12 || pwd.length > 128) {
      throw this._err(400, "La contraseña debe tener entre 12 y 128 caracteres.");
    }
    if (/\s/.test(pwd)) {
      throw this._err(400, "La contraseña no puede contener espacios.");
    }

    const hasLower = /[a-z]/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasDigit = /\d/.test(pwd);
    const hasSymbol = /[^A-Za-z0-9]/.test(pwd);

    const score = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
    if (score < 3) {
      throw this._err(
        400,
        "Contraseña débil. Debe incluir al menos 3 de: mayúsculas, minúsculas, números y símbolos."
      );
    }

    const emailLocal = String(email || "").split("@")[0] || "";
    const lowerPwd = pwd.toLowerCase();
    if (emailLocal && emailLocal.length >= 3 && lowerPwd.includes(emailLocal.toLowerCase())) {
      throw this._err(400, "La contraseña no debe contener partes de tu correo.");
    }
    const nameParts = String(name || "")
      .toLowerCase()
      .split(/\s+/)
      .filter((p) => p.length >= 3);
    if (nameParts.some((p) => lowerPwd.includes(p))) {
      throw this._err(400, "La contraseña no debe contener tu nombre.");
    }

    const banned = new Set([
      "password",
      "password123",
      "123456789",
      "12345678",
      "qwerty",
      "admin",
      "letmein",
    ]);
    if (banned.has(lowerPwd)) {
      throw this._err(400, "Contraseña demasiado común. Elegí otra.");
    }
  }

  async signup({ name, email, password, role }) {
    const normalized = this._validateSignupInput({ name, email, password, role });

    const existing = await this.userRepo.findByEmail(normalized.email);
    if (existing) throw this._err(409, "Ese correo ya está registrado.");

    const passwordHash = await hashPassword(password);

    const uuid = globalThis.crypto?.randomUUID?.();
    if (!uuid) throw this._err(500, "No se pudo generar un ID seguro.");

    const user = {
      id: uuid,
      name: normalized.name,
      email: normalized.email,
      passwordHash,
      role: normalized.role,
      createdAt: new Date().toISOString(),
    };

    await this.userRepo.create(user);

    const safeUser = this._safeUser(user);
    const token = signToken({ sub: safeUser.id, role: safeUser.role });

    return { user: safeUser, token };
  }

  async login({ email, password }) {
    const normalizedEmail = this._normalizeEmail(email);
    const user = await this.userRepo.findByEmail(normalizedEmail);
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
