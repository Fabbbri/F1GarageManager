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

export async function listEngineers() {
  return await handle(
    await fetch(`${API_URL}/users?role=ENGINEER&unassigned=1`, { headers: headers() })
  );
}

export async function listEngineersAvailable() {
  return await handle(
    await fetch(`${API_URL}/users/engineers/available`, { headers: headers() })
  );
}
export async function listDriversAvailable() {
  return await handle(
    await fetch(`${API_URL}/users/drivers/available`, { headers: headers() })
  );
}
