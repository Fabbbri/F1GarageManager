import { serverLogout } from "./auth";

const API_URL = process.env.REACT_APP_API_URL;

function headers() {
  return { "Content-Type": "application/json" };
}

async function handle(res) {
  if (res.status === 401) {
    await serverLogout();
    window.location.assign("/login");
    throw new Error("Sesión expirada. Iniciá sesión nuevamente.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Error");
  return data;
}

// GET /simulations/results?trackId=&driverUserId=&simulationId=&top=
export async function listSimulationResults({
  trackId,
  driverUserId,
  simulationId,
  top = 200,
} = {}) {
  const qs = new URLSearchParams();
  if (trackId) qs.set("trackId", trackId);
  if (driverUserId) qs.set("driverUserId", driverUserId);
  if (simulationId) qs.set("simulationId", simulationId);
  qs.set("top", String(top));

  return await handle(
    await fetch(`${API_URL}/simulations/results?${qs.toString()}`, {
      headers: headers(),
      credentials: "include",
    })
  );
}

// GET /simulations/my/results?trackId=&simulationId=&top=
export async function listMySimulationResults({ trackId, simulationId, top = 200 } = {}) {
  const qs = new URLSearchParams();
  if (trackId) qs.set("trackId", trackId);
  if (simulationId) qs.set("simulationId", simulationId);
  qs.set("top", String(top));

  return await handle(
    await fetch(`${API_URL}/simulations/my/results?${qs.toString()}`, {
      headers: headers(),
      credentials: "include",
    })
  );
}

// POST /simulations  (aunque el botón esté deshabilitado)
export async function createSimulation(payload) {
  return await handle(
    await fetch(`${API_URL}/simulations`, {
      method: "POST",
      headers: headers(),
      credentials: "include",
      body: JSON.stringify(payload),
    })
  );
}
