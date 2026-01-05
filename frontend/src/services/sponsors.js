const API_URL = process.env.REACT_APP_API_URL;
const TOKEN_KEY = "auth_token";

function headers() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Error");
  return data;
}

export async function listSponsors() {
  return await handle(await fetch(`${API_URL}/sponsors`, { headers: headers() }));
}

export async function getSponsor(id) {
  return await handle(await fetch(`${API_URL}/sponsors/${id}`, { headers: headers() }));
}

export async function createSponsor(sponsor) {
  return await handle(await fetch(`${API_URL}/sponsors`, { method: "POST", headers: headers(), body: JSON.stringify(sponsor) }));
}

export async function updateSponsor(id, sponsor) {
  return await handle(await fetch(`${API_URL}/sponsors/${id}`, { method: "PUT", headers: headers(), body: JSON.stringify(sponsor) }));
}

export async function deleteSponsor(id) {
  return await handle(await fetch(`${API_URL}/sponsors/${id}`, { method: "DELETE", headers: headers() }));
}