import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getTeam,
  addSponsor, deleteSponsor,
  addCar, deleteCar,
  addDriver, deleteDriver,
  addDriverResult,
  addInventoryItem, deleteInventoryItem
} from "../services/teams";
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
  const canEdit = useMemo(() => ["ADMIN", "ENGINEER"].includes(session?.role), [session]);

  const [team, setTeam] = useState(null);
  const [tab, setTab] = useState(0);
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(true);

  // forms
  const [sName, setSName] = useState("");
  const [sContrib, setSContrib] = useState("");
  const [sDesc, setSDesc] = useState("");

  const [carCode, setCarCode] = useState("");
  const [carName, setCarName] = useState("");

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

  const [pName, setPName] = useState("");
  const [pCat, setPCat] = useState("");
  const [pQty, setPQty] = useState("");
  const [pCost, setPCost] = useState("");

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

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  if (!team) return <Alert severity="error">{error || "Equipo no encontrado"}</Alert>;

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

  const onAddCar = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const t = await addCar(id, { code: carCode, name: carName });
      setTeam(t); setCarCode(""); setCarName("");
    } catch (e2) { setError(e2.message); }
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

  const onAddInv = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const t = await addInventoryItem(id, {
        partName: pName, category: pCat, qty: Number(pQty || 0), unitCost: Number(pCost || 0)
      });
      setTeam(t); setPName(""); setPCat(""); setPQty(""); setPCost("");
    } catch (e2) { setError(e2.message); }
  };

  const budgetTotal = Number(team.budget?.total ?? 0);
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
              <Tab label="Presupuesto" />
              <Tab label="Patrocinadores" />
              <Tab label="Inventario" />
              <Tab label="Carros" />
              <Tab label="Conductores" />
            </Tabs>
          </CardContent>
        </Card>

        {tab === 0 && (
          <Section title="Presupuesto">
            <Stack spacing={1}>
              <Typography color="text.secondary">
                Regla: el presupuesto se calcula únicamente a partir de aportes registrados.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField label="Total (calculado)" value={String(budgetTotal)} fullWidth InputProps={{ readOnly: true }} />
                <TextField label="Aportes acumulados" value={String(contributionsTotal)} fullWidth InputProps={{ readOnly: true }} />
              </Stack>
            </Stack>
          </Section>
        )}

        {tab === 1 && (
          <Section title="Patrocinadores">
            <Stack spacing={2}>
              <Box component="form" onSubmit={onAddSponsor}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField label="Nombre" value={sName} onChange={(e) => setSName(e.target.value)} fullWidth />
                  <TextField label="Contribución" value={sContrib} onChange={(e) => setSContrib(e.target.value)} fullWidth />
                  <TextField label="Descripción" value={sDesc} onChange={(e) => setSDesc(e.target.value)} fullWidth />
                  <Button type="submit" variant="contained" disabled={!canEdit}>Agregar</Button>
                </Stack>
              </Box>

              <Divider />

              {team.sponsors.length === 0 ? (
                <Typography color="text.secondary">No hay patrocinadores.</Typography>
              ) : (
                <Stack spacing={1}>
                  {team.sponsors.map(s => (
                    <Card key={s.id} variant="outlined">
                      <CardContent sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography fontWeight={800}>{s.name}</Typography>
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
                        <Button disabled={!canEdit} onClick={async () => setTeam(await deleteSponsor(id, s.id))}>
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

        {tab === 2 && (
          <Section title="Inventario">
            <Stack spacing={2}>
              <Box component="form" onSubmit={onAddInv}>
                <Stack spacing={2} direction={{ xs: "column", md: "row" }}>
                  <TextField label="Parte" value={pName} onChange={(e) => setPName(e.target.value)} fullWidth />
                  <TextField label="Categoría" value={pCat} onChange={(e) => setPCat(e.target.value)} fullWidth />
                  <TextField label="Cantidad" value={pQty} onChange={(e) => setPQty(e.target.value)} fullWidth />
                  <TextField label="Costo unitario" value={pCost} onChange={(e) => setPCost(e.target.value)} fullWidth />
                  <Button type="submit" variant="contained" disabled={!canEdit}>Agregar</Button>
                </Stack>
              </Box>

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
                        </Box>
                        <Button disabled={!canEdit} onClick={async () => setTeam(await deleteInventoryItem(id, i.id))}>
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

        {tab === 3 && (
          <Section title="Carros (máximo 2)">
            <Stack spacing={2}>
              <Box component="form" onSubmit={onAddCar}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField label="Código" value={carCode} onChange={(e) => setCarCode(e.target.value)} fullWidth />
                  <TextField label="Nombre" value={carName} onChange={(e) => setCarName(e.target.value)} fullWidth />
                  <Button type="submit" variant="contained" disabled={!canEdit}>Agregar</Button>
                </Stack>
              </Box>

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

        {tab === 4 && (
          <Section title="Conductores">
            <Stack spacing={2}>
              <Box component="form" onSubmit={onAddDriver}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField label="Nombre" value={dName} onChange={(e) => setDName(e.target.value)} fullWidth />
                  <TextField label="Habilidad (0-100)" value={dSkill} onChange={(e) => setDSkill(e.target.value)} fullWidth />
                  <Button type="submit" variant="contained" disabled={!canEdit}>Agregar</Button>
                </Stack>
              </Box>

              <Box component="form" onSubmit={onAddDriverResult}>
                <Stack spacing={2} direction={{ xs: "column", md: "row" }}>
                  <FormControl fullWidth>
                    <InputLabel id="driver-select-label">Conductor</InputLabel>
                    <Select
                      labelId="driver-select-label"
                      label="Conductor"
                      value={rDriverId}
                      onChange={(e) => setRDriverId(e.target.value)}
                    >
                      {(team.drivers || []).map((d) => (
                        <MenuItem key={d.id} value={d.id}>
                          {d.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Fecha"
                    type="date"
                    value={rDate}
                    onChange={(e) => setRDate(e.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField label="Carrera" value={rRace} onChange={(e) => setRRace(e.target.value)} fullWidth />
                  <TextField label="Posición" value={rPos} onChange={(e) => setRPos(e.target.value)} fullWidth />
                  <TextField label="Puntos" value={rPoints} onChange={(e) => setRPoints(e.target.value)} fullWidth />
                  <Button type="submit" variant="contained" disabled={!canEdit || !rDriverId}>
                    Agregar resultado
                  </Button>
                </Stack>
              </Box>

              <Divider />

              {team.drivers.length === 0 ? (
                <Typography color="text.secondary">No hay conductores.</Typography>
              ) : (
                <Stack spacing={1}>
                  {team.drivers.map(d => (
                    <Card key={d.id} variant="outlined">
                      <CardContent sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography fontWeight={800}>{d.name}</Typography>
                          <Typography variant="body2" color="text.secondary">Habilidad (H): {d.skill}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            stats: carreras {driverStats(d).races} • prom pos {driverStats(d).avgPosition.toFixed(2)} • prom pts {driverStats(d).avgPoints.toFixed(2)} • mejor pos {driverStats(d).bestPosition ?? "—"} • total pts {driverStats(d).totalPoints}
                          </Typography>
                        </Box>
                        <Button disabled={!canEdit} onClick={async () => setTeam(await deleteDriver(id, d.id))}>
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
        </Stack>
      </Box>
    </Box>
  );
}
