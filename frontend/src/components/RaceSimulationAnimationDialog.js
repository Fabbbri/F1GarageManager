import React, { useMemo } from "react";
import { Box, CircularProgress, Dialog, DialogContent, Typography } from "@mui/material";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function RaceSimulationAnimationDialog({ open, mode = "race", durationMs = 7000 }) {
  const durSec = useMemo(() => {
    const ms = Number(durationMs);
    return clamp(Number.isFinite(ms) ? ms : 7000, 2000, 20000) / 1000;
  }, [durationMs]);

  const racePath =
    "M 120 170 " +
    // sweep up-left into a tighter bend
    "C 92 146, 98 106, 130 92 " +
    // long top straight-ish with gentle wave
    "C 170 74, 230 74, 270 92 " +
    "C 300 104, 332 104, 360 90 " +
    // fast right-hand hairpin
    "C 410 66, 448 98, 438 136 " +
    // opened S-bend (avoid bottom-right overlap)
    "C 432 174, 392 182, 368 208 " +
    "C 344 236, 382 256, 440 242 " +
    // bottom section back to left with more clearance
    "C 490 230, 480 260, 420 256 " +
    "C 344 252, 288 238, 252 220 " +
    // left complex and close
    "C 220 200, 186 214, 162 206 " +
    "C 134 196, 142 196, 120 170 Z";

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 4,
          overflow: "hidden",
          bgcolor: "rgba(17, 24, 35, 0.92)",
          border: "1px solid rgba(255,255,255,0.10)",
          backdropFilter: "blur(10px)",
        },
      }}
    >
      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" fontWeight={900} noWrap>
              {mode === "race" ? "Simulando carrera…" : "Procesando resultados…"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {mode === "race"
                ? "Los carros están dando vueltas en la pista."
                : "Esto puede tardar unos segundos más."}
            </Typography>
          </Box>

          {mode !== "race" && <CircularProgress size={28} />}
        </Box>

        <Box
          sx={{
            mt: 2.5,
            borderRadius: 3,
            border: "1px solid rgba(255,255,255,0.10)",
            bgcolor: "rgba(255,255,255,0.03)",
            p: 2,
          }}
        >
          {mode === "race" ? (
            <Box sx={{ width: "100%", display: "flex", justifyContent: "center" }}>
              <svg width="520" height="280" viewBox="0 0 520 280" role="img" aria-label="Race simulation">
                <defs>
                  <linearGradient id="trackGrad" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#e5e7eb" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0.20" />
                  </linearGradient>
                </defs>

                {/* Background */}
                <rect x="0" y="0" width="520" height="280" rx="18" fill="rgba(0,0,0,0.10)" />

                {/* Track */}
                <path
                  d={racePath}
                  stroke="url(#trackGrad)"
                  strokeWidth="30"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity="0.95"
                />

                {/* Inner border */}
                <path
                  d={racePath}
                  stroke="rgba(0,0,0,0.35)"
                  strokeWidth="2"
                  fill="none"
                  opacity="0.55"
                />

                {/* Center dashed line */}
                <path
                  d={racePath}
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="2"
                  strokeDasharray="8 14"
                  fill="none"
                  opacity="0.9"
                />

                {/* Cars */}
                {[
                  { fill: "rgba(255,255,255,0.82)", begin: 0, size: 9 },
                  { fill: "rgba(255,255,255,0.62)", begin: -(durSec * 0.21), size: 8 },
                  { fill: "rgba(255,255,255,0.48)", begin: -(durSec * 0.46), size: 8 },
                  { fill: "rgba(255,255,255,0.34)", begin: -(durSec * 0.71), size: 7 },
                ].map((car, i) => (
                  <g key={i}>
                    {/* Minimal car: small rounded capsule */}
                    <rect
                      x={-car.size / 2}
                      y={-car.size / 2}
                      width={car.size}
                      height={Math.max(6, car.size - 2)}
                      rx={Math.ceil(car.size / 3)}
                      fill={car.fill}
                      stroke="rgba(0,0,0,0.30)"
                      strokeWidth="1"
                    >
                      <animateMotion
                        dur={`${durSec}s`}
                        repeatCount="indefinite"
                        rotate="auto"
                        begin={`${car.begin}s`}
                        path={racePath}
                      />
                    </rect>
                  </g>
                ))}
              </svg>
            </Box>
          ) : (
            <Box sx={{ py: 6, textAlign: "center" }}>
              <Typography fontWeight={800}>Calculando…</Typography>
              <Typography variant="body2" color="text.secondary">
                Guardando resultados y asignando posiciones.
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
