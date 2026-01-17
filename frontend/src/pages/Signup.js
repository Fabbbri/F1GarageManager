import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signup } from "../services/auth";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
  MenuItem,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Chip,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";

export default function Signup() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("ENGINEER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const passwordFeedback = useMemo(() => {
    const pwd = String(password || "");
    const cleanEmail = String(email || "").trim().toLowerCase();
    const emailLocal = cleanEmail.split("@")[0] || "";
    const cleanName = String(name || "").trim().toLowerCase();

    const lengthOk = pwd.length >= 12 && pwd.length <= 128;
    const noSpaces = !/\s/.test(pwd);

    const hasLower = /[a-z]/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasDigit = /\d/.test(pwd);
    const hasSymbol = /[^A-Za-z0-9]/.test(pwd);
    const categories = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
    const categoriesOk = categories >= 3;

    const lowerPwd = pwd.toLowerCase();
    const noEmailPart =
      !emailLocal || emailLocal.length < 3 || !lowerPwd.includes(emailLocal.toLowerCase());

    const nameParts = cleanName.split(/\s+/).filter((p) => p.length >= 3);
    const noNamePart = !nameParts.some((p) => lowerPwd.includes(p));

    const banned = new Set([
      "password",
      "password123",
      "123456789",
      "12345678",
      "qwerty",
      "admin",
      "letmein",
    ]);
    const notCommon = pwd.length === 0 ? true : !banned.has(lowerPwd);

    const checks = [
      { key: "length", label: "12–128 caracteres", ok: lengthOk },
      { key: "spaces", label: "Sin espacios", ok: noSpaces },
      {
        key: "cats",
        label: "Al menos 3 de 4: mayús/minús/número/símbolo",
        ok: categoriesOk,
      },
      {
        key: "email",
        label: "No contiene partes del correo",
        ok: noEmailPart,
      },
      {
        key: "name",
        label: "No contiene tu nombre",
        ok: noNamePart,
      },
      {
        key: "common",
        label: "No es una contraseña común",
        ok: notCommon,
      },
    ];

    const passed = checks.filter((c) => c.ok).length;
    const total = checks.length;
    const allOk = pwd.length > 0 && passed === total;

    // Simple strength score (UI-only): categories + length buckets
    const lengthScore = pwd.length >= 16 ? 2 : pwd.length >= 12 ? 1 : 0;
    const score = Math.min(5, categories + lengthScore);
    const percent = Math.round((score / 5) * 100);

    const strengthLabel =
      pwd.length === 0 ? "" : percent >= 80 ? "Fuerte" : percent >= 55 ? "Media" : "Débil";
    const strengthColor = percent >= 80 ? "success" : percent >= 55 ? "warning" : "error";

    return { checks, passed, total, allOk, percent, strengthLabel, strengthColor };
  }, [password, email, name]);

  const canSubmit =
    String(name).trim().length > 0 &&
    String(email).trim().length > 0 &&
    String(password).length > 0 &&
    passwordFeedback.allOk;

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await signup({ name, email, password, role });
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Error");
    }
  };


  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        px: 2,
        background: "radial-gradient(1200px circle at 20% 10%, rgba(255,30,30,0.18), transparent 55%), radial-gradient(900px circle at 80% 30%, rgba(0,200,255,0.12), transparent 60%)",
      }}
    >
      <Card
        sx={(theme) => ({
          width: "100%",
          maxWidth: 480,
          border: "1px solid",
          borderColor: "divider",
          backdropFilter: "blur(8px)",
          animation: "authEnter 320ms ease",
          transition: theme.transitions.create(["transform", "box-shadow"], { duration: 180 }),
          "@keyframes authEnter": {
            from: { opacity: 0, transform: "translateY(10px)" },
            to: { opacity: 1, transform: "translateY(0)" },
          },
          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: theme.shadows[6],
          },
        })}
      >
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={2.2}>
            <Box>
              <Typography variant="h4" fontWeight={900} textAlign="center">
                Crear cuenta
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Registrate para entrar al sistema
              </Typography>
            </Box>

            {error && <Alert severity="error">{error}</Alert>}

            <Box component="form" onSubmit={onSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="Nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  fullWidth
                />

                <TextField
                  select
                  label="Rol"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  fullWidth
                  helperText={
                    role === "ADMIN"
                      ? "ADMIN tiene permisos completos dentro del sistema."
                      : ""
                  }
                >
                  <MenuItem value="ADMIN">ADMIN</MenuItem>
                  <MenuItem value="ENGINEER">ENGINEER</MenuItem>
                  <MenuItem value="DRIVER">DRIVER</MenuItem>
                </TextField>

                <TextField
                  label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  autoComplete="email"
                />

                <TextField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  autoComplete="new-password"
                  helperText={
                    password
                      ? `Seguridad: ${passwordFeedback.strengthLabel} — ${passwordFeedback.passed}/${passwordFeedback.total} requisitos OK`
                      : "Usá una contraseña fuerte (mínimo 12 caracteres)."
                  }
                />

                {password && (
                  <Box
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      p: 2,
                      backgroundColor: "rgba(255,255,255,0.02)",
                    }}
                  >
                    <Stack spacing={1.25}>
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                        <Typography variant="subtitle2" fontWeight={900}>
                          Requisitos de contraseña
                        </Typography>
                        <Chip
                          size="small"
                          label={passwordFeedback.strengthLabel}
                          color={passwordFeedback.strengthColor}
                          variant={passwordFeedback.strengthColor === "error" ? "outlined" : "filled"}
                        />
                      </Stack>

                      <LinearProgress
                        variant="determinate"
                        value={passwordFeedback.percent}
                        color={passwordFeedback.strengthColor}
                        sx={{ height: 8, borderRadius: 999 }}
                      />

                      <Divider sx={{ opacity: 0.35 }} />

                      <List dense disablePadding>
                        {passwordFeedback.checks.map((c) => (
                          <ListItem key={c.key} disableGutters sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              {c.ok ? (
                                <CheckCircleOutlineIcon fontSize="small" color="success" />
                              ) : (
                                <CancelOutlinedIcon fontSize="small" color="error" />
                              )}
                            </ListItemIcon>
                            <ListItemText
                              primary={c.label}
                              primaryTypographyProps={{
                                variant: "body2",
                                color: c.ok ? "text.primary" : "text.secondary",
                              }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Stack>
                  </Box>
                )}

                <Button type="submit" variant="contained" size="large" disabled={!canSubmit}>
                  Crear cuenta
                </Button>
              </Stack>
            </Box>

            <Typography variant="body2" color="text.secondary" textAlign="center">
              ¿Ya tenés cuenta?{" "}
              <Link to="/login" style={{ color: "inherit", fontWeight: 700 }}>
                Ir a login
              </Link>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
