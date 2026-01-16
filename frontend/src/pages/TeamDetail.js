import React, { useEffect, useMemo, useState, } from "react";
import { useParams } from "react-router-dom";
import {
  getTeam,
  addSponsor, deleteSponsor,
  deleteCar,
  addDriver, deleteDriver,
  addDriverResult, listEngineers,
  listTeamEngineers, assignEngineer, unassignEngineer, updateDriverSkill
} from "../services/teams";

import { listEngineersAvailable, listDriversAvailable } from "../services/users";

import { getSession } from "../services/auth";

import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Stack,
  TextField,
  Button,
  Alert,
  Divider,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip, Dialog, DialogTitle, DialogActions, DialogContent
} from "@mui/material";

function Section({ title, children }) {
  return (
    <Card>
      <CardContent>
        <Typography fontWeight={800} sx={{ mb: 1 }}>{title}</Typography>
        {children}
      </CardContent>
    </Card>
  );
}

export default function TeamDetail() {
  const { id } = useParams();
  const session = getSession();
  const isAdmin = useMemo(() => session?.role === "ADMIN", [session]);
  const isEngineer = useMemo(() => session?.role === "ENGINEER", [session]);
  const canEdit = useMemo(() => ["ADMIN", "ENGINEER"].includes(session?.role), [session]);

  const [team, setTeam] = useState(null);
  const TAB_BUDGET = "budget";
  const TAB_SPONSORS = "sponsors";
  const TAB_INVENTORY = "inventory";
  const TAB_CARS = "cars";
  const TAB_ENGINEERS = "engineers";
  const TAB_DRIVERS = "drivers";

  const [tab, setTab] = useState(TAB_BUDGET);
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(true);

  // forms
  const [sName, setSName] = useState("");
  const [sContrib, setSContrib] = useState("");
  const [sDesc, setSDesc] = useState("");


  const [dName, setDName] = useState("");
  const [dSkill, setDSkill] = useState("");

  const [rDriverId, setRDriverId] = useState("");
  const [rDate, setRDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [rRace, setRRace] = useState("");
  const [rPos, setRPos] = useState("");
  const [rPoints, setRPoints] = useState("");
  const [engineers, setEngineers] = useState([]);          // lista global (para dropdown)
  const [teamEngineers, setTeamEngineers] = useState([]);  // asignados a este team
  const [selectedEngineer, setSelectedEngineer] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [loadingTeamEngineers, setLoadingTeamEngineers] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [assignSkill, setAssignSkill] = useState("50");
  const [assigningDriver, setAssigningDriver] = useState(false);
  const [openSkillDialog, setOpenSkillDialog] = useState(false);
  const [skillDriver, setSkillDriver] = useState(null); // driver seleccionado (obj)
  const [skillValue, setSkillValue] = useState("50");
  const [savingSkill, setSavingSkill] = useState(false);


  async function reload() {
    setError("");
    setLoading(true);
    try {
      const t = await getTeam(id);
      setTeam(t);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, [id]);
  useEffect(() => {
    // Solo ADMIN/ENGINEER pueden ver ingenieros del equipo
    if (tab !== TAB_ENGINEERS) return;
    if (!team?.id) return;
    if (!(isAdmin || isEngineer)) return;

    loadTeamEngineers(team.id);
    loadEngineersCatalog();
  }, [tab, team?.id, isAdmin, isEngineer]);
  useEffect(() => {
    if (tab === TAB_DRIVERS) loadAvailableDrivers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    // Si el usuario no tiene permiso para ingenieros, evita quedar "parqueado" en ese tab.
    if (tab === TAB_ENGINEERS && !(isAdmin || isEngineer)) setTab(TAB_DRIVERS);
  }, [tab, isAdmin, isEngineer]);

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  if (!team) return <Alert severity="error">{error || "Equipo no encontrado"}</Alert>;

  const openEditSkill = (driver) => {
    setSkillDriver(driver);
    setSkillValue(String(driver?.skill ?? 50));
    setOpenSkillDialog(true);
  };

  const closeEditSkill = () => {
    setOpenSkillDialog(false);
    setSkillDriver(null);
    setSkillValue("50");
  };

  const submitEditSkill = async () => {
    if (!skillDriver) return;

    const s = Number.parseInt(String(skillValue), 10);
    if (!Number.isInteger(s) || s < 0 || s > 100) {
      setError("Skill inválido (0-100).");
      return;
    }

    try {
      setSavingSkill(true);
      setError("");

      const res = await updateDriverSkill(id, skillDriver.id, s);
      setTeam(res.team || res);
      closeEditSkill();
    } catch (e) {
      setError(e.message || "Error actualizando skill");
    } finally {
      setSavingSkill(false);
    }
  };


  const onAddSponsor = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const t = await addSponsor(id, { name: sName, contribution: Number(sContrib || 0), description: sDesc });
      setTeam(t);
      setSName("");
      setSContrib("");
      setSDesc("");
    } catch (e2) { setError(e2.message); }
  };

  const pamTotals = (car) => {
    const installed = car?.installedParts || [];
    return installed.reduce(
      (acc, p) => {
        acc.p += Number(p.performance?.p ?? 0);
        acc.a += Number(p.performance?.a ?? 0);
        acc.m += Number(p.performance?.m ?? 0);
        return acc;
      },
      { p: 0, a: 0, m: 0 }
    );
  };

  const onAddDriver = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const maybeSkill = dSkill === "" ? 50 : Number(dSkill);
      const t = await addDriver(id, { name: dName, skill: maybeSkill });
      setTeam(t); setDName(""); setDSkill("");
    } catch (e2) { setError(e2.message); }
  };

  const onAddDriverResult = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const t = await addDriverResult(id, rDriverId, {
        date: rDate,
        race: rRace,
        position: Number(rPos),
        points: Number(rPoints),
      });
      setTeam(t);
      setRRace("");
      setRPos("");
      setRPoints("");
    } catch (e2) {
      setError(e2.message);
    }
  };
  const loadAvailableDrivers = async () => {
    if (!isAdmin) return;
    try {
      const res = await listDriversAvailable();
      setAvailableDrivers(res.users || []);
    } catch (e) {
      setError(e.message || "Error cargando conductores disponibles");
    }
  };

  const submitAssignDriver = async () => {
    if (!selectedDriver) return;

    // skill 0..100 entero
    const s = Number.parseInt(assignSkill, 10);
    if (!Number.isInteger(s) || s < 0 || s > 100) {
      setError("Skill inválido (0-100).");
      return;
    }

    try {
      setAssigningDriver(true);
      setError("");

      const updated = await addDriver(id, { driverId: selectedDriver, skill: s });
      setTeam(updated);                 // tu addDriver devuelve team (Team_GetById)
      setSelectedDriver("");
      setAssignSkill("50");
      await loadAvailableDrivers();     // refresca dropdown
    } catch (e) {
      setError(e.message || "Error asignando conductor");
    } finally {
      setAssigningDriver(false);
    }
  };

  const onUnassignDriver = async (driverId) => {
    if (!window.confirm("¿Desasignar este conductor del equipo?")) return;
    try {
      setError("");
      const updated = await deleteDriver(id, driverId);
      setTeam(updated);
      await loadAvailableDrivers();
    } catch (e) {
      setError(e.message || "Error desasignando conductor");
    }
  };


  const budgetTotal = Number(team.budget?.total ?? 0);
  const budgetSpent = Number(team.budget?.spent ?? 0);
  const budgetAvailable = budgetTotal - budgetSpent;
  const contributionsTotal = (team.sponsors || []).reduce((s, sp) => s + Number(sp.contribution || 0), 0);
  

  const driverStats = (d) => {
    const results = d.results || [];
    const races = results.length;
    const avgPosition = races ? results.reduce((s, r) => s + Number(r.position || 0), 0) / races : 0;
    const avgPoints = races ? results.reduce((s, r) => s + Number(r.points || 0), 0) / races : 0;
    const bestPosition = races ? Math.min(...results.map(r => Number(r.position || Infinity))) : null;
    const totalPoints = results.reduce((s, r) => s + Number(r.points || 0), 0);
    return { races, avgPosition, avgPoints, bestPosition, totalPoints };
  };

  async function loadEngineersCatalog() {
  if (!isAdmin) return;
  const res = await listEngineersAvailable(); // /users?role=ENGINEER
  const arr = Array.isArray(res?.users) ? res.users : [];
  setEngineers(arr);
}

async function loadTeamEngineers(teamId) {
  setLoadingTeamEngineers(true);
  try {
    const res = await listTeamEngineers(teamId); // /teams/:id/engineers
    const arr = Array.isArray(res?.engineers) ? res.engineers : (Array.isArray(res) ? res : []);
    setTeamEngineers(arr.filter(Boolean));
    } catch (e) {
      setTeamEngineers([]);
      setError(e?.message || "Error cargando engineers del equipo");
  } finally {
    setLoadingTeamEngineers(false);
  }
}

async function submitAssignEngineer() {
  if (!selectedEngineer) return;
  try {
    setAssigning(true);
    await assignEngineer(team.id, selectedEngineer); // POST /teams/:id/engineer
    setSelectedEngineer("");
    await loadTeamEngineers(team.id);
    await loadEngineersCatalog();
  } finally {
    setAssigning(false);
  }
}

async function onUnassignEngineer(userId) {
  if (!window.confirm("¿Desasignar este engineer del equipo?")) return;
  await unassignEngineer(team.id, userId); // DELETE /teams/:id/engineers/:userId
  await loadTeamEngineers(team.id);
  await loadEngineersCatalog();
}



  return (
    <Box>
      <Box sx={{ maxWidth: 1100, mx: "auto" }}>
        <Stack spacing={2}>

        <Box>
          <Typography variant="h4" fontWeight={900}>{team.name}</Typography>
          <Typography color="text.secondary">
            País: {team.country || "—"} • Carros: {team.cars.length}/2
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <Card>
          <CardContent>
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab value={TAB_BUDGET} label="Presupuesto" />
              <Tab value={TAB_SPONSORS} label="Patrocinadores" />
              <Tab value={TAB_INVENTORY} label="Inventario" />
              <Tab value={TAB_CARS} label="Carros" />
              {(isAdmin || isEngineer) ? <Tab value={TAB_ENGINEERS} label="Ingenieros" /> : null}
              <Tab value={TAB_DRIVERS} label="Conductores" />
            </Tabs>
          </CardContent>
        </Card>

        {tab === TAB_BUDGET && (
          <Section title="Presupuesto">
            <Stack spacing={1}>
              <Typography color="text.secondary">
                Regla: el presupuesto se calcula a partir de aportes registrados y las compras aumentan el gastado.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField label="Total (calculado)" value={String(budgetTotal)} fullWidth InputProps={{ readOnly: true }} />
                <TextField label="Gastado" value={String(budgetSpent)} fullWidth InputProps={{ readOnly: true }} />
                <TextField label="Disponible" value={String(budgetAvailable)} fullWidth InputProps={{ readOnly: true }} />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Aportes acumulados (referencia): {String(contributionsTotal)}
              </Typography>
            </Stack>
          </Section>
        )}

        {tab === TAB_SPONSORS && (
          <Section title="Patrocinadores">
            <Stack spacing={2}>
              {/*<Box component="form" onSubmit={onAddSponsor}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField label="Nombre" value={sName} onChange={(e) => setSName(e.target.value)} fullWidth />
                  <TextField label="Contribución" value={sContrib} onChange={(e) => setSContrib(e.target.value)} fullWidth />
                  <TextField label="Descripción" value={sDesc} onChange={(e) => setSDesc(e.target.value)} fullWidth />
                  <Button type="submit" variant="contained" disabled={!canEdit}>Agregar</Button>
                </Stack>
              </Box>*/}

              <Divider />

              {team.sponsors.length === 0 ? (
                <Typography color="text.secondary">No hay patrocinadores.</Typography>
              ) : (
                <Stack spacing={1}>
                  {team.sponsors.map(s => (
                    <Card key={s.id} variant="outlined">
                      <CardContent sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography fontWeight={800} color="text.primary">{String(s.name)}</Typography>
                          <Typography variant="body2" color="text.secondary">Contribución: {Number(s.contribution || 0)}</Typography>
                          {s.createdAt ? (
                            <Typography variant="body2" color="text.secondary">
                              Fecha: {new Date(s.createdAt).toLocaleDateString()}
                            </Typography>
                          ) : null}
                          {s.description ? (
                            <Typography variant="body2" color="text.secondary">Descripción: {s.description}</Typography>
                          ) : null}
                        </Box>
                        {/*<Button disabled={!canEdit} onClick={async () => setTeam(await deleteSponsor(id, s.id))}>
                          Eliminar
                        </Button>*/}
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </Stack>
          </Section>
        )}

        {tab === TAB_INVENTORY && (
          <Section title="Inventario">
            <Stack spacing={2}>
              <Typography color="text.secondary">
                El inventario es de solo lectura: se actualiza automáticamente con compras exitosas y con instalar/desinstalar partes en los carros.
              </Typography>

              <Divider />

              {team.inventory.length === 0 ? (
                <Typography color="text.secondary">Inventario vacío.</Typography>
              ) : (
                <Stack spacing={1}>
                  {team.inventory.map(i => (
                    <Card key={i.id} variant="outlined">
                      <CardContent sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography fontWeight={800}>{i.partName}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {i.category || "—"} • qty: {i.qty} • unit: {i.unitCost}
                          </Typography>
                          {(i.acquiredAt || i.createdAt) ? (
                            <Typography variant="body2" color="text.secondary">
                              Adquirida: {new Date(i.acquiredAt || i.createdAt).toLocaleDateString()}
                            </Typography>
                          ) : null}
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </Stack>
          </Section>
        )}

        {tab === TAB_CARS && (
          <Section title="Carros (máximo 2)">
            <Stack spacing={2}>
              <Alert severity="info">
                El armado (instalar/desinstalar partes, asignar conductor y finalizar) se realiza desde la vista <b>Armado</b> del menú.
              </Alert>

              <Divider />

              {team.cars.length === 0 ? (
                <Typography color="text.secondary">No hay carros.</Typography>
              ) : (
                <Stack spacing={1}>
                  {team.cars.map(c => (
                    <Card key={c.id} variant="outlined">
                      <CardContent sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography fontWeight={800}>{c.code}</Typography>
                          <Typography variant="body2" color="text.secondary">{c.name || "—"}</Typography>

                          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
                            <Chip
                              size="small"
                              label={c.driverId ? "Conductor asignado" : "Sin conductor"}
                              color={c.driverId ? "success" : "default"}
                              variant={c.driverId ? "filled" : "outlined"}
                            />
                            <Chip
                              size="small"
                              label={c.isFinalized ? "Finalizado" : "No finalizado"}
                              color={c.isFinalized ? "success" : "default"}
                              variant={c.isFinalized ? "filled" : "outlined"}
                            />
                            <Chip
                              size="small"
                              label={`P ${pamTotals(c).p} / A ${pamTotals(c).a} / M ${pamTotals(c).m}`}
                              variant="outlined"
                            />
                          </Stack>

                          {(c.installedParts || []).length ? (
                            <Box sx={{ mt: 1 }}>
                              <Typography variant="body2" color="text.secondary">Partes instaladas:</Typography>
                              <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                                {(c.installedParts || []).map((p) => (
                                  <Box key={p.id} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                                    <Typography variant="body2" sx={{ flex: 1 }}>
                                      {p.partName} ({p.category || "—"})
                                    </Typography>
                                  </Box>
                                ))}
                              </Stack>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                              Sin partes instaladas.
                            </Typography>
                          )}
                        </Box>
                        <Button disabled={!canEdit} onClick={async () => setTeam(await deleteCar(id, c.id))}>
                          Eliminar
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </Stack>
          </Section>
        )}

        {tab === TAB_DRIVERS && (
          <Section title="Conductores">
            <Stack spacing={2}>

              {isAdmin && (
                <Card>
                  <CardContent>
                    <Typography fontWeight={700} sx={{ mb: 1 }}>
                      Asignar conductor
                    </Typography>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <FormControl fullWidth>
                        <InputLabel id="available-driver-select-label">Conductor disponible</InputLabel>
                        <Select
                          labelId="available-driver-select-label"
                          label="Conductor disponible"
                          value={selectedDriver}
                          onChange={(e) => setSelectedDriver(e.target.value)}
                        >
                          <MenuItem value="" disabled>
                            Seleccionar...
                          </MenuItem>
                          {(availableDrivers || []).filter(Boolean).map((u) => (
                            <MenuItem key={u.id} value={u.id}>
                              {u.name || u.email || u.id}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <TextField
                        label="Skill (0-100)"
                        value={assignSkill}
                        onChange={(e) => setAssignSkill(e.target.value.replace(/\D/g, ""))}
                        fullWidth
                      />

                      <Button
                        variant="contained"
                        disabled={!selectedDriver || assigningDriver}
                        onClick={submitAssignDriver}
                      >
                        {assigningDriver ? "Asignando..." : "Asignar"}
                      </Button>
                    </Stack>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    </Typography>
                  </CardContent>
                </Card>
              )}

              <Divider />

              {(team.drivers || []).length === 0 ? (
                <Typography color="text.secondary">No hay conductores.</Typography>
              ) : (
                <Stack spacing={1}>
                  {(team.drivers || []).map((d) => (
                    <Card key={d.id} variant="outlined">
                      <CardContent sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography fontWeight={800}>{d.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            Skill: {d.skill}
                          </Typography>
                        </Box>

                        {isAdmin && (
                          <Stack direction="row" spacing={1}>
                            <Button
                              variant="outlined"
                              onClick={() => openEditSkill(d)}
                            >
                              Modificar skill
                            </Button>

                            <Button
                              variant="outlined"
                              color="error"
                              onClick={() => onUnassignDriver(d.id)}
                            >
                              Desasignar
                            </Button>
                          </Stack>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </Stack>
          </Section>
        )}
        {tab === TAB_ENGINEERS && (
          <Section title="Ingenieros">
            <Stack spacing={2}>

              {isAdmin && (
                <Card>
                  <CardContent>
                    <Typography fontWeight={700} sx={{ mb: 1 }}>
                      Asignar ingeniero al equipo
                    </Typography>

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                      <FormControl fullWidth>
                        <InputLabel id="team-engineer-select-label">Ingeniero</InputLabel>
                        <Select
                          labelId="team-engineer-select-label"
                          label="Ingeniero"
                          value={selectedEngineer}
                          onChange={(e) => setSelectedEngineer(e.target.value)}
                        >
                          <MenuItem value="" disabled>
                            Seleccionar...
                          </MenuItem>
                          {(engineers || []).filter(Boolean).map((u) => (
                            <MenuItem key={u.id} value={u.id}>
                              {u.name || u.email || u.id}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <Button
                        variant="contained"
                        disabled={!selectedEngineer || assigning}
                        onClick={submitAssignEngineer}
                      >
                        {assigning ? "Asignando..." : "Asignar"}
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardContent>
                  <Typography fontWeight={700} sx={{ mb: 1 }}>
                    Ingenieros asignados
                  </Typography>

                  {loadingTeamEngineers ? (
                    <Typography color="text.secondary">Cargando...</Typography>
                  ) : teamEngineers.length === 0 ? (
                    <Typography color="text.secondary">No hay engineers asignados.</Typography>
                  ) : (
                    <Stack spacing={1}>
                      {teamEngineers.map((u) => (
                        <Box
                          key={u.id}
                          sx={{
                            p: 2,
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 2,
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                          }}
                        >
                          <Box sx={{ flex: 1 }}>
                            <Typography fontWeight={800}>{u.name || "—"}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {u.email || ""} {u.role ? `• ${u.role}` : ""}
                            </Typography>
                          </Box>

                          {isAdmin && (
                            <Button
                              variant="outlined"
                              color="error"
                              onClick={() => onUnassignEngineer(u.id)}
                            >
                              Desasignar
                            </Button>
                          )}
                        </Box>
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Stack>
          </Section>
        )}
        </Stack>
      </Box>
      <Dialog open={openSkillDialog} onClose={closeEditSkill} maxWidth="xs" fullWidth>
        <DialogTitle>Modificar skill</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography fontWeight={700}>
            {skillDriver?.name || "Conductor"}
          </Typography>

          <TextField
            fullWidth
            label="Skill (0-100)"
            value={skillValue}
            onChange={(e) => setSkillValue(e.target.value.replace(/\D/g, ""))}
            margin="normal"
            inputProps={{ inputMode: "numeric" }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditSkill}>Cancelar</Button>
          <Button
            onClick={submitEditSkill}
            variant="contained"
            disabled={savingSkill}
          >
            {savingSkill ? "Guardando..." : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
    
  );
}
