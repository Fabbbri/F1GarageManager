import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  getTeam, patchBudget,
  addSponsor, deleteSponsor,
  addCar, deleteCar,
  addDriver, deleteDriver,
  addInventoryItem, deleteInventoryItem
} from "../services/teams";
import { getSession } from "../services/auth";
import {
  Box, Card, CardContent, Typography, Tabs, Tab, Stack, TextField, Button, Alert, Divider
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
  const navigate = useNavigate();
  const session = getSession();
  const canEdit = useMemo(() => ["ADMIN", "ENGINEER"].includes(session?.role), [session]);

  const [team, setTeam] = useState(null);
  const [tab, setTab] = useState(0);
  const [error, setError] = useState("");

  const [loading, setLoading] = useState(true);

  // forms
  const [total, setTotal] = useState("");
  const [spent, setSpent] = useState("");

  const [sName, setSName] = useState("");
  const [sContrib, setSContrib] = useState("");

  const [carCode, setCarCode] = useState("");
  const [carName, setCarName] = useState("");

  const [dName, setDName] = useState("");
  const [dSkill, setDSkill] = useState("");

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
      setTotal(String(t.budget?.total ?? 0));
      setSpent(String(t.budget?.spent ?? 0));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, [id]);

  if (loading) return <Typography> Cargando...</Typography>;
  if (!team) return <Alert severity="error">{error || "Equipo no encontrado"}</Alert>;

  const onBudget = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const t = await patchBudget(id, { total: Number(total), spent: Number(spent) });
      setTeam(t);
    } catch (e2) { setError(e2.message); }
  };

  const onAddSponsor = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const t = await addSponsor(id, { name: sName, contribution: Number(sContrib || 0) });
      setTeam(t); setSName(""); setSContrib("");
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
      const t = await addDriver(id, { name: dName, skill: Number(dSkill || 50) });
      setTeam(t); setDName(""); setDSkill("");
    } catch (e2) { setError(e2.message); }
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

  return (
    <Box>
      {/* Outside the centered container */}
      <Box sx={{ px: { xs: 2, sm: 3 }, pt: 1 }}>
        <Button
          variant="text"
          size="small"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/teams")}
          sx={{ textTransform: "none", fontWeight: 800 }}
        >
          Regresar
        </Button>
      </Box>

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
            <Box component="form" onSubmit={onBudget}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <TextField label="Total" value={total} onChange={(e) => setTotal(e.target.value)} fullWidth />
                <TextField label="Gastado" value={spent} onChange={(e) => setSpent(e.target.value)} fullWidth />
                <Button type="submit" variant="contained" disabled={!canEdit}>Guardar</Button>
              </Stack>
            </Box>
          </Section>
        )}

        {tab === 1 && (
          <Section title="Patrocinadores">
            <Stack spacing={2}>
              <Box component="form" onSubmit={onAddSponsor}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField label="Nombre" value={sName} onChange={(e) => setSName(e.target.value)} fullWidth />
                  <TextField label="Contribución" value={sContrib} onChange={(e) => setSContrib(e.target.value)} fullWidth />
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
                          <Typography variant="body2" color="text.secondary">Contribución: {s.contribution}</Typography>
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
                          <Typography variant="body2" color="text.secondary">Habilidad: {d.skill}</Typography>
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
