import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  TextField,
  Button,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";

import { getSession } from "../services/auth";
import { listTeams } from "../services/teams";
import { listParts, createPart } from "../services/parts";
import { purchasePart } from "../services/teams";

export default function Store() {
  const session = getSession();
  const canEdit = useMemo(() => ["ADMIN", "ENGINEER"].includes(session?.role), [session]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const [parts, setParts] = useState([]);

  // create part
  const [partName, setPartName] = useState("");
  const [partCategory, setPartCategory] = useState("");
  const [partPrice, setPartPrice] = useState("");
  const [partStock, setPartStock] = useState("");
  const [perfSpeed, setPerfSpeed] = useState("");
  const [perfHandling, setPerfHandling] = useState("");
  const [perfReliability, setPerfReliability] = useState("");

  // purchase
  const [buyPartId, setBuyPartId] = useState("");
  const [buyQty, setBuyQty] = useState("");

  async function reload() {
    setError("");
    setLoading(true);
    try {
      const [t, p] = await Promise.all([listTeams(), listParts()]);
      setTeams(t);
      setParts(p);
      if (!selectedTeamId && t.length) setSelectedTeamId(t[0].id);
    } catch (e) {
      setError(e.message || "Error cargando tienda");
    } finally {
      setLoading(false);
    }
  }

  async function reloadPartsOnly() {
    try {
      const p = await listParts();
      setParts(p);
    } catch (e) {
      setError(e.message || "Error cargando catálogo");
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCreatePart = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await createPart({
        name: partName,
        category: partCategory,
        price: Number(partPrice || 0),
        stock: Number(partStock || 0),
        performance: {
          speed: Number(perfSpeed || 0),
          handling: Number(perfHandling || 0),
          reliability: Number(perfReliability || 0),
        },
      });
      setPartName("");
      setPartCategory("");
      setPartPrice("");
      setPartStock("");
      setPerfSpeed("");
      setPerfHandling("");
      setPerfReliability("");
      await reloadPartsOnly();
    } catch (e2) {
      setError(e2.message || "Error registrando parte");
    }
  };

  const onPurchase = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (!selectedTeamId) throw new Error("Selecciona un equipo.");
      await purchasePart(selectedTeamId, { partId: buyPartId, qty: Number(buyQty) });
      setBuyQty("");
      await reloadPartsOnly();
    } catch (e2) {
      setError(e2.message || "Error comprando parte");
    }
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto" }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h4" fontWeight={900}>Tienda de partes</Typography>
          <Typography color="text.secondary">
            Catálogo global • compra valida stock y agrega al inventario del equipo.
          </Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        {loading ? (
          <Typography color="text.secondary">Cargando...</Typography>
        ) : (
          <>
            {canEdit && (
              <Card>
                <CardContent>
                  <Typography fontWeight={800} sx={{ mb: 1 }}>Registrar parte (catálogo)</Typography>
                  <Box component="form" onSubmit={onCreatePart}>
                    <Stack spacing={2} direction={{ xs: "column", md: "row" }}>
                      <TextField label="Nombre" value={partName} onChange={(e) => setPartName(e.target.value)} fullWidth />
                      <TextField label="Categoría" value={partCategory} onChange={(e) => setPartCategory(e.target.value)} fullWidth />
                      <TextField label="Precio" value={partPrice} onChange={(e) => setPartPrice(e.target.value)} fullWidth />
                      <TextField label="Stock" value={partStock} onChange={(e) => setPartStock(e.target.value)} fullWidth />
                      <Button type="submit" variant="contained">Guardar</Button>
                    </Stack>

                    <Stack spacing={2} direction={{ xs: "column", md: "row" }} sx={{ mt: 2 }}>
                      <TextField label="Rendimiento: speed" value={perfSpeed} onChange={(e) => setPerfSpeed(e.target.value)} fullWidth />
                      <TextField label="Rendimiento: handling" value={perfHandling} onChange={(e) => setPerfHandling(e.target.value)} fullWidth />
                      <TextField label="Rendimiento: reliability" value={perfReliability} onChange={(e) => setPerfReliability(e.target.value)} fullWidth />
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent>
                <Typography fontWeight={800} sx={{ mb: 1 }}>Comprar</Typography>
                <Box component="form" onSubmit={onPurchase}>
                  <Stack spacing={2} direction={{ xs: "column", md: "row" }}>
                    <FormControl fullWidth>
                      <InputLabel id="team-select-label">Equipo</InputLabel>
                      <Select
                        labelId="team-select-label"
                        label="Equipo"
                        value={selectedTeamId}
                        onChange={(e) => setSelectedTeamId(e.target.value)}
                      >
                        {teams.map((t) => (
                          <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth>
                      <InputLabel id="part-select-label">Parte</InputLabel>
                      <Select
                        labelId="part-select-label"
                        label="Parte"
                        value={buyPartId}
                        onChange={(e) => setBuyPartId(e.target.value)}
                      >
                        {parts.map((p) => (
                          <MenuItem key={p.id} value={p.id}>
                            {p.name} (stock: {p.stock})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField label="Cantidad" value={buyQty} onChange={(e) => setBuyQty(e.target.value)} fullWidth />

                    <Button type="submit" variant="contained" disabled={!canEdit || !selectedTeamId || !buyPartId}>
                      Comprar
                    </Button>
                  </Stack>
                </Box>
              </CardContent>
            </Card>

            <Divider />

            <Card>
              <CardContent>
                <Typography fontWeight={800} sx={{ mb: 1 }}>Catálogo</Typography>

                {parts.length === 0 ? (
                  <Typography color="text.secondary">No hay partes en el catálogo.</Typography>
                ) : (
                  <Stack spacing={1}>
                    {parts.map((p) => (
                      <Card key={p.id} variant="outlined">
                        <CardContent sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography fontWeight={800}>{p.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {p.category || "—"} • precio: {p.price} • stock: {p.stock}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              rendimiento: speed {p.performance?.speed ?? 0}, handling {p.performance?.handling ?? 0}, reliability {p.performance?.reliability ?? 0}
                            </Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </Stack>
    </Box>
  );
}
