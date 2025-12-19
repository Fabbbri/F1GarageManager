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

export async function listParts() {
  return (await handle(await fetch(`${API_URL}/parts`, { headers: headers() }))).parts;
}

export async function createPart(payload) {
  return (await handle(await fetch(`${API_URL}/parts`, { method: "POST", headers: headers(), body: JSON.stringify(payload) }))).part;
}
