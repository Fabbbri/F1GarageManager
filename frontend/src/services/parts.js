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

export async function listParts() {
  return (
    await handle(
      await fetch(`${API_URL}/parts`, { headers: headers(), credentials: "include" })
    )
  ).parts;
}

export async function createPart(payload) {
  return (
    await handle(
      await fetch(`${API_URL}/parts`, {
        method: "POST",
        headers: headers(),
        credentials: "include",
        body: JSON.stringify(payload),
      })
    )
  ).part;
}

export async function restockPart(partId, payload) {
  return (
    await handle(
      await fetch(`${API_URL}/parts/${partId}/restock`, {
        method: "POST",
        headers: headers(),
        credentials: "include",
        body: JSON.stringify(payload),
      })
    )
  ).part;
}
