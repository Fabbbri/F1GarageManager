import { createTheme, alpha, darken } from "@mui/material/styles";

const baseTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#ff1e1e" }, // vibe F1
    background: { default: "#0b0f14", paper: "#111823" },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: ["Inter", "system-ui", "Arial"].join(","),
  },
});

export const theme = createTheme(baseTheme, {
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 800,
          borderRadius: 12,
          letterSpacing: 0.2,
          position: "relative",
          overflow: "hidden",

          // Keep content above gradient layers
          "& .MuiButton-startIcon, & .MuiButton-endIcon, & .MuiButton-icon, & .MuiButton-label": {
            position: "relative",
            zIndex: 1,
          },
          "& > *": {
            position: "relative",
            zIndex: 1,
          },

          // Base translucent gradient for ALL buttons
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0,
            transition: "opacity 160ms ease",
            backgroundImage: `linear-gradient(135deg,
              ${alpha(baseTheme.palette.primary.main, 0.28)} 0%,
              ${alpha(darken(baseTheme.palette.primary.main, 0.25), 0.18)} 45%,
              ${alpha(baseTheme.palette.common.white, 0.06)} 100%
            )`,
          },

          // Shiny translucent hover overlay
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0,
            transition: "opacity 160ms ease",
            backgroundImage: `linear-gradient(135deg,
              ${alpha(baseTheme.palette.common.white, 0.18)} 0%,
              ${alpha(baseTheme.palette.common.white, 0.08)} 45%,
              ${alpha(baseTheme.palette.common.white, 0)} 75%
            )`,
          },

          // Apply base gradient per variant
          "&.MuiButton-contained::before": { opacity: 1 },
          "&.MuiButton-outlined::before": { opacity: 0.65 },
          "&.MuiButton-text::before": { opacity: 0.45 },

          "&:hover::after": { opacity: 1 },
          "&.Mui-focusVisible::after": { opacity: 1 },
          "&.Mui-disabled::before, &.Mui-disabled::after": { opacity: 0 },
        },

        contained: {
          // translucent feel, still reads as primary action
          backgroundColor: alpha(baseTheme.palette.primary.main, 0.12),
          border: `1px solid ${alpha(baseTheme.palette.primary.main, 0.35)}`,
          boxShadow: `0 10px 24px ${alpha(baseTheme.palette.primary.main, 0.18)}`,
          "&:hover": {
            backgroundColor: alpha(baseTheme.palette.primary.main, 0.16),
            boxShadow: `0 12px 28px ${alpha(baseTheme.palette.primary.main, 0.24)}`,
          },
        },

        outlined: {
          borderColor: alpha(baseTheme.palette.primary.main, 0.55),
          "&:hover": {
            borderColor: alpha(baseTheme.palette.primary.main, 0.85),
          },
        },

        text: {
          "&:hover": {
            backgroundColor: alpha(baseTheme.palette.primary.main, 0.06),
          },
        },
      },
    },

    MuiIconButton: {
      styleOverrides: {
        root: {
          position: "relative",
          overflow: "hidden",

          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0,
            transition: "opacity 160ms ease",
            backgroundImage: `linear-gradient(135deg,
              ${alpha(baseTheme.palette.primary.main, 0.24)} 0%,
              ${alpha(darken(baseTheme.palette.primary.main, 0.25), 0.14)} 45%,
              ${alpha(baseTheme.palette.common.white, 0.06)} 100%
            )`,
          },
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0,
            transition: "opacity 160ms ease",
            backgroundImage: `linear-gradient(135deg,
              ${alpha(baseTheme.palette.common.white, 0.18)} 0%,
              ${alpha(baseTheme.palette.common.white, 0.08)} 45%,
              ${alpha(baseTheme.palette.common.white, 0)} 75%
            )`,
          },

          "&:hover::before": { opacity: 0.7 },
          "&:hover::after": { opacity: 1 },
          "&.Mui-focusVisible::before": { opacity: 0.7 },
          "&.Mui-focusVisible::after": { opacity: 1 },
          "&.Mui-disabled::before, &.Mui-disabled::after": { opacity: 0 },

          "& > *": {
            position: "relative",
            zIndex: 1,
          },
        },
      },
    },

    MuiFab: {
      defaultProps: {
        disableRipple: false,
      },
      styleOverrides: {
        root: {
          position: "relative",
          overflow: "hidden",
          border: `1px solid ${alpha(baseTheme.palette.primary.main, 0.35)}`,
          backgroundColor: alpha(baseTheme.palette.primary.main, 0.12),
          boxShadow: `0 12px 28px ${alpha(baseTheme.palette.primary.main, 0.18)}`,

          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 1,
            backgroundImage: `linear-gradient(135deg,
              ${alpha(baseTheme.palette.primary.main, 0.28)} 0%,
              ${alpha(darken(baseTheme.palette.primary.main, 0.25), 0.18)} 45%,
              ${alpha(baseTheme.palette.common.white, 0.06)} 100%
            )`,
          },
          "&::after": {
            content: '""',
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0,
            transition: "opacity 160ms ease",
            backgroundImage: `linear-gradient(135deg,
              ${alpha(baseTheme.palette.common.white, 0.18)} 0%,
              ${alpha(baseTheme.palette.common.white, 0.08)} 45%,
              ${alpha(baseTheme.palette.common.white, 0)} 75%
            )`,
          },

          "&:hover": {
            backgroundColor: alpha(baseTheme.palette.primary.main, 0.16),
            boxShadow: `0 14px 32px ${alpha(baseTheme.palette.primary.main, 0.24)}`,
          },
          "&:hover::after": { opacity: 1 },
          "&.Mui-focusVisible::after": { opacity: 1 },
          "&.Mui-disabled::before, &.Mui-disabled::after": { opacity: 0 },

          "& > *": {
            position: "relative",
            zIndex: 1,
          },
        },
      },
    },
  },
});
