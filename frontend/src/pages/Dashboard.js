import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getSession, logout } from "../services/auth";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Chip,
  Divider,
} from "@mui/material";

export default function Dashboard() {
  const session = getSession();
  const navigate = useNavigate();

  const role = session?.role || "—";
  const isAdmin = useMemo(() => role === "ADMIN", [role]);
  const isEngineer = useMemo(() => role === "ENGINEER", [role]);

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <Box sx={{ minHeight: "100vh", p: 3 }}>
      <Card sx={{ maxWidth: 900, mx: "auto" }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={2.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="h4" fontWeight={800} sx={{ flex: 1 }}>
                Inicio
              </Typography>
              <Chip label={role} />
            </Stack>

            <Typography color="text.secondary">
              Sesión: Nombre: <b>{session?.name}</b> Correo: {session?.email}
            </Typography>

        

            <Divider />

            <Stack direction="row" justifyContent="space-between" alignItems="center">
       
  
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
