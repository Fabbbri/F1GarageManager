import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stack,
  Card,
  CardContent,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import PaidIcon from "@mui/icons-material/Paid"; 
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { getSession } from '../services/auth';
import { listSponsors, createSponsor, updateSponsor, deleteSponsor } from '../services/sponsors';
import { listTeams } from "../services/teams";
import { createEarning } from "../services/earnings";



export default function Sponsors() {
  const session = getSession();
  const isAdmin = useMemo(() => session?.role === 'ADMIN', [session]);

  const [sponsors, setSponsor] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    fecha: new Date().toISOString().split('T')[0],
  });
  const [openEarning, setOpenEarning] = useState(false);
  const [teams, setTeams] = useState([]);
  const [earningSponsor, setEarningSponsor] = useState(null);

  const [earningData, setEarningData] = useState({
  teamId: "",
  amount: "", // string para controlar input
  });


  async function reload() {
    setError('');
    setLoading(true);
    try {
      const s = await listSponsors();
      setSponsor(s);
    } catch (e) {
      setError(e.message || 'Error cargando patrocinadores');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
  (async () => {
    try {
      const t = await listTeams();
      setTeams(Array.isArray(t) ? t : []);
    } catch (e) {
      // no frenamos la página por esto, solo avisamos
      console.error("Error cargando equipos:", e);
    }
  })();
  }, []);
  

  const handleOpenDialog = (sponsor = null) => {
    if (sponsor) {
      setEditingId(sponsor.id);
      setFormData({
        nombre: sponsor.nombre,
        fecha: sponsor.fecha,
      });
    } else {
      setEditingId(null);
      setFormData({
        nombre: '',
        fecha: new Date().toISOString().split('T')[0],
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingId(null);
    setSuccess('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async () => {
    setError('');
    setCreating(true);
    try {
      if (editingId) {
        await updateSponsor(editingId, formData);
        setSuccess('Sponsor actualizado exitosamente');
      } else {
        await createSponsor(formData);
        setSuccess('Sponsor creado exitosamente');
      }
      await reload();
      handleCloseDialog();
    } catch (error) {
      setError(error.message || 'Error guardando sponsor');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este patrocinador?')) {
      return;
    }

    setError('');
    try {
      await deleteSponsor(id);
      setSuccess('Sponsor eliminado exitosamente');
      await reload();
    } catch (error) {
      setError(error.message || 'Error eliminando sponsor');
    }
  };

  const handleOpenEarningDialog = (sponsor) => {
  setEarningSponsor(sponsor);
  setEarningData({ teamId: "", amount: "" });
  setOpenEarning(true);
};

const handleCloseEarningDialog = () => {
  setOpenEarning(false);
  setEarningSponsor(null);
};

const handleAmountChange = (e) => {
  const raw = e.target.value;

  // Acepta solo dígitos o vacío
  if (!/^\d*$/.test(raw)) return;

  // Quita ceros a la izquierda, pero conserva "0" y "" (vacío)
  const normalized = raw === "" ? "" : raw.replace(/^0+(?=\d)/, "");

  setEarningData((prev) => ({ ...prev, amount: normalized }));
};

const handleSubmitEarning = async () => {
  if (!earningSponsor) return;

  // entero >= 0 (permitimos 0)
  if (!/^\d+$/.test(earningData.amount)) {
    setError("El aporte debe ser un entero (0 en adelante).");
    return;
  }

  const amount = Number.parseInt(earningData.amount, 10);

  try {
    setError("");

    await createEarning(earningData.teamId, {
      sponsorId: Number.parseInt(String(earningSponsor.id), 10),
      amount, // 👈 el backend espera "amount"
      date: new Date().toISOString().slice(0, 10), // 👈 opcional, pero tu service lo valida si lo mandás
      description: null,
    });

    setSuccess("Aporte registrado exitosamente.");
    handleCloseEarningDialog();
  } catch (e) {
    setError(e.message || "Error registrando el aporte");
  }
};
  

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h4" fontWeight={800}>
          Patrocinadores
        </Typography>

        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        {isAdmin && (
          <Card>
            <CardContent>
              <Typography fontWeight={700} sx={{ mb: 1 }}>
                Crear patrocinador
              </Typography>
              <Box component="form">
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    fullWidth
                  />
                  <TextField
                    label="Fecha"
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleSave}
                    disabled={creating || !formData.nombre.trim()}
                  >
                    {creating ? 'Guardando...' : 'Crear'}
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent>
            <Typography fontWeight={700} sx={{ mb: 1 }}>
              Lista
            </Typography>

            {loading ? (
              <Typography color="text.secondary">Cargando...</Typography>
            ) : sponsors.length === 0 ? (
              <Typography color="text.secondary">No hay patrocinadores aún.</Typography>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                      <TableCell><strong>Nombre</strong></TableCell>
                      <TableCell><strong>Fecha Creación</strong></TableCell>
                      {isAdmin && <TableCell align="center"><strong>Acciones</strong></TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sponsors.map((sponsor) => (
                      <TableRow key={sponsor.id} hover>
                        <TableCell>{sponsor.nombre}</TableCell>
                        <TableCell>{new Date(sponsor.fecha).toLocaleDateString('es-ES')}</TableCell>
                        {isAdmin && (
                          <TableCell align="center">
                            <Button
                            size="small"
                            variant="contained"
                            startIcon={<PaidIcon />}
                            onClick={() => handleOpenEarningDialog(sponsor)}
                            sx={{
                                mr: 1,
                                bgcolor: "success.main",
                                color: "black",                 // o "success.contrastText"
                                boxShadow: "none",              // quita el brillo/sombra
                                border: "1px solid",
                                borderColor: "success.dark",
                                "&:hover": {
                                bgcolor: "success.dark",
                                boxShadow: "none",
                                },
                                "&:active": {
                                boxShadow: "none",
                                },
                                "& .MuiButton-startIcon": {
                                color: "inherit",
                                },
                            }}
                            >
                            Aporte
                            </Button>

                            <Button
                                size="small"
                                variant="outlined"
                                startIcon={<EditIcon />}
                                onClick={() => handleOpenDialog(sponsor)}
                                sx={{ mr: 1 }}
                            >
                                Editar
                            </Button>

                            <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={() => handleDelete(sponsor.id)}
                            >
                                Eliminar
                            </Button>
                            </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Stack>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingId ? 'Editar Patrocinador' : 'Nuevo Patrocinador'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            fullWidth
            label="Nombre"
            name="nombre"
            value={formData.nombre}
            onChange={handleInputChange}
            margin="normal"
            placeholder="Ej: Ferrari, Mercedes, etc."
          />
          <TextField
            fullWidth
            label="Fecha"
            name="fecha"
            type="date"
            value={formData.fecha}
            onChange={handleInputChange}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={creating || !formData.nombre.trim()}
          >
            {creating ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={openEarning} onClose={handleCloseEarningDialog} maxWidth="sm" fullWidth>
  <DialogTitle>
    Aporte {earningSponsor ? `— ${earningSponsor.nombre}` : ""}
  </DialogTitle>

  <DialogContent sx={{ pt: 2 }}>
    <FormControl fullWidth margin="normal">
      <InputLabel id="team-select-label">Equipo</InputLabel>
      <Select
        labelId="team-select-label"
        label="Equipo"
        value={earningData.teamId}
        onChange={(e) => setEarningData((prev) => ({ ...prev, teamId: e.target.value }))}
      >
        {teams.length === 0 ? (
          <MenuItem value="" disabled>
            No hay equipos disponibles
          </MenuItem>
        ) : (
          teams.map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.name ?? t.nombre ?? `Equipo ${t.id}`}
            </MenuItem>
          ))
        )}
      </Select>
    </FormControl>

    <TextField
      fullWidth
      margin="normal"
      label="Aporte (entero)"
      value={earningData.amount}
      onChange={handleAmountChange}
      inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
      placeholder="Ej: 5000"
    />
  </DialogContent>

  <DialogActions>
    <Button onClick={handleCloseEarningDialog}>Cancelar</Button>

    <Button
      onClick={handleSubmitEarning}
      variant="contained"
      sx={{
            mr: 1,
            bgcolor: "success.main",
            color: "black",                 // o "success.contrastText"
            boxShadow: "none",              // quita el brillo/sombra
            border: "1px solid",
            borderColor: "success.dark",
            "&:hover": {
            bgcolor: "success.dark",
            boxShadow: "none",
            },
            "&:active": {
            boxShadow: "none",
            },
            "& .MuiButton-startIcon": {
            color: "inherit",
            },
        }}                    
      disabled={!earningData.teamId || !earningData.amount}
    >
      Aportar
    </Button>
  </DialogActions>
</Dialog>
    </Box>
  );
}
