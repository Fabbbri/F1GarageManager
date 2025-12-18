import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Card, CardContent, Typography, Stack, Button, TextField, Alert } from "@mui/material";

import { getSession } from "../services/auth";
import { listTeams, createTeam, deleteTeam } from "../services/teams";

export default function Teams() {
  const navigate = useNavigate();

  const session = getSession();
  const isAdmin = useMemo(() => session?.role === "ADMIN", [session]);

  const [teams, setTeams] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [creating, setCreating] = useState(false);

  async function reload() {
    setError("");
    setLoading(true);
    try {
      const t = await listTeams();
      setTeams(t);
    } catch (e) {
      setError(e.message || "Error cargando equipos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const onCreate = async (e) => {
    e.preventDefault();
    setError("");
    setCreating(true);
    try {
      const team = await createTeam({ name, country });
      setTeams((prev) => [team, ...prev]);
      setName("");
      setCountry("");
    } catch (e2) {
      setError(e2.message || "Error creando equipo");
    } finally {
      setCreating(false);
    }
  };

  const onDelete = async (e, team) => {
    e.stopPropagation(); // ✅ evita navegar al detalle
    setError("");

    const ok = window.confirm(`¿Eliminar el equipo "${team.name}"?`);
    if (!ok) return;

    try {
      await deleteTeam(team.id);
      setTeams((prev) => prev.filter((x) => x.id !== team.id));
    } catch (err) {
      setError(err.message || "Error eliminando equipo");
    }
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: "auto", p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={800}>
          Equipos
        </Typography>

        {error && <Alert severity="error">{error}</Alert>}

        {isAdmin && (
          <Card>
            <CardContent>
              <Typography fontWeight={700} sx={{ mb: 1 }}>
                Crear equipo
              </Typography>

              <Box component="form" onSubmit={onCreate}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <TextField
                    label="Nombre"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="País"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    fullWidth
                  />
                  <Button type="submit" variant="contained" disabled={creating}>
                    {creating ? "Creando..." : "Crear"}
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent>
            <Typography fontWeight={700} sx={{ mb: 1 }}>
              Lista
            </Typography>

            {loading ? (
              <Typography color="text.secondary">Cargando...</Typography>
            ) : teams.length === 0 ? (
              <Typography color="text.secondary">No hay equipos aún.</Typography>
            ) : (
              <Stack spacing={1}>
                {teams.map((t) => (
                  <Box
                    key={t.id}
                    onClick={() => navigate(`/teams/${t.id}`)}
                    sx={{
                      cursor: "pointer",
                      p: 2,
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 2,
                      "&:hover": { backgroundColor: "rgba(255,255,255,0.04)" },
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Typography fontWeight={800}>{t.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        País: {t.country || "—"} • Presupuesto: {t.budget?.total ?? 0}
                      </Typography>
                    </Box>

                    {isAdmin && (
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={(e) => onDelete(e, t)}
                      >
                        Eliminar
                      </Button>
                    )}
                  </Box>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
