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

import { alpha, useTheme } from "@mui/material/styles";

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
  const theme = useTheme();
  const session = getSession();
  const canEdit = useMemo(() => ["ADMIN", "ENGINEER"].includes(session?.role), [session]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [team, setTeam] = useState(null);

  const [selectedCarId, setSelectedCarId] = useState("");

  const [focusedCategory, setFocusedCategory] = useState("");
  const [hoveredCategory, setHoveredCategory] = useState("");

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

  const missingCategories = useMemo(
    () => REQUIRED_CATEGORIES.filter((c) => !installedByCategory.has(c)),
    [installedByCategory]
  );

  const allRequiredInstalled = useMemo(() => missingCategories.length === 0, [missingCategories.length]);

  const activeCategory = useMemo(() => {
    const c = String(focusedCategory || "").trim();
    if (c && REQUIRED_CATEGORIES.includes(c)) return c;
    return missingCategories[0] || REQUIRED_CATEGORIES[0];
  }, [focusedCategory, missingCategories]);

  const onAssignDriver = async (driverId) => {
    setError("");
    try {
      const t = await assignCarDriver(selectedTeamId, selectedCarId, { driverId: driverId || null });
      setTeam(t);
    } catch (e) {
      setError(e.message || "Error asignando conductor");
    }
  };

  const onInstall = async (category, inventoryItemId) => {
    setError("");
    try {
      if (category) setFocusedCategory(category);
      const t = await installPart(selectedTeamId, selectedCarId, { inventoryItemId });
      setTeam(t);
    } catch (e) {
      setError(e.message || "Error instalando parte");
    }
  };

  const onUninstall = async (category, installedPartId) => {
    setError("");
    try {
      if (category) setFocusedCategory(category);
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

  useEffect(() => {
    // Reset focus when switching car/team
    setFocusedCategory("");
    setHoveredCategory("");
  }, [selectedTeamId, selectedCarId]);

  function categoryStatus(cat) {
    const installed = installedByCategory.get(cat);
    return {
      installed,
      isMissing: !installed,
      isActive: cat === activeCategory,
    };
  }

  function CarSchematic() {
    const isLocked = Boolean(car?.isFinalized);
    const activeInstalled = Boolean(installedByCategory.get(activeCategory));

    const zoneStyle = (cat, opts = {}) => {
      const st = categoryStatus(cat);
      const isHovered = !isLocked && cat === hoveredCategory;

      // When the car is fully assembled (all required categories installed),
      // avoid red entirely and show an all-green "ready" state.
      if (allRequiredInstalled) {
        const stroke = theme.palette.success.main;
        const fill = alpha(theme.palette.success.main, 0.12);
        const animation = "none";
        const strokeWidth = 3;

        return {
          stroke,
          fill,
          animation,
          strokeWidth,
          cursor: isLocked ? "default" : "pointer",
          ...opts,
        };
      }

      const isHot = st.isActive || isHovered;
      const hotMain = st.installed ? theme.palette.success.main : theme.palette.error.main;

      const stroke = st.isMissing
        ? theme.palette.error.main
        : isHot
          ? hotMain
          : st.installed
            ? theme.palette.success.main
            : theme.palette.divider;

      const fill = st.isMissing
        ? alpha(theme.palette.error.main, 0.12)
        : isHot
          ? alpha(hotMain, st.isActive ? 0.22 : 0.18)
          : st.installed
            ? alpha(theme.palette.success.main, 0.10)
            : "transparent";

      const animation = !isLocked && st.isActive ? "assemblyPulse 1.2s ease-in-out infinite" : "none";
      const strokeWidth = isHovered ? 4 : 3;

      return {
        stroke,
        fill,
        animation,
        strokeWidth,
        cursor: isLocked ? "default" : "pointer",
        ...opts,
      };
    };

    const bodyStroke = alpha(theme.palette.text.primary, 0.25);
    const bodyFill = alpha(theme.palette.text.primary, 0.04);

    return (
      <Box
        sx={{
          borderRadius: 2,
          border: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          p: 1.25,
          width: "100%",
          overflow: "hidden",
        }}
      >
        <Box
          component="svg"
          viewBox="0 0 280 560"
          aria-label="Esquema del carro"
          sx={{
            width: "100%",
            height: "auto",
            maxHeight: 520,
            display: "block",
            "@keyframes assemblyPulse": {
              "0%, 100%": { opacity: 1 },
              "50%": { opacity: 0.55 },
            },
            "@media (prefers-reduced-motion: reduce)": {
              "& [data-anim='pulse']": { animation: "none !important" },
            },
          }}
        >
          {/* Base F1 (top view, ilustración simple) */}
          {/* Rear wing (arriba) */}
          <rect x="66" y="16" width="148" height="14" rx="6" fill={alpha(theme.palette.text.primary, 0.06)} stroke={bodyStroke} />
          <rect x="52" y="10" width="24" height="26" rx="8" fill={alpha(theme.palette.text.primary, 0.06)} stroke={bodyStroke} />
          <rect x="204" y="10" width="24" height="26" rx="8" fill={alpha(theme.palette.text.primary, 0.06)} stroke={bodyStroke} />
          <rect x="128" y="30" width="24" height="18" rx="8" fill={alpha(theme.palette.text.primary, 0.05)} stroke={bodyStroke} />

          {/* Rear tires */}
          <rect x="30" y="78" width="44" height="96" rx="16" fill={alpha(theme.palette.text.primary, 0.14)} />
          <rect x="206" y="78" width="44" height="96" rx="16" fill={alpha(theme.palette.text.primary, 0.14)} />
          <rect x="36" y="90" width="32" height="72" rx="14" fill={alpha(theme.palette.text.primary, 0.08)} />
          <rect x="212" y="90" width="32" height="72" rx="14" fill={alpha(theme.palette.text.primary, 0.08)} />

          {/* Suspension arms (rear) */}
          <path d="M96 152 L78 142" stroke={alpha(theme.palette.text.primary, 0.25)} strokeWidth="3" strokeLinecap="round" />
          <path d="M96 152 L78 162" stroke={alpha(theme.palette.text.primary, 0.25)} strokeWidth="3" strokeLinecap="round" />
          <path d="M184 152 L202 142" stroke={alpha(theme.palette.text.primary, 0.25)} strokeWidth="3" strokeLinecap="round" />
          <path d="M184 152 L202 162" stroke={alpha(theme.palette.text.primary, 0.25)} strokeWidth="3" strokeLinecap="round" />

          {/* Main body (blue-ish via primary) */}
          <path
            d="M140 52
               C 124 72, 110 98, 108 124
               C 104 168, 106 214, 112 254
               C 118 292, 118 330, 114 360
               C 110 392, 98 420, 90 456
               C 86 474, 92 494, 112 510
               C 130 524, 150 524, 168 510
               C 188 494, 194 474, 190 456
               C 182 420, 170 392, 166 360
               C 162 330, 162 292, 168 254
               C 174 214, 176 168, 172 124
               C 170 98, 156 72, 140 52 Z"
            fill={alpha(theme.palette.primary.main, 0.28)}
            stroke={bodyStroke}
            strokeWidth="2"
          />

          {/* White stripes (use theme common.white) */}
          <path
            d="M118 270 C 108 310, 108 350, 106 388 C 104 420, 100 448, 106 474 C 112 496, 126 506, 140 504 C 128 468, 132 408, 140 360 C 146 320, 146 300, 142 270 Z"
            fill={alpha(theme.palette.common.white, 0.82)}
            opacity="0.9"
          />
          <path
            d="M162 270 C 172 310, 172 350, 174 388 C 176 420, 180 448, 174 474 C 168 496, 154 506, 140 504 C 152 468, 148 408, 140 360 C 134 320, 134 300, 138 270 Z"
            fill={alpha(theme.palette.common.white, 0.82)}
            opacity="0.9"
          />
          <rect x="132" y="270" width="16" height="210" rx="8" fill={alpha(theme.palette.text.primary, 0.25)} />

          {/* Sidepods */}
          <path d="M92 250 C 76 276, 74 316, 78 352 C 82 376, 96 388, 112 388 C 108 342, 110 294, 118 250 Z" fill={alpha(theme.palette.primary.main, 0.22)} />
          <path d="M188 250 C 204 276, 206 316, 202 352 C 198 376, 184 388, 168 388 C 172 342, 170 294, 162 250 Z" fill={alpha(theme.palette.primary.main, 0.22)} />

          {/* Cockpit + driver */}
          <path d="M120 218 C 120 186, 160 186, 160 218 L156 268 C 154 286, 126 286, 124 268 Z" fill={alpha(theme.palette.common.white, 0.7)} stroke={alpha(theme.palette.text.primary, 0.25)} />
          <circle cx="140" cy="170" r="18" fill={alpha(theme.palette.common.white, 0.65)} stroke={alpha(theme.palette.text.primary, 0.25)} />
          <path d="M126 198 Q140 182 154 198" fill="none" stroke={alpha(theme.palette.text.primary, 0.35)} strokeWidth="5" strokeLinecap="round" />

          {/* Front tires */}
          <rect x="34" y="380" width="40" height="86" rx="14" fill={alpha(theme.palette.text.primary, 0.14)} />
          <rect x="206" y="380" width="40" height="86" rx="14" fill={alpha(theme.palette.text.primary, 0.14)} />
          <rect x="40" y="392" width="28" height="62" rx="12" fill={alpha(theme.palette.text.primary, 0.08)} />
          <rect x="212" y="392" width="28" height="62" rx="12" fill={alpha(theme.palette.text.primary, 0.08)} />

          {/* Suspension arms (front) */}
          <path d="M110 370 L80 400" stroke={alpha(theme.palette.text.primary, 0.25)} strokeWidth="3" strokeLinecap="round" />
          <path d="M110 370 L80 442" stroke={alpha(theme.palette.text.primary, 0.25)} strokeWidth="3" strokeLinecap="round" />
          <path d="M170 370 L200 400" stroke={alpha(theme.palette.text.primary, 0.25)} strokeWidth="3" strokeLinecap="round" />
          <path d="M170 370 L200 442" stroke={alpha(theme.palette.text.primary, 0.25)} strokeWidth="3" strokeLinecap="round" />

          {/* Front wing (abajo) */}
          <rect x="54" y="500" width="172" height="18" rx="8" fill={alpha(theme.palette.primary.main, 0.26)} stroke={bodyStroke} />
          <rect x="60" y="518" width="160" height="26" rx="8" fill={alpha(theme.palette.primary.main, 0.22)} stroke={bodyStroke} />
          <rect x="48" y="512" width="18" height="34" rx="6" fill={alpha(theme.palette.primary.main, 0.22)} stroke={bodyStroke} />
          <rect x="214" y="512" width="18" height="34" rx="6" fill={alpha(theme.palette.primary.main, 0.22)} stroke={bodyStroke} />

          {/* Zone overlays (clickable) */}
          {/* Aero (wings + aero surfaces) */}
          <g
            role={isLocked ? undefined : "button"}
            tabIndex={isLocked ? -1 : 0}
            onClick={isLocked ? undefined : () => setFocusedCategory("Paquete aerodinámico")}
            onMouseEnter={isLocked || allRequiredInstalled ? undefined : () => setHoveredCategory("Paquete aerodinámico")}
            onMouseLeave={isLocked || allRequiredInstalled ? undefined : () => setHoveredCategory("")}
            onKeyDown={
              isLocked
                ? undefined
                : (e) => {
                    if (e.key === "Enter" || e.key === " ") setFocusedCategory("Paquete aerodinámico");
                  }
            }
          >
            <rect x="44" y="6" width="192" height="48" rx="18" {...zoneStyle("Paquete aerodinámico")} data-anim={categoryStatus("Paquete aerodinámico").isActive ? "pulse" : ""} />
            <rect x="40" y="494" width="200" height="58" rx="18" {...zoneStyle("Paquete aerodinámico")} data-anim={categoryStatus("Paquete aerodinámico").isActive ? "pulse" : ""} />
          </g>

          {/* Suspension (brazos / zona de suspensión) */}
          <g
            role={isLocked ? undefined : "button"}
            tabIndex={isLocked ? -1 : 0}
            onClick={isLocked ? undefined : () => setFocusedCategory("Suspensión")}
            onMouseEnter={isLocked || allRequiredInstalled ? undefined : () => setHoveredCategory("Suspensión")}
            onMouseLeave={isLocked || allRequiredInstalled ? undefined : () => setHoveredCategory("")}
            onKeyDown={
              isLocked
                ? undefined
                : (e) => {
                    if (e.key === "Enter" || e.key === " ") setFocusedCategory("Suspensión");
                  }
            }
          >
            <rect
              x="72"
              y="140"
              width="136"
              height="290"
              rx="28"
              {...zoneStyle("Suspensión")}
              data-anim={categoryStatus("Suspensión").isActive ? "pulse" : ""}
            />
          </g>

          {/* Tires (wheels area) */}
          <g
            role={isLocked ? undefined : "button"}
            tabIndex={isLocked ? -1 : 0}
            onClick={isLocked ? undefined : () => setFocusedCategory("Neumáticos")}
            onMouseEnter={isLocked || allRequiredInstalled ? undefined : () => setHoveredCategory("Neumáticos")}
            onMouseLeave={isLocked || allRequiredInstalled ? undefined : () => setHoveredCategory("")}
            onKeyDown={
              isLocked
                ? undefined
                : (e) => {
                    if (e.key === "Enter" || e.key === " ") setFocusedCategory("Neumáticos");
                  }
            }
          >
            <rect x="22" y="72" width="60" height="110" rx="22" {...zoneStyle("Neumáticos")} opacity="0.55" data-anim={categoryStatus("Neumáticos").isActive ? "pulse" : ""} />
            <rect x="198" y="72" width="60" height="110" rx="22" {...zoneStyle("Neumáticos")} opacity="0.55" data-anim={categoryStatus("Neumáticos").isActive ? "pulse" : ""} />
            <rect x="22" y="372" width="60" height="106" rx="22" {...zoneStyle("Neumáticos")} opacity="0.55" data-anim={categoryStatus("Neumáticos").isActive ? "pulse" : ""} />
            <rect x="194" y="372" width="60" height="106" rx="22" {...zoneStyle("Neumáticos")} opacity="0.55" data-anim={categoryStatus("Neumáticos").isActive ? "pulse" : ""} />
          </g>

          {/* Gearbox (parte trasera, cerca de ruedas traseras) */}
          <g
            role={isLocked ? undefined : "button"}
            tabIndex={isLocked ? -1 : 0}
            onClick={isLocked ? undefined : () => setFocusedCategory("Caja de cambios")}
            onMouseEnter={isLocked || allRequiredInstalled ? undefined : () => setHoveredCategory("Caja de cambios")}
            onMouseLeave={isLocked || allRequiredInstalled ? undefined : () => setHoveredCategory("")}
            onKeyDown={
              isLocked
                ? undefined
                : (e) => {
                    if (e.key === "Enter" || e.key === " ") setFocusedCategory("Caja de cambios");
                  }
            }
          >
            <rect
              x="96"
              y="60"
              width="88"
              height="120"
              rx="22"
              {...zoneStyle("Caja de cambios")}
              data-anim={categoryStatus("Caja de cambios").isActive ? "pulse" : ""}
            />
          </g>

          {/* Power Unit (zona central del cuerpo) */}
          <g
            role={isLocked ? undefined : "button"}
            tabIndex={isLocked ? -1 : 0}
            onClick={isLocked ? undefined : () => setFocusedCategory("Power Unit")}
            onMouseEnter={isLocked || allRequiredInstalled ? undefined : () => setHoveredCategory("Power Unit")}
            onMouseLeave={isLocked || allRequiredInstalled ? undefined : () => setHoveredCategory("")}
            onKeyDown={
              isLocked
                ? undefined
                : (e) => {
                    if (e.key === "Enter" || e.key === " ") setFocusedCategory("Power Unit");
                  }
            }
          >
            <rect
              x="94"
              y="220"
              width="92"
              height="160"
              rx="22"
              {...zoneStyle("Power Unit")}
              data-anim={categoryStatus("Power Unit").isActive ? "pulse" : ""}
            />
          </g>

          {/* Minimal label */}
          <text x="140" y="40" textAnchor="middle" fontSize="11" fill={alpha(theme.palette.text.primary, 0.55)}>
            F1
          </text>
        </Box>

        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
          <Chip
            size="small"
            label={`Actual: ${activeCategory}`}
            color={!activeCategory ? "default" : activeInstalled ? "success" : "error"}
          />
          <Chip
            size="small"
            label={missingCategories.length ? `${missingCategories.length} pendiente(s)` : "Listo para finalizar"}
            color={missingCategories.length ? "error" : "success"}
            variant="outlined"
          />
          <Chip size="small" label={`P ${totals.p} • A ${totals.a} • M ${totals.m}`} variant="outlined" />
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: "wrap" }}>
          {REQUIRED_CATEGORIES.map((cat) => {
            const st = categoryStatus(cat);
            const isHovered = !car?.isFinalized && hoveredCategory === cat;
            const color = allRequiredInstalled ? "success" : st.isMissing ? "error" : st.installed ? "success" : "default";
            const variant = allRequiredInstalled ? "outlined" : st.isActive || isHovered ? "filled" : "outlined";

            return (
              <Chip
                key={cat}
                size="small"
                label={cat}
                color={color}
                variant={variant}
                onClick={car?.isFinalized ? undefined : () => setFocusedCategory(cat)}
                onMouseEnter={car?.isFinalized || allRequiredInstalled ? undefined : () => setHoveredCategory(cat)}
                onMouseLeave={car?.isFinalized || allRequiredInstalled ? undefined : () => setHoveredCategory("")}
                sx={{
                  fontWeight: allRequiredInstalled ? 700 : st.isActive ? 900 : 700,
                }}
              />
            );
          })}
        </Stack>
      </Box>
    );
  }

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
                    <Stack spacing={1.5}>
                      <Box>
                        <Typography fontWeight={900}>Carro (vista rápida)</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {car.isFinalized
                            ? "Carro finalizado: solo lectura."
                            : `Seleccioná una categoría para instalar. Actual: ${activeCategory}`}
                        </Typography>
                      </Box>

                      <CarSchematic />
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
                    const isActive = cat === activeCategory;
                    const available = (team.inventory || [])
                      .filter((i) => Number(i.qty || 0) > 0)
                      .filter((i) => String(i.category || "").trim() === cat);

                    return (
                      <Card
                        key={cat}
                        variant="outlined"
                        onClick={() => (car.isFinalized ? null : setFocusedCategory(cat))}
                        sx={{
                          borderColor: installed ? "success.main" : "error.main",
                          cursor: car.isFinalized ? "default" : "pointer",
                        }}
                      >
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
                                  <Button size="small" onClick={() => onUninstall(cat, installed.id)} disabled={!canEdit}>
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
                                  onChange={(e) => onInstall(cat, e.target.value)}
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
