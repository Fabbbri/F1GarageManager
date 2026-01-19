import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
} from "@mui/material";

import { getTeam } from "../services/teams";

function fmt(n, digits = 2) {
  if (n == null) return "—";
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return v.toFixed(digits);
}

export default function CarSpecsDialog({ open, onClose, result }) {
  const carId = result?.carId || null;
  const teamId = result?.teamId || null;

  const [loadingSetup, setLoadingSetup] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [setupRows, setSetupRows] = useState([]);

  const categories = useMemo(
    () => [
      { key: "Power Unit", label: "Power Unit" },
      { key: "Paquete aerodinámico", label: "Aerodinámica" },
      { key: "Neumáticos", label: "Llantas" },
      { key: "Suspensión", label: "Suspensión" },
      { key: "Caja de cambios", label: "Caja" },
    ],
    []
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!open) return;
      if (!teamId || !carId) {
        setSetupRows([]);
        return;
      }

      setLoadingSetup(true);
      setSetupError("");
      try {
        const team = await getTeam(teamId);
        if (!alive) return;

        const car = (team?.cars || []).find((c) => String(c?.id) === String(carId));
        const installed = Array.isArray(car?.installedParts) ? car.installedParts : [];

        const byCategory = new Map();
        for (const p of installed) {
          const k = String(p?.categoryKey || p?.category || "").trim();
          if (!k) continue;
          if (!byCategory.has(k)) byCategory.set(k, []);
          byCategory.get(k).push(p);
        }

        const rows = categories.map((c) => {
          const list = byCategory.get(c.key) || [];
          const part = list[0] || null;
          const perf = part?.performance || {};
          return {
            category: c.label,
            partName: part?.partName || "—",
            p: perf?.p ?? 0,
            a: perf?.a ?? 0,
            m: perf?.m ?? 0,
          };
        });

        setSetupRows(rows);
      } catch (e) {
        if (!alive) return;
        setSetupError(e?.message || "Error cargando setup del carro");
        setSetupRows([]);
      } finally {
        if (!alive) return;
        setLoadingSetup(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, teamId, carId, categories]);
  const totals = {
    P: result?.totalP,
    A: result?.totalA,
    M: result?.totalM,
    H: result?.totalH,
  };

  const speeds = {
    VRecta: result?.vRecta,
    VCurva: result?.vCurva,
    PenaltySeconds: result?.penaltySeconds,
  };

  const timeSec = result?.timeSec;
  const dateLabel = result?.startedAt ? new Date(result.startedAt).toLocaleString() : "—";
  const simulationId = result?.simulationId || "—";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: "rgba(17, 24, 35, 0.96)",
          border: "1px solid rgba(255,255,255,0.10)",
          backdropFilter: "blur(10px)",
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 900 }}>Detalles del carro</DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <Stack spacing={1.5}>
          <Typography variant="body2" color="text.secondary">
            {result?.driverName ? `Conductor: ${result.driverName}` : "Conductor: —"}
            {result?.teamName ? ` • Equipo: ${result.teamName}` : " • Equipo: —"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {`Pista: ${result?.trackName || "—"} • Fecha: ${dateLabel}`}
          </Typography>

          <Divider />

          {setupError && <Alert severity="error">{setupError}</Alert>}

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1.2fr" },
              gap: 2,
              alignItems: "start",
            }}
          >
            {/* Left: Totales + Cálculos */}
            <Box
              sx={{
                borderRadius: 2,
                border: "1px solid rgba(255,255,255,0.10)",
                bgcolor: "rgba(255,255,255,0.03)",
                p: 2,
              }}
            >
              <Typography fontWeight={900} sx={{ mb: 1 }}>
                Totales
              </Typography>

              <Stack direction="row" flexWrap="wrap" sx={{ mb: 2, gap: 1.2 }}>
                <Chip label={`P: ${fmt(totals.P, 0)}`} />
                <Chip label={`A: ${fmt(totals.A, 0)}`} />
                <Chip label={`M: ${fmt(totals.M, 0)}`} />
                <Chip label={`H: ${fmt(totals.H, 0)}`} />
              </Stack>

              <Typography fontWeight={900} sx={{ mb: 1 }}>
                Cálculos
              </Typography>
              <Stack direction="row" flexWrap="wrap" sx={{ gap: 1.2 }}>
                <Chip label={`Vrecta: ${fmt(speeds.VRecta, 2)} s`} />
                <Chip label={`Vcurva: ${fmt(speeds.VCurva, 2)} s`} />
                <Chip label={`Penalización: ${fmt(speeds.PenaltySeconds, 0)} s`} />
                <Chip label={`Tiempo total: ${fmt(timeSec, 0)} s`} />
              </Stack>

             
            </Box>

            {/* Right: Setup table */}
            <Box
              sx={{
                borderRadius: 2,
                border: "1px solid rgba(255,255,255,0.10)",
                bgcolor: "rgba(255,255,255,0.03)",
                p: 2,
              }}
            >
              <Typography fontWeight={900} sx={{ mb: 1 }}>
                Setup
              </Typography>

              <TableContainer component={Paper} variant="outlined" sx={{ bgcolor: "transparent" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Categoría</strong></TableCell>
                      <TableCell><strong>Parte</strong></TableCell>
                      <TableCell align="right"><strong>P</strong></TableCell>
                      <TableCell align="right"><strong>A</strong></TableCell>
                      <TableCell align="right"><strong>M</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadingSetup ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Typography variant="body2" color="text.secondary">
                            Cargando setup…
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : setupRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Typography variant="body2" color="text.secondary">
                            No hay setup disponible.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      setupRows.map((row) => (
                        <TableRow key={row.category} hover>
                          <TableCell>{row.category}</TableCell>
                          <TableCell>{row.partName}</TableCell>
                          <TableCell align="right">{fmt(row.p, 0)}</TableCell>
                          <TableCell align="right">{fmt(row.a, 0)}</TableCell>
                          <TableCell align="right">{fmt(row.m, 0)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
