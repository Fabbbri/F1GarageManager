import React, { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getSession, logout } from "../services/auth";
import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  AppBar,
  Typography,
  IconButton,
  Divider,
  Chip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import GroupsIcon from "@mui/icons-material/Groups";
import StorefrontIcon from "@mui/icons-material/Storefront";
import BuildIcon from "@mui/icons-material/Build";
import LogoutIcon from "@mui/icons-material/Logout";

const drawerWidth = 260;
const drawerCollapsedWidth = 72;

function NavItem({ to, icon, label, end, collapsed }) {
  return (
    <ListItemButton
      component={NavLink}
      to={to}
      end={end}
      sx={{
        mx: 1,
        my: 0.5,
        borderRadius: 2,
        justifyContent: collapsed ? "center" : "flex-start",
        "&.active": {
          backgroundColor: "rgba(255,255,255,0.08)",
        },
      }}
    >
      <ListItemIcon sx={{ minWidth: collapsed ? "auto" : 40, justifyContent: "center" }}>
        {icon}
      </ListItemIcon>
      <ListItemText primary={label} sx={{ display: collapsed ? "none" : "block" }} />
    </ListItemButton>
  );
}

export default function AppShell() {
  const session = getSession();
  const role = session?.role || "—";
  const isAdmin = useMemo(() => role === "ADMIN", [role]);
  const isEngineer = useMemo(() => role === "ENGINEER", [role]);

  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopHover, setDesktopHover] = useState(false);
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  const desktopCollapsed = !desktopHover;

  const drawer = (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Spacer so the fixed AppBar doesn't cover drawer content */}
      <Toolbar />

      <Toolbar sx={{ px: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            fontWeight={900}
            letterSpacing={0.2}
            noWrap
            sx={{ minWidth: 0, fontStyle: desktopCollapsed ? "italic" : "normal" }}
          >
            {desktopCollapsed ? "F1" : `Hola, ${session?.name || "—"}`}
          </Typography>
        </Box>
        <Box
          sx={{
            overflow: "hidden",
            width: desktopCollapsed ? 0 : "auto",
            opacity: desktopCollapsed ? 0 : 1,
            transition: "opacity 180ms ease",
          }}
        >
          <Chip size="small" label={role} />
        </Box>
      </Toolbar>

      <Divider />

      <List sx={{ py: 1 }}>
        <NavItem to="/dashboard" end icon={<DashboardIcon />} label="Dashboard" collapsed={desktopCollapsed} />

        {(isAdmin || isEngineer) && (
          <>
            <NavItem to="/teams" icon={<GroupsIcon />} label="Equipos" collapsed={desktopCollapsed} />
            <NavItem to="/assembly" icon={<BuildIcon />} label="Armado" collapsed={desktopCollapsed} />
            <NavItem to="/store" icon={<StorefrontIcon />} label="Tienda" collapsed={desktopCollapsed} />
          </>
        )}
      </List>

      <Box sx={{ flex: 1 }} />

      <Divider />
      <List sx={{ py: 1 }}>
        <ListItemButton onClick={onLogout} sx={{ mx: 1, my: 0.5, borderRadius: 2 }}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" sx={{ display: desktopCollapsed ? "none" : "block" }} />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Top bar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (t) => t.zIndex.drawer + 1,
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          backgroundColor: "rgba(17, 24, 35, 0.7)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Toolbar
          sx={{
            display: "grid",
            gridTemplateColumns: "48px 1fr 48px",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setMobileOpen((v) => !v)}
              sx={{ display: { sm: "none" } }}
              aria-label="open drawer"
            >
              <MenuIcon />
            </IconButton>
          </Box>

          <Typography
            component="div"
            sx={{
              justifySelf: "center",
              textAlign: "center",
              fontWeight: 900,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              fontStyle: "italic",
              lineHeight: 1,
              userSelect: "none",
              whiteSpace: "nowrap",
            }}
          >
            F1 Garage Manager
          </Typography>

          <Box />
        </Toolbar>
      </AppBar>

      {/* Sidebar (desktop) */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", sm: "block" },
          "& .MuiDrawer-paper": {
            width: desktopCollapsed ? drawerCollapsedWidth : drawerWidth,
            boxSizing: "border-box",
            borderRight: "1px solid rgba(255,255,255,0.08)",
            overflowX: "hidden",
            transition: "width 180ms ease",
          },
        }}
        PaperProps={{
          onMouseEnter: () => setDesktopHover(true),
          onMouseLeave: () => setDesktopHover(false),
        }}
        open
      >
        {drawer}
      </Drawer>

      {/* Sidebar (mobile) */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: { xs: "block", sm: "none" },
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
        ModalProps={{ keepMounted: true }}
      >
        {drawer}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          p: 3,
          pt: 12, // espacio por AppBar
          background:
            "radial-gradient(1200px circle at 20% 10%, rgba(255,30,30,0.10), transparent 55%), radial-gradient(900px circle at 80% 30%, rgba(0,200,255,0.08), transparent 60%)",
        }}
      >
        <Box
          key={location.pathname}
          sx={{
            animation: "pageEnter 320ms ease",
            "@keyframes pageEnter": {
              from: { opacity: 0, transform: "translateY(6px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
