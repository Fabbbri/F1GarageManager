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

export async function listTeams() {
  const res = await handle(
    await fetch(`${API_URL}/teams`, { headers: headers(), credentials: "include" })
  );
  return res.teams || [];
}

export async function createTeam(payload) {
  return (
    await handle(
      await fetch(`${API_URL}/teams`, {
        method: "POST",
        headers: headers(),
        credentials: "include",
        body: JSON.stringify(payload),
      })
    )
  ).team;
}

export async function updateTeam(id, payload) {
  return (
    await handle(
      await fetch(`${API_URL}/teams/${id}`, {
        method: "PUT",
        headers: headers(),
        credentials: "include",
        body: JSON.stringify(payload),
      })
    )
  ).team;
}

export async function getTeam(id) {
  return (
    await handle(
      await fetch(`${API_URL}/teams/${id}`, { headers: headers(), credentials: "include" })
    )
  ).team;
}

export async function patchBudget(id, payload) {
  return (
    await handle(
      await fetch(`${API_URL}/teams/${id}/budget`, {
        method: "PATCH",
        headers: headers(),
        credentials: "include",
        body: JSON.stringify(payload),
      })
    )
  ).team;
}

export async function addSponsor(id, payload) {
  return (
    await handle(
      await fetch(`${API_URL}/teams/${id}/sponsors`, {
        method: "POST",
        headers: headers(),
        credentials: "include",
        body: JSON.stringify(payload),
      })
    )
  ).team;
}
export async function deleteSponsor(teamId, sponsorId) {
  return (
    await handle(
      await fetch(`${API_URL}/teams/${teamId}/sponsors/${sponsorId}`, {
        method: "DELETE",
        headers: headers(),
        credentials: "include",
      })
    )
  ).team;
}

export async function addCar(id, payload) {
  return (
    await handle(
      await fetch(`${API_URL}/teams/${id}/cars`, {
        method: "POST",
        headers: headers(),
        credentials: "include",
        body: JSON.stringify(payload),
      })
    )
  ).team;
}
export async function deleteCar(teamId, carId) {
  return (
    await handle(
      await fetch(`${API_URL}/teams/${teamId}/cars/${carId}`, {
        method: "DELETE",
        headers: headers(),
        credentials: "include",
      })
    )
  ).team;
}

export async function addDriver(id, payload) {
  return (
    await handle(
      await fetch(`${API_URL}/teams/${id}/drivers`, {
        method: "POST",
        headers: headers(),
        credentials: "include",
        body: JSON.stringify(payload),
      })
    )
  ).team;
}
export async function deleteDriver(teamId, driverId) {
  return (
    await handle(
      await fetch(`${API_URL}/teams/${teamId}/drivers/${driverId}`, {
        method: "DELETE",
        headers: headers(),
        credentials: "include",
      })
    )
  ).team;
}

export async function addInventoryItem(id, payload) {
  return (
    await handle(
      await fetch(`${API_URL}/teams/${id}/inventory`, {
        method: "POST",
        headers: headers(),
        credentials: "include",
        body: JSON.stringify(payload),
      })
    )
  ).team;
}
export async function deleteInventoryItem(teamId, itemId) {
  return (
    await handle(
      await fetch(`${API_URL}/teams/${teamId}/inventory/${itemId}`, {
        method: "DELETE",
        headers: headers(),
        credentials: "include",
      })
    )
  ).team;
}

export async function addContribution(teamId, payload) {
  return (
    await handle(
      await fetch(`${API_URL}/teams/${teamId}/contributions`, {
        method: "POST",
        headers: headers(),
        credentials: "include",
        body: JSON.stringify(payload),
      })
    )
  ).team;
}

export async function addDriverResult(teamId, driverId, payload) {
  return (
    await handle(
      await fetch(`${API_URL}/teams/${teamId}/drivers/${driverId}/results`, {
        method: "POST",
        headers: headers(),
        credentials: "include",
        body: JSON.stringify(payload),
      })
    )
  ).team;
}

export async function getDriverStats(teamId, driverId) {
  return (
    await handle(
      await fetch(`${API_URL}/teams/${teamId}/drivers/${driverId}/stats`, {
        headers: headers(),
        credentials: "include",
      })
    )
  ).stats;
}

export async function purchasePart(teamId, payload) {
  return (
    await handle(
      await fetch(`${API_URL}/teams/${teamId}/store/purchase`, {
        method: "POST",
        headers: headers(),
        credentials: "include",
        body: JSON.stringify(payload),
      })
    )
  ).team;
}

export async function installPart(teamId, carId, payload) {
  return (
    await handle(
      await fetch(`${API_URL}/teams/${teamId}/cars/${carId}/install`, {
        method: "POST",
        headers: headers(),
        credentials: "include",
        body: JSON.stringify(payload),
      })
    )
  ).team;
}

export async function uninstallPart(teamId, carId, payload) {
  return (
    await handle(
      await fetch(`${API_URL}/teams/${teamId}/cars/${carId}/uninstall`, {
        method: "POST",
        headers: headers(),
        credentials: "include",
        body: JSON.stringify(payload),
      })
    )
  ).team;
}

export async function assignCarDriver(teamId, carId, payload) {
  return (
    await handle(
      await fetch(`${API_URL}/teams/${teamId}/cars/${carId}/assign-driver`, {
        method: "POST",
        headers: headers(),
        credentials: "include",
        body: JSON.stringify(payload),
      })
    )
  ).team;
}

export async function finalizeCar(teamId, carId) {
  return (
    await handle(
      await fetch(`${API_URL}/teams/${teamId}/cars/${carId}/finalize`, {
        method: "POST",
        headers: headers(),
        credentials: "include",
      })
    )
  ).team;
}

export async function unfinalizeCar(teamId, carId) {
  return (
    await handle(
      await fetch(`${API_URL}/teams/${teamId}/cars/${carId}/unfinalize`, {
        method: "POST",
        headers: headers(),
        credentials: "include",
      })
    )
  ).team;
}


export async function deleteTeam(id) {
  const res = await fetch(`${API_URL}/teams/${id}`, {
    method: "DELETE",
    headers: headers(),
    credentials: "include",
  });

  if (res.status === 401) {
    await serverLogout();
    window.location.assign("/login");
    throw new Error("Sesión expirada. Iniciá sesión nuevamente.");
  }

  if (res.status === 204) return true;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Error eliminando equipo");
  return true;
}

export async function assignEngineer(teamId, userId) {
  return await handle(
    await fetch(`${API_URL}/teams/${teamId}/engineer`, {
      method: "POST",
      headers: headers(),
      credentials: "include",
      body: JSON.stringify({ userId }),
    })
  );
}

export async function listEngineers() {
  return await handle(
    await fetch(`${API_URL}/users?role=ENGINEER`, { headers: headers(), credentials: "include" })
  );
}

export async function listTeamEngineers(teamId) {
  return await handle(
    await fetch(`${API_URL}/teams/${teamId}/engineers`, {
      headers: headers(),
      credentials: "include",
    })
  );
}

export async function unassignEngineer(teamId, userId) {
  return await handle(
    await fetch(`${API_URL}/teams/${teamId}/engineers/${userId}`, {
      method: "DELETE",
      headers: headers(),
      credentials: "include",
    })
  );
}

export async function updateDriverSkill(teamId, driverId, skill) {
  return await handle(
    await fetch(`${API_URL}/teams/${teamId}/drivers/${driverId}/skill`, {
      method: "PUT",
      headers: headers(),
      credentials: "include",
      body: JSON.stringify({ skill }),
    })
  );
}

