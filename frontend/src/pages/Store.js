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
  Snackbar,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";

import { getSession } from "../services/auth";
import { listTeams } from "../services/teams";
import { listParts, createPart, restockPart } from "../services/parts";
import { purchasePart } from "../services/teams";

const REQUIRED_CATEGORIES = [
  "Power Unit",
  "Paquete aerodinámico",
  "Neumáticos",
  "Suspensión",
  "Caja de cambios",
];

export default function Store() {
  const session = getSession();
  const canEdit = useMemo(() => ["ADMIN", "ENGINEER"].includes(session?.role), [session]);
  const canRestock = useMemo(() => session?.role === "ADMIN", [session]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const [parts, setParts] = useState([]);

  // create part
  const [partName, setPartName] = useState("");
  const [partCategory, setPartCategory] = useState("");
  const [partPrice, setPartPrice] = useState("");
  const [partStock, setPartStock] = useState("");
  const [perfP, setPerfP] = useState("");
  const [perfA, setPerfA] = useState("");
  const [perfM, setPerfM] = useState("");

  // purchase
  const [buyPartId, setBuyPartId] = useState("");
  const [buyQty, setBuyQty] = useState("");

  // restock
  const [restockPartId, setRestockPartId] = useState("");
  const [restockQty, setRestockQty] = useState("");

  const selectedTeam = useMemo(() => teams.find((t) => t.id === selectedTeamId) || null, [teams, selectedTeamId]);
  const selectedPart = useMemo(() => parts.find((p) => p.id === buyPartId) || null, [parts, buyPartId]);

  const budgetTotal = Number(selectedTeam?.budget?.total ?? 0);
  const budgetSpent = Number(selectedTeam?.budget?.spent ?? 0);
  const budgetAvailable = budgetTotal - budgetSpent;

  const buyQtyNum = Number(buyQty);
  const buyQtyValid = Number.isInteger(buyQtyNum) && buyQtyNum > 0;
  const unitPrice = Number(selectedPart?.price ?? 0);
  const totalCost = buyQtyValid ? unitPrice * buyQtyNum : 0;
  const canAfford = !buyQtyValid ? true : budgetAvailable >= totalCost;

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

  async function reloadTeamsOnly() {
    try {
      const t = await listTeams();
      setTeams(t);
      if (!selectedTeamId && t.length) setSelectedTeamId(t[0].id);
    } catch (e) {
      setError(e.message || "Error cargando equipos");
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
          p: Number(perfP || 0),
          a: Number(perfA || 0),
          m: Number(perfM || 0),
        },
      });
      setPartName("");
      setPartCategory("");
      setPartPrice("");
      setPartStock("");
      setPerfP("");
      setPerfA("");
      setPerfM("");
      await reloadPartsOnly();
    } catch (e2) {
      setError(e2.message || "Error registrando parte");
    }
  };

  const onPurchase = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      if (!selectedTeamId) throw new Error("Selecciona un equipo.");
      if (!buyQtyValid) throw new Error("Cantidad inválida.");
      if (!canAfford) throw new Error(`Presupuesto insuficiente. Disponible: ${budgetAvailable}. Costo: ${totalCost}.`);
      await purchasePart(selectedTeamId, { partId: buyPartId, qty: Number(buyQty) });
      setBuyQty("");
      setSuccess(
        `Compra exitosa: ${selectedPart?.name || "Parte"} x${buyQtyNum} (costo ${totalCost}).`
      );
      await Promise.all([reloadPartsOnly(), reloadTeamsOnly()]);
    } catch (e2) {
      setError(e2.message || "Error comprando parte");
    }
  };

  const restockQtyNum = Number(restockQty);
  const restockQtyValid = Number.isInteger(restockQtyNum) && restockQtyNum > 0;
  const restockSelectedPart = useMemo(
    () => parts.find((p) => p.id === restockPartId) || null,
    [parts, restockPartId]
  );

  const onRestock = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      if (!restockPartId) throw new Error("Selecciona una parte.");
      if (!restockQtyValid) throw new Error("Cantidad inválida.");

      const updated = await restockPart(restockPartId, { qty: restockQtyNum });
      setRestockQty("");
      setSuccess(`Re-stock exitoso: ${updated?.name || restockSelectedPart?.name || "Parte"} +${restockQtyNum} (stock: ${updated?.stock ?? "?"}).`);
      await reloadPartsOnly();
    } catch (e2) {
      setError(e2.message || "Error re-stockeando");
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

        <Snackbar
          open={Boolean(success)}
          autoHideDuration={3500}
          onClose={() => setSuccess("")}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert onClose={() => setSuccess("")} severity="success" variant="filled" sx={{ width: "100%" }}>
            {success}
          </Alert>
        </Snackbar>

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
                      <FormControl fullWidth>
                        <InputLabel id="part-category-label">Categoría</InputLabel>
                        <Select
                          labelId="part-category-label"
                          label="Categoría"
                          value={partCategory}
                          onChange={(e) => setPartCategory(e.target.value)}
                        >
                          {REQUIRED_CATEGORIES.map((c) => (
                            <MenuItem key={c} value={c}>{c}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField label="Precio" value={partPrice} onChange={(e) => setPartPrice(e.target.value)} fullWidth />
                      <TextField label="Stock" value={partStock} onChange={(e) => setPartStock(e.target.value)} fullWidth />
                      <Button type="submit" variant="contained">Guardar</Button>
                    </Stack>

                    <Stack spacing={2} direction={{ xs: "column", md: "row" }} sx={{ mt: 2 }}>
                      <TextField label="Rendimiento: p" value={perfP} onChange={(e) => setPerfP(e.target.value)} fullWidth />
                      <TextField label="Rendimiento: a" value={perfA} onChange={(e) => setPerfA(e.target.value)} fullWidth />
                      <TextField label="Rendimiento: m" value={perfM} onChange={(e) => setPerfM(e.target.value)} fullWidth />
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            )}

            {canRestock && (
              <Card>
                <CardContent>
                  <Typography fontWeight={800} sx={{ mb: 1 }}>Re-stock (reabastecer stock)</Typography>
                  <Box component="form" onSubmit={onRestock}>
                    <Stack spacing={2} direction={{ xs: "column", md: "row" }}>
                      <FormControl fullWidth>
                        <InputLabel id="restock-part-select-label">Parte</InputLabel>
                        <Select
                          labelId="restock-part-select-label"
                          label="Parte"
                          value={restockPartId}
                          onChange={(e) => setRestockPartId(e.target.value)}
                        >
                          {parts.map((p) => (
                            <MenuItem key={p.id} value={p.id}>
                              {p.name} (stock: {p.stock})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <TextField
                        label="Cantidad a agregar"
                        value={restockQty}
                        onChange={(e) => setRestockQty(e.target.value)}
                        fullWidth
                      />

                      <Button type="submit" variant="contained" disabled={!restockPartId || !restockQtyValid}>
                        Re-stock
                      </Button>
                    </Stack>
                  </Box>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent>
                <Typography fontWeight={800} sx={{ mb: 1 }}>Comprar</Typography>

                <Stack spacing={2} direction={{ xs: "column", md: "row" }} sx={{ mb: 2 }}>
                  <TextField
                    label="Presupuesto total"
                    value={String(budgetTotal)}
                    fullWidth
                    InputProps={{ readOnly: true }}
                  />
                  <TextField
                    label="Gastado"
                    value={String(budgetSpent)}
                    fullWidth
                    InputProps={{ readOnly: true }}
                  />
                  <TextField
                    label="Disponible"
                    value={String(budgetAvailable)}
                    fullWidth
                    InputProps={{ readOnly: true }}
                  />
                </Stack>

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

                    <TextField
                      label="Cantidad"
                      value={buyQty}
                      onChange={(e) => setBuyQty(e.target.value)}
                      fullWidth
                    />

                    <TextField
                      label="Costo"
                      value={buyQtyValid ? String(totalCost) : "—"}
                      fullWidth
                      InputProps={{ readOnly: true }}
                    />

                    <Button
                      type="submit"
                      variant="contained"
                      disabled={!canEdit || !selectedTeamId || !buyPartId || !buyQtyValid || !canAfford}
                    >
                      Comprar
                    </Button>
                  </Stack>
                </Box>

                {!canAfford && buyQtyValid ? (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    Presupuesto insuficiente: disponible {budgetAvailable} • costo {totalCost}
                  </Alert>
                ) : null}
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
                              rendimiento: p {p.performance?.p ?? 0}, a {p.performance?.a ?? 0}, m {p.performance?.m ?? 0}
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
