import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Stack,
  Alert,
  Button,
  TextField,
  MenuItem,
  Divider,
  Chip,
  IconButton,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";

import { getSession } from "../services/auth";
import { listTracks, createTrack, softDeleteTrack } from "../services/tracks";
import { listDriversFinalized } from "../services/users";
import { listSimulationResults, createSimulation } from "../services/simulations";

// Tabs
const TAB_SIM = "TAB_SIM";
const TAB_TRACKS = "TAB_TRACKS";
const TAB_RESULTS = "TAB_RESULTS";

const CURVE_DISTANCE_KM = 0.3;

export default function Races() {
  const session = getSession();
  const isAdmin = useMemo(() => session?.role === "ADMIN", [session]);

  const [tab, setTab] = useState(TAB_SIM);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // DB data
  const [tracks, setTracks] = useState([]);
  const [drivers, setDrivers] = useState([]); // drivers finalizados
  const [results, setResults] = useState([]);

  const [loadingTracks, setLoadingTracks] = useState(true);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [loadingResults, setLoadingResults] = useState(true);

  // --- SIMULATION UI ---
  const [simTrackId, setSimTrackId] = useState("");
  const [simSelectedDriverId, setSimSelectedDriverId] = useState("");
  const [simParticipants, setSimParticipants] = useState([]); // array of userId (drivers)

  const canStartSim = useMemo(() => {
    return !!simTrackId && simParticipants.length >= 3;
  }, [simTrackId, simParticipants]);

  // --- CREATE TRACK UI ---
  const [tName, setTName] = useState("");
  const [tDistanceKm, setTDistanceKm] = useState("");
  const [tCurves, setTCurves] = useState("");

  const minDistance = useMemo(() => {
    const curves = Number.parseInt(String(tCurves || "0"), 10);
    if (!Number.isFinite(curves) || curves <= 0) return 0;
    return curves * CURVE_DISTANCE_KM;
  }, [tCurves]);

  // Regla fija (igual a SP). Si la tenés en otro lado, ajustala.
  const CURVE_FIXED_KM = 0.3;

  // --- RESULTS UI ---
  const [resMode, setResMode] = useState("general"); // general | track | driver | race
  const [resTrackId, setResTrackId] = useState("");
  const [resDriverId, setResDriverId] = useState("");
  const [resSimulationId, setResSimulationId] = useState("");
  const [sortBy, setSortBy] = useState("points"); // points | time

  // helpers
  const trackById = useMemo(() => {
    const m = new Map();
    (tracks || []).forEach((t) => m.set(String(t.id), t));
    return m;
  }, [tracks]);

  const driverById = useMemo(() => {
    const m = new Map();
    (drivers || []).forEach((d) => m.set(String(d.id), d));
    return m;
  }, [drivers]);

  const races = useMemo(() => {
    // construye lista de "carreras" únicas desde results, por simulationId
    const m = new Map();
    (results || []).forEach((r) => {
      const sid = String(r.simulationId ?? r.SimulationId ?? "");
      if (!sid) return;
      if (!m.has(sid)) {
        m.set(sid, {
          simulationId: sid,
          trackId: String(r.trackId ?? r.TrackId ?? ""),
          startedAt: String(r.startedAt ?? r.StartedAt ?? r.date ?? r.Date ?? ""),
        });
      }
    });
    // ordenar por fecha desc si existe
    return Array.from(m.values()).sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));
  }, [results]);

  async function loadTracks() {
    setLoadingTracks(true);
    try {
      const data = await listTracks({ onlyActive: true });
      setTracks(data.tracks || data);
    } finally {
      setLoadingTracks(false);
    }
  }

  async function loadDrivers() {
    setLoadingDrivers(true);
    try {
      const data = await listDriversFinalized();
      // backend puede devolver { users: [...] } o { drivers: [...] } o [...]
      setDrivers(data.users || data.drivers || data);
    } finally {
      setLoadingDrivers(false);
    }
  }

  async function loadResults() {
    setLoadingResults(true);
    try {
      const params = {};
      if (resMode === "track" && resTrackId) params.trackId = resTrackId;
      if (resMode === "driver" && resDriverId) params.driverUserId = resDriverId;
      if (resMode === "race" && resSimulationId) params.simulationId = resSimulationId;

      const data = await listSimulationResults(params);
      setResults(data.results || data);
    } finally {
      setLoadingResults(false);
    }
  }

  // LOAD inicial
  useEffect(() => {
    (async () => {
      setError("");
      setSuccess("");
      try {
        await Promise.all([loadTracks(), loadDrivers()]);
        await loadResults();
      } catch (e) {
        setError(e.message || "Error cargando datos");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // recargar resultados al cambiar filtro
  useEffect(() => {
    (async () => {
      try {
        setError("");
        await loadResults();
      } catch (e) {
        setError(e.message || "Error cargando resultados");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resMode, resTrackId, resDriverId, resSimulationId]);

  // ---- Actions ----

  const addParticipant = () => {
    if (!simSelectedDriverId) return;
    if (simParticipants.includes(simSelectedDriverId)) return;
    setSimParticipants((prev) => [...prev, simSelectedDriverId]);
    setSimSelectedDriverId("");
  };

  const removeParticipant = (driverId) => {
    setSimParticipants((prev) => prev.filter((id) => id !== driverId));
  };

  const onStartSimulation = () => {
    // NO hace nada aún
    // (cuando lo conecten, deberían usar SPs:
    //  dbo.Simulation_Create
    //  dbo.Simulation_AddResult (por participante)
    //  dbo.Simulation_SetPositionsAndPointsByTime)
    setSuccess("Simulación lista (UI). El cálculo real lo implementan tus compañeros.");
  };


  const onCreateTrack = async () => {
    try {
      setError("");
      setSuccess("");

      const distanceKm = Number(tDistanceKm);
      const curves = Number(tCurves);

      if (!tName.trim()) throw new Error("Nombre requerido.");
      if (!Number.isFinite(distanceKm) || distanceKm <= 0) throw new Error("Distancia inválida.");
      if (!Number.isInteger(curves) || curves < 0) throw new Error("Curvas inválidas.");
      if (distanceKm < curves * CURVE_FIXED_KM) {
        throw new Error(`Distancia debe ser >= curvas * ${CURVE_FIXED_KM} km`);
      }

      await createTrack({ name: tName.trim(), distanceKm, curves });
      setSuccess("Pista creada.");
      setTName("");
      setTDistanceKm("");
      setTCurves("");
      await loadTracks();
    } catch (e) {
      setError(e.message || "Error creando pista");
    }
  };

  const onDeleteTrack = async (trackId) => {
    try {
      setError("");
      setSuccess("");
      await softDeleteTrack(trackId);
      setSuccess("Pista desactivada.");
      await loadTracks();
    } catch (e) {
      setError(e.message || "Error eliminando pista");
    }
  };

  // Ordenamiento UI (aunque backend puede devolver ya ordenado)
  const sortedResults = useMemo(() => {
    const arr = Array.isArray(results) ? [...results] : [];

    const getPoints = (x) => Number(x.points ?? x.Points ?? 0);
    const getTime = (x) => Number(x.timeSec ?? x.TimeSeconds ?? x.totalSec ?? x.TotalSeconds ?? 0);

    arr.sort((a, b) => {
      if (sortBy === "points") {
        const dp = getPoints(b) - getPoints(a);
        if (dp !== 0) return dp;
        return getTime(a) - getTime(b);
      }
      // por tiempo
      const dt = getTime(a) - getTime(b);
      if (dt !== 0) return dt;
      return getPoints(b) - getPoints(a);
    });

    return arr;
  }, [results, sortBy]);

  // render
  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={800}>
          Races
        </Typography>

        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        <Card>
          <CardContent>
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab label="Simulación" value={TAB_SIM} />
              <Tab label="Creación de pistas" value={TAB_TRACKS} />
              <Tab label="Resultados" value={TAB_RESULTS} />
            </Tabs>
          </CardContent>
        </Card>

        {/* ====================== SIMULACIÓN ====================== */}
        {tab === TAB_SIM && (
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography fontWeight={800}>Simulación</Typography>

                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <TextField
                    select
                    fullWidth
                    label="Pista"
                    value={simTrackId}
                    onChange={(e) => setSimTrackId(e.target.value)}
                    disabled={loadingTracks}
                  >
                    <MenuItem value="">Seleccionar...</MenuItem>
                    {(tracks || []).map((t) => (
                      <MenuItem key={t.id} value={String(t.id)}>
                        {t.name} • {t.distanceKm} km • curvas {t.curves}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    fullWidth
                    label="Agregar participante (Driver finalizado)"
                    value={simSelectedDriverId}
                    onChange={(e) => setSimSelectedDriverId(e.target.value)}
                    disabled={loadingDrivers}
                  >
                    <MenuItem value="">Seleccionar...</MenuItem>
                    {(drivers || [])
                      .filter((d) => !simParticipants.includes(String(d.id)))
                      .map((d) => (
                        <MenuItem key={d.id} value={String(d.id)}>
                          {d.name} ({d.email || "sin email"})
                        </MenuItem>
                      ))}
                  </TextField>

                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={addParticipant}
                    disabled={!simSelectedDriverId}
                    sx={{ minWidth: 160 }}
                  >
                    Agregar
                  </Button>
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {simParticipants.length === 0 ? (
                    <Typography color="text.secondary">Sin participantes.</Typography>
                  ) : (
                    simParticipants.map((id) => {
                      const d = driverById.get(String(id));
                      return (
                        <Chip
                          key={id}
                          label={d ? d.name : id}
                          onDelete={() => removeParticipant(String(id))}
                          sx={{ mr: 1, mb: 1 }}
                        />
                      );
                    })
                  )}
                </Stack>

                <Divider />

                <Stack spacing={1} alignItems="center">
                  <Button
                    size="large"
                    variant="contained"
                    startIcon={<PlayArrowIcon />}
                    disabled={!canStartSim}
                    onClick={onStartSimulation}
                    sx={{ px: 6, py: 1.6, borderRadius: 3 }}
                  >
                    Empezar simulación
                  </Button>


                  <Typography variant="body2" color="text.secondary">
                    Requisitos: pista seleccionada + mínimo 3 participantes.
                  </Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* ====================== CREACIÓN DE PISTAS ====================== */}
        {tab === TAB_TRACKS && (
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography fontWeight={800}>Creación de pistas</Typography>

                {!isAdmin && (
                  <Alert severity="info">
                    Solo ADMIN puede crear/eliminar pistas.
                  </Alert>
                )}

                {isAdmin && (
                  <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                    <TextField label="Nombre" value={tName} onChange={(e) => setTName(e.target.value)} fullWidth />
                    <TextField
                      label="Distancia (km)"
                      value={tDistanceKm}
                      onChange={(e) => setTDistanceKm(e.target.value.replace(/[^\d.]/g, ""))}
                      fullWidth
                    />
                    <TextField
                      label="Curvas"
                      value={tCurves}
                      onChange={(e) => setTCurves(e.target.value.replace(/[^\d]/g, ""))}
                      fullWidth
                    />
                    <Button variant="contained" onClick={onCreateTrack}>
                      Crear
                    </Button>
                  </Stack>
                )}

                <Typography variant="body2" color="text.secondary">
                  Regla: distancia {'>'}= curvas * {CURVE_DISTANCE_KM} km. (mínimo actual:{" "}
                <strong>{minDistance.toFixed(2)} km</strong>)
                </Typography>

                <Divider />

                {loadingTracks ? (
                  <Typography color="text.secondary">Cargando pistas...</Typography>
                ) : (tracks || []).length === 0 ? (
                  <Typography color="text.secondary">No hay pistas.</Typography>
                ) : (
                  <Stack spacing={1}>
                    {(tracks || []).map((t) => (
                      <Card key={t.id} variant="outlined">
                        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography fontWeight={800}>{t.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {t.distanceKm} km • curvas {t.curves}
                            </Typography>
                          </Box>

                          {isAdmin && (
                            <Tooltip title="Soft delete (Active = 0)">
                              <IconButton color="error" onClick={() => onDeleteTrack(t.id)}>
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}

        {/* ====================== RESULTADOS ====================== */}
        {tab === TAB_RESULTS && (
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography fontWeight={800}>Resultados</Typography>

                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <TextField select fullWidth label="Búsqueda" value={resMode} onChange={(e) => setResMode(e.target.value)}>
                    <MenuItem value="general">General</MenuItem>
                    <MenuItem value="track">Por pista</MenuItem>
                    <MenuItem value="driver">Por conductor</MenuItem>
                    <MenuItem value="race">Por carrera</MenuItem>
                  </TextField>

                  <TextField select fullWidth label="Ordenar por" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <MenuItem value="points">Puntos</MenuItem>
                    <MenuItem value="time">Tiempo</MenuItem>
                  </TextField>

                  {resMode === "track" && (
                    <TextField select fullWidth label="Pista" value={resTrackId} onChange={(e) => setResTrackId(e.target.value)}>
                      <MenuItem value="">Seleccionar...</MenuItem>
                      {(tracks || []).map((t) => (
                        <MenuItem key={t.id} value={String(t.id)}>
                          {t.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}

                  {resMode === "driver" && (
                    <TextField select fullWidth label="Conductor" value={resDriverId} onChange={(e) => setResDriverId(e.target.value)}>
                      <MenuItem value="">Seleccionar...</MenuItem>
                      {(drivers || []).map((d) => (
                        <MenuItem key={d.id} value={String(d.id)}>
                          {d.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}

                  {resMode === "race" && (
                    <TextField select fullWidth label="Carrera (simulationId)" value={resSimulationId} onChange={(e) => setResSimulationId(e.target.value)}>
                      <MenuItem value="">Seleccionar...</MenuItem>
                      {races.map((x) => (
                        <MenuItem key={x.simulationId} value={x.simulationId}>
                          {(trackById.get(x.trackId)?.name || x.trackId || "Pista")} • {x.startedAt || "sin fecha"} • {x.simulationId}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                </Stack>

                <Divider />

                {loadingResults ? (
                  <Typography color="text.secondary">Cargando resultados...</Typography>
                ) : sortedResults.length === 0 ? (
                  <Typography color="text.secondary">Sin resultados.</Typography>
                ) : (
                  <Stack spacing={1}>
                    {sortedResults.map((r, idx) => {
                      const simulationId = String(r.simulationId ?? r.SimulationId ?? "");
                      const trackId = String(r.trackId ?? r.TrackId ?? "");
                      const driverId = String(r.driverUserId ?? r.DriverUserId ?? r.driverId ?? r.DriverId ?? "");
                      const driver = driverById.get(driverId);

                      const points = Number(r.points ?? r.Points ?? 0);
                      const time = Number(r.timeSec ?? r.TimeSeconds ?? r.totalSec ?? r.TotalSeconds ?? 0);
                      const pos = Number(r.position ?? r.Position ?? 0);

                      return (
                        <Card key={`${simulationId}-${idx}`} variant="outlined">
                          <CardContent sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                            <Box sx={{ flex: 1 }}>
                              <Typography fontWeight={800}>
                                #{pos || idx + 1} • {driver?.name || driverId || "Driver"}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Pista: {trackById.get(trackId)?.name || trackId || "—"} •
                                Carrera: {simulationId || "—"}
                              </Typography>
                            </Box>

                            <Stack alignItems="flex-end">
                              <Typography fontWeight={800}>{points} pts</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {time ? `${time.toFixed(2)} s` : "—"}
                              </Typography>
                            </Stack>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Box>
  );
}
