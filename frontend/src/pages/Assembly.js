import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Divider,
  Chip,
} from "@mui/material";

import { getSession } from "../services/auth";
import {
  listTeams,
  getTeam,
  addCar,
  installPart,
  uninstallPart,
  assignCarDriver,
  finalizeCar,
  unfinalizeCar,
} from "../services/teams";

const REQUIRED_CATEGORIES = [
  "Power Unit",
  "Paquete aerodinámico",
  "Neumáticos",
  "Suspensión",
  "Caja de cambios",
];

function pam(performance) {
  return {
    p: Number(performance?.p ?? 0),
    a: Number(performance?.a ?? 0),
    m: Number(performance?.m ?? 0),
  };
}

export default function Assembly() {
  const session = getSession();
  const canEdit = useMemo(() => ["ADMIN", "ENGINEER"].includes(session?.role), [session]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [team, setTeam] = useState(null);

  const [selectedCarId, setSelectedCarId] = useState("");

  const [newCarCode, setNewCarCode] = useState("");
  const [newCarName, setNewCarName] = useState("");

  async function loadTeams() {
    setError("");
    setLoading(true);
    try {
      const t = await listTeams();
      setTeams(t);
      if (!selectedTeamId && t.length) setSelectedTeamId(t[0].id);
    } catch (e) {
      setError(e.message || "Error cargando equipos");
    } finally {
      setLoading(false);
    }
  }

  async function loadTeam(teamId) {
    if (!teamId) return;
    setError("");
    setLoading(true);
    try {
      const t = await getTeam(teamId);
      setTeam(t);
      if (!selectedCarId && (t.cars || []).length) setSelectedCarId(t.cars[0].id);
      if (selectedCarId && !(t.cars || []).some((c) => c.id === selectedCarId)) {
        setSelectedCarId((t.cars || [])[0]?.id || "");
      }
    } catch (e) {
      setError(e.message || "Error cargando equipo");
      setTeam(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadTeam(selectedTeamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamId]);

  const car = useMemo(() => (team?.cars || []).find((c) => c.id === selectedCarId) || null, [team, selectedCarId]);

  const installedByCategory = useMemo(() => {
    const by = new Map();
    const installed = car?.installedParts || [];
    for (const part of installed) {
      const key = String(part.categoryKey || part.category || "").trim();
      if (!by.has(key)) by.set(key, part);
    }
    return by;
  }, [car]);

  const totals = useMemo(() => {
    const sum = { p: 0, a: 0, m: 0 };
    for (const cat of REQUIRED_CATEGORIES) {
      const part = installedByCategory.get(cat);
      const x = pam(part?.performance);
      sum.p += x.p;
      sum.a += x.a;
      sum.m += x.m;
    }
    return sum;
  }, [installedByCategory]);

  const canFinalize = useMemo(() => {
    if (!car) return false;
    if (!car.driverId) return false;
    return REQUIRED_CATEGORIES.every((cat) => installedByCategory.has(cat));
  }, [car, installedByCategory]);

  const onAssignDriver = async (driverId) => {
    setError("");
    try {
      const t = await assignCarDriver(selectedTeamId, selectedCarId, { driverId: driverId || null });
      setTeam(t);
    } catch (e) {
      setError(e.message || "Error asignando conductor");
    }
  };

  const onInstall = async (inventoryItemId) => {
    setError("");
    try {
      const t = await installPart(selectedTeamId, selectedCarId, { inventoryItemId });
      setTeam(t);
    } catch (e) {
      setError(e.message || "Error instalando parte");
    }
  };

  const onUninstall = async (installedPartId) => {
    setError("");
    try {
      const t = await uninstallPart(selectedTeamId, selectedCarId, { installedPartId });
      setTeam(t);
    } catch (e) {
      setError(e.message || "Error desinstalando parte");
    }
  };

  const onFinalize = async () => {
    setError("");
    try {
      const t = await finalizeCar(selectedTeamId, selectedCarId);
      setTeam(t);
    } catch (e) {
      setError(e.message || "Error finalizando carro");
    }
  };

  const onEditCar = async () => {
    setError("");
    try {
      const t = await unfinalizeCar(selectedTeamId, selectedCarId);
      setTeam(t);
    } catch (e) {
      setError(e.message || "Error habilitando edición");
    }
  };

  const onCreateCar = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (!selectedTeamId) throw new Error("Seleccioná un equipo.");
      const t = await addCar(selectedTeamId, { code: newCarCode, name: newCarName });
      setTeam(t);
      const last = (t.cars || [])[0];
      if (last?.id) setSelectedCarId(last.id);
      setNewCarCode("");
      setNewCarName("");
    } catch (e2) {
      setError(e2.message || "Error creando carro");
    }
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={900}>Armado</Typography>
          <Typography color="text.secondary">
            Asigná un conductor (H), instalá 1 parte por categoría y finalizá el carro.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        {loading ? (
          <Typography color="text.secondary">Cargando...</Typography>
        ) : (
          <>
            <Card>
              <CardContent>
                <Stack spacing={2} direction={{ xs: "column", md: "row" }}>
                  <FormControl fullWidth>
                    <InputLabel id="assembly-team-label">Equipo</InputLabel>
                    <Select
                      labelId="assembly-team-label"
                      label="Equipo"
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                    >
                      {teams.map((t) => (
                        <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth disabled={!team || (team.cars || []).length === 0}>
                    <InputLabel id="assembly-car-label">Carro</InputLabel>
                    <Select
                      labelId="assembly-car-label"
                      label="Carro"
                      value={selectedCarId}
                      onChange={(e) => setSelectedCarId(e.target.value)}
                    >
                      {(team?.cars || []).map((c) => (
                        <MenuItem key={c.id} value={c.id}>{c.code}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <Chip
                      size="small"
                      label={car?.driverId ? "Conductor asignado" : "Sin conductor"}
                      color={car?.driverId ? "success" : "default"}
                      variant={car?.driverId ? "filled" : "outlined"}
                    />
                    <Chip
                      size="small"
                      label={car?.isFinalized ? "Finalizado" : "No finalizado"}
                      color={car?.isFinalized ? "success" : "default"}
                      variant={car?.isFinalized ? "filled" : "outlined"}
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {!team ? null : (
              <Card>
                <CardContent>
                  <Typography fontWeight={800} sx={{ mb: 1 }}>Crear carro (máximo 2)</Typography>
                  <Box component="form" onSubmit={onCreateCar}>
                    <Stack spacing={2} direction={{ xs: "column", md: "row" }}>
                      <TextField
                        label="Código"
                        value={newCarCode}
                        onChange={(e) => setNewCarCode(e.target.value)}
                        fullWidth
                      />
                      <TextField
                        label="Nombre"
                        value={newCarName}
                        onChange={(e) => setNewCarName(e.target.value)}
                        fullWidth
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={!canEdit || (team.cars || []).length >= 2 || !newCarCode.trim()}
                      >
                        Crear
                      </Button>
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            )}

            {!team ? null : (team.cars || []).length === 0 ? (
              <Alert severity="info">El equipo no tiene carros. Creá uno acá en Armado.</Alert>
            ) : !car ? (
              <Alert severity="info">Seleccioná un carro.</Alert>
            ) : (
              <>
                <Card>
                  <CardContent>
                    <Stack spacing={2}>
                      <Typography fontWeight={800}>Conductor (H)</Typography>
                      <FormControl fullWidth>
                        <InputLabel id="assembly-driver-label">Conductor</InputLabel>
                        <Select
                          labelId="assembly-driver-label"
                          label="Conductor"
                          value={car.driverId || ""}
                          onChange={(e) => onAssignDriver(e.target.value)}
                          disabled={!canEdit}
                        >
                          <MenuItem value="">(Sin asignar)</MenuItem>
                          {(team.drivers || []).map((d) => (
                            <MenuItem key={d.id} value={d.id}>{d.name} (H: {d.skill})</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Stack>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent>
                    <Stack spacing={1} direction={{ xs: "column", md: "row" }} sx={{ alignItems: { md: "center" } }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography fontWeight={800}>Totales del carro</Typography>
                        <Typography color="text.secondary">
                          P: {totals.p} • A: {totals.a} • M: {totals.m}
                        </Typography>
                      </Box>
                      {car.isFinalized ? (
                        <Button variant="outlined" onClick={onEditCar} disabled={!canEdit}>
                          Editar carro
                        </Button>
                      ) : (
                        <Button variant="contained" onClick={onFinalize} disabled={!canEdit || !canFinalize}>
                          Finalizar
                        </Button>
                      )}
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Regla: solo se puede finalizar cuando están instaladas las 5 categorías obligatorias y hay un conductor asignado.
                    </Typography>
                  </CardContent>
                </Card>

                <Divider />

                <Stack spacing={1}>
                  {REQUIRED_CATEGORIES.map((cat) => {
                    const installed = installedByCategory.get(cat) || null;
                    const available = (team.inventory || [])
                      .filter((i) => Number(i.qty || 0) > 0)
                      .filter((i) => String(i.category || "").trim() === cat);

                    return (
                      <Card key={cat}>
                        <CardContent>
                          <Stack spacing={1}>
                            <Typography fontWeight={900}>{cat}</Typography>

                            {installed ? (
                              <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                                <Box sx={{ flex: 1, minWidth: 240 }}>
                                  <Typography fontWeight={800}>{installed.partName}</Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    P: {pam(installed.performance).p} • A: {pam(installed.performance).a} • M: {pam(installed.performance).m}
                                  </Typography>
                                </Box>
                                {car.isFinalized ? null : (
                                  <Button size="small" onClick={() => onUninstall(installed.id)} disabled={!canEdit}>
                                    Quitar
                                  </Button>
                                )}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">Sin parte instalada.</Typography>
                            )}

                            {car.isFinalized ? null : (
                              <FormControl fullWidth disabled={!canEdit || available.length === 0}>
                                <InputLabel id={`assembly-install-${cat}`}>Instalar desde inventario</InputLabel>
                                <Select
                                  labelId={`assembly-install-${cat}`}
                                  label="Instalar desde inventario"
                                  value=""
                                  onChange={(e) => onInstall(e.target.value)}
                                >
                                  {available.map((i) => (
                                    <MenuItem key={i.id} value={i.id}>
                                      {i.partName} • qty {i.qty} • P {pam(i.performance).p} / A {pam(i.performance).a} / M {pam(i.performance).m}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            )}

                            {car.isFinalized ? (
                              <Typography variant="caption" color="text.secondary">
                                Carro finalizado: para modificar el armado, usá “Editar carro”.
                              </Typography>
                            ) : available.length === 0 ? (
                              <Typography variant="caption" color="text.secondary">
                                No hay stock en inventario para esta categoría.
                              </Typography>
                            ) : null}
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              </>
            )}
          </>
        )}
      </Stack>
    </Box>
  );
}
