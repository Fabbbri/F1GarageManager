import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../services/auth";
import { listTeams, getTeam } from "../services/teams";
import { listParts } from "../services/parts";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  Divider,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";

const REQUIRED_CATEGORIES = [
  "Power Unit",
  "Paquete aerodinámico",
  "Neumáticos",
  "Suspensión",
  "Caja de cambios",
];

function fmtMoney(n) {
  const v = Number(n || 0);
  return Number.isFinite(v) ? v.toLocaleString() : "0";
}

function sumPerf(parts = []) {
  return (parts || []).reduce(
    (acc, p) => {
      const perf = p?.performance || {};
      acc.p += Number(perf.p || 0);
      acc.a += Number(perf.a || 0);
      acc.m += Number(perf.m || 0);
      return acc;
    },
    { p: 0, a: 0, m: 0 }
  );
}

function pickRelevantCar(team) {
  const cars = team?.cars || [];
  if (!cars.length) return null;
  return cars.find((c) => !c.isFinalized) || cars.find((c) => c.isFinalized) || cars[0];
}

function topInventory(items = [], limit = 5) {
  return (items || [])
    .filter((it) => Number(it?.qty || 0) > 0)
    .slice()
    .sort((a, b) => Number(b?.qty || 0) - Number(a?.qty || 0))
    .slice(0, limit);
}

function topInventoryGlobal(teams = [], limit = 5) {
  const byKey = new Map();
  for (const t of teams || []) {
    for (const it of t?.inventory || []) {
      const key = String(it?.partId || it?.partName || it?.id || "");
      if (!key) continue;
      const prev = byKey.get(key) || { partName: it?.partName || "Parte", category: it?.category || "", qty: 0 };
      prev.qty += Number(it?.qty || 0);
      byKey.set(key, prev);
    }
  }
  return Array.from(byKey.values())
    .filter((x) => Number(x.qty || 0) > 0)
    .sort((a, b) => Number(b.qty || 0) - Number(a.qty || 0))
    .slice(0, limit);
}

export default function Dashboard() {
  const session = getSession();
  const navigate = useNavigate();

  const role = session?.role || "—";
  const isAdmin = useMemo(() => role === "ADMIN", [role]);
  const isEngineer = useMemo(() => role === "ENGINEER", [role]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [teams, setTeams] = useState([]);
  const [teamDetails, setTeamDetails] = useState([]);
  const [parts, setParts] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        if (!(isAdmin || isEngineer)) return;

        const [tList, pList] = await Promise.all([listTeams(), listParts()]);
        if (!alive) return;
        setTeams(tList);
        setParts(pList);

        // For assembly/inventory metrics we need team details.
        const details = await Promise.all((tList || []).map((t) => getTeam(t.id)));
        if (!alive) return;
        setTeamDetails(details);
      } catch (e) {
        if (!alive) return;
        setError(e.message || "Error cargando dashboard");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [isAdmin, isEngineer]);

  useEffect(() => {
    if (!selectedTeamId && teams.length) setSelectedTeamId(teams[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teams]);

  // -------- Admin/Engineer aggregate metrics --------
  const teamsCount = teams.length;
  const budgetTotal = teamDetails.reduce((s, t) => s + Number(t?.budget?.total || 0), 0);
  const budgetSpent = teamDetails.reduce((s, t) => s + Number(t?.budget?.spent || 0), 0);
  const budgetAvailable = budgetTotal - budgetSpent;

  const outOfStockParts = useMemo(
    () => (parts || []).filter((p) => Number(p?.stock || 0) <= 0),
    [parts]
  );

  const inventoryQtyTotal = teamDetails.reduce(
    (s, t) => s + (t?.inventory || []).reduce((x, it) => x + Number(it?.qty || 0), 0),
    0
  );

  const carsFinalized = teamDetails.reduce(
    (s, t) => s + (t?.cars || []).filter((c) => c?.isFinalized).length,
    0
  );
  const carsInProgress = teamDetails.reduce(
    (s, t) => s + (t?.cars || []).filter((c) => !c?.isFinalized).length,
    0
  );

  const missingByCategory = useMemo(() => {
    const counts = Object.fromEntries(REQUIRED_CATEGORIES.map((c) => [c, 0]));

    for (const t of teamDetails) {
      const car = pickRelevantCar(t);
      if (!car) {
        REQUIRED_CATEGORIES.forEach((c) => (counts[c] += 1));
        continue;
      }
      const installed = new Set((car.installedParts || []).map((p) => String(p.category || "").trim()).filter(Boolean));
      for (const cat of REQUIRED_CATEGORIES) {
        if (!installed.has(cat)) counts[cat] += 1;
      }
    }

    return counts;
  }, [teamDetails]);

  // -------- Engineer selected team --------
  const selectedTeam = useMemo(
    () => teamDetails.find((t) => String(t.id) === String(selectedTeamId)) || null,
    [teamDetails, selectedTeamId]
  );
  const selectedCar = useMemo(() => pickRelevantCar(selectedTeam), [selectedTeam]);
  const selectedInstalledCats = useMemo(() => {
    const cats = new Set(
      (selectedCar?.installedParts || [])
        .map((p) => String(p.category || "").trim())
        .filter(Boolean)
    );
    return cats;
  }, [selectedCar]);
  const selectedMissingCats = useMemo(
    () => REQUIRED_CATEGORIES.filter((c) => !selectedInstalledCats.has(c)),
    [selectedInstalledCats]
  );
  const selectedTop5 = useMemo(() => topInventory(selectedTeam?.inventory || [], 5), [selectedTeam]);
  const globalTop5 = useMemo(() => topInventoryGlobal(teamDetails, 5), [teamDetails]);
  const selectedInstalledCount = Number(selectedCar?.installedParts?.length || 0);

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <Stack spacing={2.5}>
        <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ xs: "flex-start", sm: "center" }} spacing={1}>
          <Typography variant="h4" fontWeight={900} sx={{ flex: 1 }}>
            Dashboard
          </Typography>
          <Chip label={role} />
        </Stack>

        <Typography color="text.secondary">
          Sesión: <b>{session?.name}</b> • {session?.email}
        </Typography>

        {error ? <Alert severity="error">{error}</Alert> : null}
        {loading ? <Typography color="text.secondary">Cargando...</Typography> : null}

        {!loading && !error && !(isAdmin || isEngineer) ? (
          <Alert severity="info">
            Dashboard para este rol: próximamente.
          </Alert>
        ) : null}

        {!loading && !error && (isAdmin || isEngineer) ? (
          <>
            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Typography color="text.secondary" variant="body2">Equipos</Typography>
                  <Typography variant="h5" fontWeight={900}>{teamsCount}</Typography>
                </CardContent>
              </Card>

              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Typography color="text.secondary" variant="body2">Presupuesto total</Typography>
                  <Typography variant="h5" fontWeight={900}>{fmtMoney(budgetTotal)}</Typography>
                </CardContent>
              </Card>

              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Typography color="text.secondary" variant="body2">Disponible global</Typography>
                  <Typography variant="h5" fontWeight={900}>{fmtMoney(budgetAvailable)}</Typography>
                  <Typography variant="body2" color="text.secondary">Gastado: {fmtMoney(budgetSpent)}</Typography>
                </CardContent>
              </Card>

              <Card sx={{ flex: 1 }}>
                <CardContent>
                  <Typography color="text.secondary" variant="body2">Inventario (qty)</Typography>
                  <Typography variant="h5" fontWeight={900}>{fmtMoney(inventoryQtyTotal)}</Typography>
                </CardContent>
              </Card>

              {isAdmin ? (
                <Card sx={{ flex: 1 }}>
                  <CardContent>
                    <Typography color="text.secondary" variant="body2">Catálogo sin stock</Typography>
                    <Typography variant="h5" fontWeight={900}>{outOfStockParts.length}</Typography>
                  </CardContent>
                </Card>
              ) : null}
            </Stack>

            <Card>
              <CardContent>
                <Typography fontWeight={900} sx={{ mb: 1 }}>Acciones rápidas</Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Button variant="contained" onClick={() => navigate("/teams")}>Equipos</Button>
                  <Button variant="contained" onClick={() => navigate("/assembly")}>Armado</Button>
                  <Button variant="contained" onClick={() => navigate("/store")}>Tienda</Button>
                </Stack>
              </CardContent>
            </Card>

            {isEngineer ? (
              <Card>
                <CardContent>
                  <Typography fontWeight={900} sx={{ mb: 1 }}>ENGINEER • Operación</Typography>

                  <Typography fontWeight={800} sx={{ mb: 0.5 }}>Estado de armado</Typography>
                  <Typography color="text.secondary" sx={{ mb: 1 }}>
                    Carros finalizados: <b>{carsFinalized}</b> • En progreso: <b>{carsInProgress}</b>
                  </Typography>

                  <Typography fontWeight={800} sx={{ mb: 1 }}>Faltantes por categoría (equipos)</Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ flexWrap: "wrap" }}>
                    {REQUIRED_CATEGORIES.map((c) => (
                      <Chip key={c} label={`${c}: ${missingByCategory[c] ?? 0}`} />
                    ))}
                  </Stack>

                  <Divider sx={{ my: 2 }} />

                  <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: { md: "center" } }}>
                    <Typography fontWeight={800} sx={{ minWidth: 220 }}>Inventario</Typography>
                    <FormControl fullWidth>
                      <InputLabel id="dash-team-select">Equipo</InputLabel>
                      <Select
                        labelId="dash-team-select"
                        label="Equipo"
                        value={selectedTeamId}
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                      >
                        {teams.map((t) => (
                          <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>

                  <Typography color="text.secondary" sx={{ mt: 1 }}>
                    Instalados actualmente (carro seleccionado): <b>{selectedInstalledCount}</b>
                  </Typography>

                  <Divider sx={{ my: 1.5 }} />

                  <Typography fontWeight={800} sx={{ mb: 1 }}>
                    Top 5 items con más stock {selectedTeam ? `• ${selectedTeam.name}` : ""}
                  </Typography>

                  {(selectedTop5 || []).length ? (
                    <Stack spacing={1}>
                      {selectedTop5.map((it) => (
                        <Typography key={it.id} color="text.secondary">
                          • {it.partName} (qty: {it.qty})
                        </Typography>
                      ))}
                    </Stack>
                  ) : (
                    <Typography color="text.secondary">Sin inventario con stock. (Global top 5 disponible abajo)</Typography>
                  )}

                  <Divider sx={{ my: 1.5 }} />

                  <Typography fontWeight={800} sx={{ mb: 1 }}>Top 5 global (todos los equipos)</Typography>
                  {(globalTop5 || []).length ? (
                    <Stack spacing={1}>
                      {globalTop5.map((it, idx) => (
                        <Typography key={`${it.partName}-${idx}`} color="text.secondary">
                          • {it.partName} (qty: {it.qty})
                        </Typography>
                      ))}
                    </Stack>
                  ) : (
                    <Typography color="text.secondary">No hay inventario global aún.</Typography>
                  )}

                  <Divider sx={{ my: 2 }} />

                  <Typography fontWeight={800} sx={{ mb: 1 }}>Checklist</Typography>
                  {!selectedTeam ? (
                    <Typography color="text.secondary">Selecciona un equipo para ver el checklist.</Typography>
                  ) : !selectedCar ? (
                    <Alert severity="info">Este equipo no tiene carros todavía.</Alert>
                  ) : selectedCar.isFinalized ? (
                    <Alert severity="success">Carro finalizado. No hay faltantes.</Alert>
                  ) : selectedMissingCats.length ? (
                    <Alert severity="warning">
                      Para finalizar un carro te falta: <b>{selectedMissingCats.join(", ")}</b>
                    </Alert>
                  ) : (
                    <Alert severity="success">Listo para finalizar: todas las categorías están instaladas.</Alert>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {isAdmin ? (
              <Card>
                <CardContent>
                  <Typography fontWeight={900} sx={{ mb: 1 }}>Alertas</Typography>
                  {outOfStockParts.length ? (
                    <Alert severity="warning">
                      Hay {outOfStockParts.length} partes en stock 0. Podés re-stockearlas en Tienda.
                    </Alert>
                  ) : (
                    <Alert severity="success">No hay partes en stock 0.</Alert>
                  )}

                  {outOfStockParts.length ? (
                    <Stack spacing={1} sx={{ mt: 2 }}>
                      {(outOfStockParts || []).slice(0, 5).map((p) => (
                        <Typography key={p.id} color="text.secondary">• {p.name}</Typography>
                      ))}
                    </Stack>
                  ) : null}
                </CardContent>
              </Card>
            ) : null}
          </>
        ) : null}
      </Stack>
    </Box>
  );
}
