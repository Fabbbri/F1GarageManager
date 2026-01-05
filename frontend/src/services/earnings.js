const API_URL = process.env.REACT_APP_API_URL;
const TOKEN_KEY = "auth_token";

console.log("earnings.js loaded. API_URL =", API_URL);

function headers() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Error");
  return data;
}

// export “de prueba” para confirmar que sí se está exportando
export const EARNINGS_PROBE = "ok";

// named export
export async function createEarning(teamId, payload) {
  return await handle(
    await fetch(`${API_URL}/teams/${teamId}/earnings`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    })
  );
}

// también export default, por si tu bundler se pone raro
export default createEarning;
