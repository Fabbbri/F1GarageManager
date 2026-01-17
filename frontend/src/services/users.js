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

export async function listEngineers() {
  return await handle(
    await fetch(`${API_URL}/users?role=ENGINEER&unassigned=1`, {
      headers: headers(),
      credentials: "include",
    })
  );
}

export async function listEngineersAvailable() {
  return await handle(
    await fetch(`${API_URL}/users/engineers/available`, {
      headers: headers(),
      credentials: "include",
    })
  );
}
export async function listDriversAvailable() {
  return await handle(
    await fetch(`${API_URL}/users/drivers/available`, {
      headers: headers(),
      credentials: "include",
    })
  );
}
