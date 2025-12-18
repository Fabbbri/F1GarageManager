import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signup } from "../services/auth";
import {
  Box, Card, CardContent, Typography, TextField, Button, Alert, Stack, MenuItem
} from "@mui/material";

export default function Signup() {
  const [name, setName] = useState("");
  const [role, setRole] = useState("ENGINEER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const onSubmit = async (e) => {
  e.preventDefault();
  setError("");

  try {
    // validaciones...
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
      <Card sx={{ width: "100%", maxWidth: 480 }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={2.2}>
            <Box>
              <Typography variant="h4" fontWeight={800}>
                Crear cuenta
              </Typography>
              <Typography variant="body2" color="text.secondary">
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
                />

                <Button type="submit" variant="contained" size="large">
                  Crear cuenta
                </Button>
              </Stack>
            </Box>

            <Typography variant="body2" color="text.secondary">
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
