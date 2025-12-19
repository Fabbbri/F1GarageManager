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

export async function listTeams() {
  return (await handle(await fetch(`${API_URL}/teams`, { headers: headers() }))).teams;
}

export async function createTeam(payload) {
  return (await handle(await fetch(`${API_URL}/teams`, { method: "POST", headers: headers(), body: JSON.stringify(payload) }))).team;
}

export async function updateTeam(id, payload) {
  return (await handle(await fetch(`${API_URL}/teams/${id}`, { method: "PUT", headers: headers(), body: JSON.stringify(payload) }))).team;
}

export async function getTeam(id) {
  return (await handle(await fetch(`${API_URL}/teams/${id}`, { headers: headers() }))).team;
}

export async function patchBudget(id, payload) {
  return (await handle(await fetch(`${API_URL}/teams/${id}/budget`, { method: "PATCH", headers: headers(), body: JSON.stringify(payload) }))).team;
}

export async function addSponsor(id, payload) {
  return (await handle(await fetch(`${API_URL}/teams/${id}/sponsors`, { method: "POST", headers: headers(), body: JSON.stringify(payload) }))).team;
}
export async function deleteSponsor(teamId, sponsorId) {
  return (await handle(await fetch(`${API_URL}/teams/${teamId}/sponsors/${sponsorId}`, { method: "DELETE", headers: headers() }))).team;
}

export async function addCar(id, payload) {
  return (await handle(await fetch(`${API_URL}/teams/${id}/cars`, { method: "POST", headers: headers(), body: JSON.stringify(payload) }))).team;
}
export async function deleteCar(teamId, carId) {
  return (await handle(await fetch(`${API_URL}/teams/${teamId}/cars/${carId}`, { method: "DELETE", headers: headers() }))).team;
}

export async function addDriver(id, payload) {
  return (await handle(await fetch(`${API_URL}/teams/${id}/drivers`, { method: "POST", headers: headers(), body: JSON.stringify(payload) }))).team;
}
export async function deleteDriver(teamId, driverId) {
  return (await handle(await fetch(`${API_URL}/teams/${teamId}/drivers/${driverId}`, { method: "DELETE", headers: headers() }))).team;
}

export async function addInventoryItem(id, payload) {
  return (await handle(await fetch(`${API_URL}/teams/${id}/inventory`, { method: "POST", headers: headers(), body: JSON.stringify(payload) }))).team;
}
export async function deleteInventoryItem(teamId, itemId) {
  return (await handle(await fetch(`${API_URL}/teams/${teamId}/inventory/${itemId}`, { method: "DELETE", headers: headers() }))).team;
}

export async function addContribution(teamId, payload) {
  return (await handle(await fetch(`${API_URL}/teams/${teamId}/contributions`, { method: "POST", headers: headers(), body: JSON.stringify(payload) }))).team;
}

export async function addDriverResult(teamId, driverId, payload) {
  return (await handle(await fetch(`${API_URL}/teams/${teamId}/drivers/${driverId}/results`, { method: "POST", headers: headers(), body: JSON.stringify(payload) }))).team;
}

export async function getDriverStats(teamId, driverId) {
  return (await handle(await fetch(`${API_URL}/teams/${teamId}/drivers/${driverId}/stats`, { headers: headers() }))).stats;
}

export async function purchasePart(teamId, payload) {
  return (await handle(await fetch(`${API_URL}/teams/${teamId}/store/purchase`, { method: "POST", headers: headers(), body: JSON.stringify(payload) }))).team;
}

export async function installPart(teamId, carId, payload) {
  return (await handle(await fetch(`${API_URL}/teams/${teamId}/cars/${carId}/install`, { method: "POST", headers: headers(), body: JSON.stringify(payload) }))).team;
}

export async function uninstallPart(teamId, carId, payload) {
  return (await handle(await fetch(`${API_URL}/teams/${teamId}/cars/${carId}/uninstall`, { method: "POST", headers: headers(), body: JSON.stringify(payload) }))).team;
}

export async function assignCarDriver(teamId, carId, payload) {
  return (await handle(await fetch(`${API_URL}/teams/${teamId}/cars/${carId}/assign-driver`, { method: "POST", headers: headers(), body: JSON.stringify(payload) }))).team;
}

export async function finalizeCar(teamId, carId) {
  return (await handle(await fetch(`${API_URL}/teams/${teamId}/cars/${carId}/finalize`, { method: "POST", headers: headers() }))).team;
}

export async function unfinalizeCar(teamId, carId) {
  return (await handle(await fetch(`${API_URL}/teams/${teamId}/cars/${carId}/unfinalize`, { method: "POST", headers: headers() }))).team;
}


export async function deleteTeam(id) {
  const res = await fetch(`${API_URL}/teams/${id}`, {
    method: "DELETE",
    headers: headers(),
  });

  if (res.status === 204) return true;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Error eliminando equipo");
  return true;
}
