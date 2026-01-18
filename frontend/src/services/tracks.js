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

export async function listTracks({ onlyActive = true } = {}) {
  const qs = new URLSearchParams();
  qs.set("onlyActive", onlyActive ? "1" : "0");

  return await handle(
    await fetch(`${API_URL}/tracks?${qs.toString()}`, {
      headers: headers(),
      credentials: "include",
    })
  );
}

export async function createTrack(track) {
  return await handle(
    await fetch(`${API_URL}/tracks`, {
      method: "POST",
      headers: headers(),
      credentials: "include",
      body: JSON.stringify(track),
    })
  );
}

export async function softDeleteTrack(id) {
  return await handle(
    await fetch(`${API_URL}/tracks/${id}`, {
      method: "DELETE",
      headers: headers(),
      credentials: "include",
    })
  );
}
