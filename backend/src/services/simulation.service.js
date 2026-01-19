import crypto from "crypto";
import { env } from "../config/env.js";

export class SimulationService {
  constructor(simRepo) {
    this.simRepo = simRepo;
  }

  async listResults({ trackId, driverUserId, simulationId, top }) {
    return await this.simRepo.listResults({ trackId, driverUserId, simulationId, top });
  }

  async create({ trackId, participants, createdByUserId = null }) {
    if (!trackId) throw this._err(400, "trackId requerido.");
    if (!Array.isArray(participants) || participants.length < 3) {
      throw this._err(400, "Mínimo 3 participantes.");
    }

    const unique = Array.from(new Set((participants || []).map((x) => String(x)))).filter(Boolean);
    if (unique.length < 3) throw this._err(400, "Mínimo 3 participantes (sin repetidos).");

    const curveDistanceKm = Number(env.curveDistanceKm ?? 0.3);
    if (!Number.isFinite(curveDistanceKm) || curveDistanceKm <= 0) {
      throw this._err(500, "Parámetro global CURVE_DISTANCE_KM inválido.");
    }

    const track = await this.simRepo.getActiveTrackById(trackId);
    if (!track) throw this._err(400, "Pista inválida o inactiva.");

    const D = Number(track.distanceKm);
    const C = Number(track.curves);
    const Dcurvas = C * curveDistanceKm;
    const Drectas = D - Dcurvas;
    if (Drectas < 0) {
      throw this._err(400, `Distancia insuficiente: D (${D}) < C*d_c (${Dcurvas.toFixed(3)}).`);
    }

    // Build computed results (validating each participant has a finalized car)
    const computed = [];
    for (const driverUserId of unique) {
      const snap = await this.simRepo.getParticipantSnapshot(driverUserId);
      if (!snap) {
        throw this._err(400, `Participante inválido: el driver ${driverUserId} no tiene carro finalizado.`);
      }
      if (Number(snap.requiredCount) !== 5) {
        throw this._err(400, `Carro incompleto para driver ${driverUserId}: faltan categorías obligatorias.`);
      }

      const P = Number(snap.totalP ?? 0);
      const A = Number(snap.totalA ?? 0);
      const M = Number(snap.totalM ?? 0);
      const H = Number(snap.skill ?? 0);

      // Fórmulas de la foto
      const vRecta = 200 + 3 * P + 0.2 * H - 1 * A;
      const vCurva = 90 + 2 * A + 2 * M + 0.2 * H;

      if (!Number.isFinite(vRecta) || vRecta <= 0) {
        throw this._err(400, `Velocidad recta inválida para driver ${driverUserId}.`);
      }
      if (!Number.isFinite(vCurva) || vCurva <= 0) {
        throw this._err(400, `Velocidad curva inválida para driver ${driverUserId}.`);
      }

      const penalty = (C * 40) / (1 + H / 100);
      const timeHours = (Drectas / vRecta) + (Dcurvas / vCurva);
      const timeSeconds = Math.round(timeHours * 3600 + penalty);

      const setupJson = JSON.stringify({
        track: { id: String(track.id), name: track.name, D, C, curveDistanceKm, Dcurvas, Drectas },
        driver: { userId: String(driverUserId), H },
        totals: { P, A, M },
        computed: { vRecta, vCurva, penaltySeconds: penalty, timeSeconds },
      });

      computed.push({
        id: crypto.randomUUID(),
        teamId: snap.teamId,
        driverUserId: String(driverUserId),
        carId: snap.carId,
        timeSeconds,
        totalP: Math.round(P),
        totalA: Math.round(A),
        totalM: Math.round(M),
        totalH: Math.round(H),
        vRecta: Number(vRecta.toFixed(2)),
        vCurva: Number(vCurva.toFixed(2)),
        penaltySeconds: Math.round(penalty),
        setupJson,
      });
    }

    const simulationId = crypto.randomUUID();
    return await this.simRepo.createWithResults({
      simulationId,
      trackId: String(trackId),
      createdByUserId,
      notes: null,
      results: computed,
    });
  }

  _err(status, message) {
    const e = new Error(message);
    e.status = status;
    return e;
  }
}
