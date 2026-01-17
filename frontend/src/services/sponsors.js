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

export async function listSponsors() {
  return await handle(
    await fetch(`${API_URL}/sponsors`, { headers: headers(), credentials: "include" })
  );
}

export async function getSponsor(id) {
  return await handle(
    await fetch(`${API_URL}/sponsors/${id}`, { headers: headers(), credentials: "include" })
  );
}

export async function createSponsor(sponsor) {
  return await handle(
    await fetch(`${API_URL}/sponsors`, {
      method: "POST",
      headers: headers(),
      credentials: "include",
      body: JSON.stringify(sponsor),
    })
  );
}

export async function updateSponsor(id, sponsor) {
  return await handle(
    await fetch(`${API_URL}/sponsors/${id}`, {
      method: "PUT",
      headers: headers(),
      credentials: "include",
      body: JSON.stringify(sponsor),
    })
  );
}

export async function deleteSponsor(id) {
  return await handle(
    await fetch(`${API_URL}/sponsors/${id}`, {
      method: "DELETE",
      headers: headers(),
      credentials: "include",
    })
  );
}