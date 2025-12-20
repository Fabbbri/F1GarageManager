import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Drawer,
  Card,
  CardContent,
  Typography,
  Stack,
  TextField,
  Button,
  Alert,
  Snackbar,
  Divider,
  Badge,
  IconButton,
  Tooltip,
  Chip,
  Fab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";

import SpeedIcon from "@mui/icons-material/Speed";
import AirIcon from "@mui/icons-material/Air";
import TireRepairIcon from "@mui/icons-material/TireRepair";
import TuneIcon from "@mui/icons-material/Tune";
import SettingsIcon from "@mui/icons-material/Settings";
import BuildIcon from "@mui/icons-material/Build";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import CloseIcon from "@mui/icons-material/Close";

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

function groupPartsByCategory(parts) {
  const map = new Map();
  for (const part of parts || []) {
    const key = String(part?.category || "").trim() || "Otros";
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(part);
  }
  return map;
}

function normalizeQty(x) {
  const n = Number(x);
  if (!Number.isFinite(n)) return 0;
  if (!Number.isInteger(n)) return 0;
  return n;
}

function getCategoryIcon(category) {
  const c = String(category || "").trim().toLowerCase();

  if (c.includes("power") || c.includes("pu") || c.includes("motor")) return <SpeedIcon />;
  if (c.includes("aero") || c.includes("aerodin") || c.includes("aerodinám")) return <AirIcon />;
  if (c.includes("neum") || c.includes("tire")) return <TireRepairIcon />;
  if (c.includes("susp")) return <TuneIcon />;
  if (c.includes("caja") || c.includes("camb") || c.includes("gear")) return <SettingsIcon />;

  return <BuildIcon />;
}

export default function Store() {
  const session = getSession();
  const canEdit = useMemo(() => session?.role === "ADMIN", [session]);
  const canRestock = useMemo(() => session?.role === "ADMIN", [session]);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const [parts, setParts] = useState([]);

  // cart: partId -> qty
  const [cart, setCart] = useState({});
  const [checkingOut, setCheckingOut] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  // create part
  const [partName, setPartName] = useState("");
  const [partCategory, setPartCategory] = useState("");
  const [partPrice, setPartPrice] = useState("");
  const [partStock, setPartStock] = useState("");
  const [perfP, setPerfP] = useState("");
  const [perfA, setPerfA] = useState("");
  const [perfM, setPerfM] = useState("");

  // restock
  const [restockPartId, setRestockPartId] = useState("");
  const [restockQty, setRestockQty] = useState("");

  const selectedTeam = useMemo(() => teams.find((t) => t.id === selectedTeamId) || null, [teams, selectedTeamId]);

  const partsById = useMemo(() => {
    const m = new Map();
    for (const p of parts) m.set(String(p.id), p);
    return m;
  }, [parts]);

  const budgetTotal = Number(selectedTeam?.budget?.total ?? 0);
  const budgetSpent = Number(selectedTeam?.budget?.spent ?? 0);
  const budgetAvailable = budgetTotal - budgetSpent;

  const cartItems = useMemo(() => {
    return Object.entries(cart)
      .map(([partId, qty]) => ({ partId, qty: normalizeQty(qty) }))
      .filter((x) => x.qty > 0)
      .map((x) => ({ ...x, part: partsById.get(String(x.partId)) || null }))
      .filter((x) => Boolean(x.part));
  }, [cart, partsById]);

  const cartTotalCost = useMemo(() => {
    let sum = 0;
    for (const item of cartItems) sum += Number(item.part?.price ?? 0) * item.qty;
    return sum;
  }, [cartItems]);

  const cartTotalQty = useMemo(() => {
    let sum = 0;
    for (const item of cartItems) sum += item.qty;
    return sum;
  }, [cartItems]);

  const cartWithinBudget = cartTotalCost <= budgetAvailable;

  const partsByCategory = useMemo(() => groupPartsByCategory(parts), [parts]);
  const categoryOrder = useMemo(() => {
    const existing = Array.from(partsByCategory.keys());
    const required = REQUIRED_CATEGORIES.filter((c) => existing.includes(c));
    const rest = existing
      .filter((c) => !required.includes(c))
      .sort((a, b) => a.localeCompare(b));
    return [...required, ...rest];
  }, [partsByCategory]);

  const addToCart = (partId) => {
    const id = String(partId);
    const part = partsById.get(id);
    const stock = Number(part?.stock ?? 0);
    if (!part) return;
    if (!(stock > 0)) return;

    setCart((prev) => {
      const current = normalizeQty(prev[id] ?? 0);
      const next = Math.min(current + 1, stock);
      return { ...prev, [id]: next };
    });

    setCartOpen(true);
  };

  const setCartQty = (partId, nextQty) => {
    const id = String(partId);
    const part = partsById.get(id);
    const stock = Number(part?.stock ?? 0);
    const next = normalizeQty(nextQty);

    setCart((prev) => {
      const copy = { ...prev };
      if (!part || next <= 0) {
        delete copy[id];
        return copy;
      }
      copy[id] = Math.max(1, Math.min(next, stock > 0 ? stock : next));
      return copy;
    });
  };

  const removeFromCart = (partId) => {
    const id = String(partId);
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const clearCart = () => setCart({});

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

  const onCheckoutCart = async () => {
    setError("");
    setSuccess("");
    try {
      if (!selectedTeamId) throw new Error("Selecciona un equipo.");
      if (cartItems.length === 0) throw new Error("Tu carrito está vacío.");

      // Validate stock and totals against the latest loaded catalog
      for (const item of cartItems) {
        const stock = Number(item.part?.stock ?? 0);
        if (!(item.qty > 0)) throw new Error("Cantidad inválida en el carrito.");
        if (stock < item.qty) {
          throw new Error(`Stock insuficiente para ${item.part?.name || "parte"}. Disponible: ${stock}. Pedido: ${item.qty}.`);
        }
      }

      if (!cartWithinBudget) {
        throw new Error(`Presupuesto insuficiente. Disponible: ${budgetAvailable}. Costo: ${cartTotalCost}.`);
      }

      setCheckingOut(true);
      for (const item of cartItems) {
        await purchasePart(selectedTeamId, { partId: item.partId, qty: item.qty });
      }

      clearCart();
      setSuccess(`Compra exitosa: ${cartItems.length} item(s) • costo ${cartTotalCost}.`);
      await Promise.all([reloadPartsOnly(), reloadTeamsOnly()]);
      setCartOpen(false);
    } catch (e2) {
      setError(e2.message || "Error comprando carrito");
      await Promise.all([reloadPartsOnly(), reloadTeamsOnly()]).catch(() => {});
    } finally {
      setCheckingOut(false);
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
    <Box
      sx={{
        maxWidth: 1100,
        mx: "auto",
        overflowX: "clip",
      }}
    >
      <Stack spacing={2}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
          <Box>
            <Typography variant="h4" fontWeight={900}>Tienda de partes</Typography>
            <Typography color="text.secondary">
              Catálogo global • compra valida stock y agrega al inventario del equipo.
            </Typography>
          </Box>
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
            <Card>
              <CardContent>
                <Typography fontWeight={800} sx={{ mb: 1 }}>Equipo y presupuesto</Typography>

                <Stack spacing={2} direction={{ xs: "column", md: "row" }} sx={{ mb: 2 }}>
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

                {!selectedTeamId ? (
                  <Alert severity="info">Selecciona un equipo para habilitar compras.</Alert>
                ) : null}
              </CardContent>
            </Card>

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

            <Divider />

            <Card>
              <CardContent>
                <Typography fontWeight={800} sx={{ mb: 1 }}>Catálogo</Typography>

                {parts.length === 0 ? (
                  <Typography color="text.secondary">No hay partes en el catálogo.</Typography>
                ) : (
                  <Stack spacing={2}>
                    {categoryOrder.map((category) => {
                      const items = partsByCategory.get(category) || [];
                      return (
                        <Box key={category}>
                          <Typography fontWeight={900} sx={{ mb: 1 }}>{category}</Typography>
                          <Stack spacing={1}>
                            {items.map((p) => {
                              const stock = Number(p.stock ?? 0);
                              const outOfStock = !(stock > 0);
                              const inCart = normalizeQty(cart[String(p.id)] ?? 0);

                              return (
                                <Card
                                  key={p.id}
                                  variant="outlined"
                                  sx={(theme) => ({
                                    transition: theme.transitions.create(["transform", "box-shadow"], { duration: 160 }),
                                    "&:hover": {
                                      transform: "translateY(-2px)",
                                      boxShadow: theme.shadows[4],
                                    },
                                    ...(outOfStock
                                      ? {
                                          opacity: 0.72,
                                          "&:hover": {
                                            transform: "none",
                                            boxShadow: theme.shadows[1],
                                          },
                                        }
                                      : null),
                                  })}
                                >
                                  <CardContent sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                                    <Box
                                      sx={(theme) => ({
                                        width: 44,
                                        height: 44,
                                        borderRadius: 2,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flex: "0 0 auto",
                                        bgcolor: "action.hover",
                                        color: "primary.main",
                                        transition: theme.transitions.create(["transform"], { duration: 160 }),
                                        "& svg": { fontSize: 26 },
                                        [".MuiCard-root:hover &"]: { transform: "scale(1.03)" },
                                      })}
                                      aria-label={`Categoría: ${p.category || "—"}`}
                                      title={p.category || "—"}
                                    >
                                      {getCategoryIcon(p.category)}
                                    </Box>

                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                      <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                                        <Typography fontWeight={800} noWrap sx={{ minWidth: 0 }}>{p.name}</Typography>
                                        {outOfStock ? (
                                          <Chip
                                            label="Agotado"
                                            size="small"
                                            color="warning"
                                            variant="outlined"
                                            sx={{ fontWeight: 800 }}
                                          />
                                        ) : null}
                                      </Stack>
                                      <Typography variant="body2" color="text.secondary">
                                        precio: {p.price} • stock: {p.stock}
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        rendimiento: p {p.performance?.p ?? 0}, a {p.performance?.a ?? 0}, m {p.performance?.m ?? 0}
                                      </Typography>
                                    </Box>

                                    <Stack spacing={1} alignItems="flex-end" sx={{ flex: "0 0 auto" }}>
                                      <Button
                                        variant="contained"
                                        size="small"
                                        disabled={!selectedTeamId || checkingOut || outOfStock || (inCart >= stock)}
                                        onClick={() => addToCart(p.id)}
                                      >
                                        {outOfStock ? "Agotado" : "Agregar"}
                                      </Button>
                                      <Typography variant="caption" color="text.secondary">
                                        En carrito: {inCart}
                                      </Typography>
                                    </Stack>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </Stack>

      <Box
        sx={(theme) => ({
          position: "fixed",
          right: 20,
          bottom: 20,
          maxWidth: "100vw",
          zIndex: theme.zIndex.drawer + 2,
        })}
      >
        <Tooltip title="Abrir carrito">
          <Badge
            color="primary"
            badgeContent={cartTotalQty}
            invisible={cartTotalQty === 0}
            anchorOrigin={{ vertical: "top", horizontal: "right" }}
            sx={{
              "& .MuiBadge-badge": {
                boxSizing: "border-box",
                minWidth: "auto",
                height: "auto",
                padding: 0,
                borderRadius: 0,
                backgroundColor: "transparent",
                color: "common.white",
                boxShadow: "none",
                fontSize: 12,
                lineHeight: 1,
                fontWeight: 900,
                top: 10,
                right: 10,
                transform: "none",
              },
            }}
          >
            <Fab
              color="primary"
              onClick={() => setCartOpen((v) => !v)}
              disabled={loading}
              aria-label="Abrir carrito"
              sx={(theme) => ({
                "&::before, &::after": {
                  content: "none",
                  display: "none",
                },
                transition: theme.transitions.create(["transform"], { duration: 160 }),
                "&:hover": { transform: "translateY(-2px)" },
              })}
            >
              <ShoppingCartIcon />
            </Fab>
          </Badge>
        </Tooltip>
      </Box>

      <Drawer
        anchor="right"
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        ModalProps={{ disableScrollLock: true }}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 420 },
            maxWidth: "100%",
          },
        }}
      >
        <Box sx={(theme) => theme.mixins.toolbar} />
        <Box sx={{ p: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <ShoppingCartIcon />
            <Typography fontWeight={900}>Carrito</Typography>
          </Box>
          <IconButton onClick={() => setCartOpen(false)} aria-label="Cerrar carrito">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider />

        <Box sx={{ p: 2 }}>
          {cartItems.length === 0 ? (
            <Typography color="text.secondary">No hay items en el carrito.</Typography>
          ) : (
            <Stack spacing={1}>
              {cartItems.map((item) => {
                const stock = Number(item.part?.stock ?? 0);
                const canDec = item.qty > 1;
                const canInc = item.qty < stock;
                const lineTotal = Number(item.part?.price ?? 0) * item.qty;

                return (
                  <Card
                    key={item.partId}
                    variant="outlined"
                    sx={(theme) => ({
                      transition: theme.transitions.create(["transform", "box-shadow"], { duration: 160 }),
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: theme.shadows[4],
                      },
                    })}
                  >
                    <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontWeight={800} noWrap>{item.part?.name || "Parte"}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          x{item.qty} • subtotal: {lineTotal}
                        </Typography>
                        {stock < item.qty ? (
                          <Typography variant="body2" color="warning.main">
                            stock insuficiente (disp: {stock})
                          </Typography>
                        ) : null}
                      </Box>

                      <Stack spacing={0.5} alignItems="flex-end">
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={checkingOut || !canDec}
                            onClick={() => setCartQty(item.partId, item.qty - 1)}
                          >
                            −
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={checkingOut || !canInc}
                            onClick={() => setCartQty(item.partId, item.qty + 1)}
                          >
                            +
                          </Button>
                        </Stack>
                        <Button
                          size="small"
                          color="inherit"
                          disabled={checkingOut}
                          onClick={() => removeFromCart(item.partId)}
                        >
                          Quitar
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}

              <Divider />

              <Box>
                <Typography fontWeight={900}>Total: {cartTotalCost}</Typography>
                {!cartWithinBudget ? (
                  <Typography color="warning.main" variant="body2">
                    Presupuesto insuficiente (disp: {budgetAvailable})
                  </Typography>
                ) : null}
              </Box>

              <Stack spacing={1} direction={{ xs: "column", sm: "row" }}>
                <Button
                  variant="contained"
                  disabled={!selectedTeamId || checkingOut || cartItems.length === 0 || !cartWithinBudget}
                  onClick={onCheckoutCart}
                >
                  Comprar carrito
                </Button>
                <Button
                  variant="outlined"
                  color="inherit"
                  disabled={checkingOut || cartItems.length === 0}
                  onClick={clearCart}
                >
                  Vaciar
                </Button>
              </Stack>
            </Stack>
          )}
        </Box>
      </Drawer>
    </Box>
  );
}
