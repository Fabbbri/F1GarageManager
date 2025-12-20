import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../services/auth";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
} from "@mui/material";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await login(email, password);
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
        background:
          "radial-gradient(1200px circle at 20% 10%, rgba(255,30,30,0.18), transparent 55%), radial-gradient(900px circle at 80% 30%, rgba(0,200,255,0.12), transparent 60%)",
      }}
    >
      <Stack spacing={3} alignItems="center">
        {/* CUADRO DE LOGIN */}
        <Card
          sx={(theme) => ({
            width: "100%",
            maxWidth: 430,
            backdropFilter: "blur(8px)",
            border: "1px solid",
            borderColor: "divider",
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
                  F1 Garage Manager
                </Typography>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Iniciá sesión para continuar
                </Typography>
              </Box>

              {error && <Alert severity="error">{error}</Alert>}

              <Box component="form" onSubmit={onSubmit}>
                <Stack spacing={2}>
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
                    autoComplete="current-password"
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    sx={(theme) => ({
                      transition: theme.transitions.create(["transform"], { duration: 160 }),
                      "&:hover": { transform: "translateY(-1px)" },
                    })}
                  >
                    Entrar
                  </Button>
                </Stack>
              </Box>

              <Typography variant="body2" color="text.secondary" textAlign="center">
                ¿No tenés cuenta?{" "}
                <Link to="/signup" style={{ color: "inherit", fontWeight: 700 }}>
                  Crear cuenta
                </Link>
              </Typography>
            </Stack>
          </CardContent>
        </Card>

        <Box sx={{ maxWidth: 430, textAlign: "center" }}>
          <Typography variant="caption" color="text.secondary">
            <b>¿Quiénes somos?</b>
            <br />
            F1 Garage Manager es una plataforma de gestión de equipos de Fórmula 1
            que permite administrar escuderías, presupuestos, patrocinadores,
            carros, inventario y conductores desde una sola web.
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}
