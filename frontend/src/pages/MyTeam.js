import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Typography } from "@mui/material";

import { listTeams } from "../services/teams";

export default function MyTeam() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const teams = await listTeams();
        if (!alive) return;

        const t = Array.isArray(teams) && teams.length ? teams[0] : null;
        if (!t?.id) {
          setError("No tenés un equipo asignado todavía.");
          return;
        }

        navigate(`/teams/${t.id}`, { replace: true });
      } catch (e) {
        if (!alive) return;
        setError(e.message || "Error cargando tu equipo");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [navigate]);

  return (
    <Box sx={{ maxWidth: 900, mx: "auto" }}>
      {loading ? <Typography color="text.secondary">Cargando...</Typography> : null}
      {error ? <Alert severity="info">{error}</Alert> : null}
    </Box>
  );
}
