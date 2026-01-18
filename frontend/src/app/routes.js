import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/Login";
import Signup from "../pages/Signup";
import Dashboard from "../pages/Dashboard";
import Teams from "../pages/Teams";
import Store from "../pages/Store";
import Assembly from "../pages/Assembly";
import Sponsors from "../pages/Sponsors";
import Races from "../pages/Races";

import ProtectedRoute from "../components/ProtectedRoute";
import AppShell from "../components/AppShell";
import TeamDetail from "../pages/TeamDetail";
import { getSession } from "../services/auth";


export default function AppRoutes() {
  const session = getSession();
  const role = session?.role;
  const isDriver = role === "DRIVER";

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Zona protegida con sidebar */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/teams" element={isDriver ? <Navigate to="/dashboard" replace /> : <Teams />} />
        <Route path="/assembly" element={isDriver ? <Navigate to="/dashboard" replace /> : <Assembly />} />
        <Route path="/store" element={isDriver ? <Navigate to="/dashboard" replace /> : <Store />} />
        <Route path="/teams/:id" element={isDriver ? <Navigate to="/dashboard" replace /> : <TeamDetail />} />
        <Route path="sponsors" element={isDriver ? <Navigate to="/dashboard" replace /> : <Sponsors />} />
        <Route path="races" element={isDriver ? <Navigate to="/dashboard" replace /> : <Races />} />
      </Route>

      <Route path="*" element={<div style={{ padding: 24 }}>404</div>} />

    </Routes>
  );
}
