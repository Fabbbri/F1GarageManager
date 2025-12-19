import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/Login";
import Signup from "../pages/Signup";
import Dashboard from "../pages/Dashboard";
import Teams from "../pages/Teams";
import Store from "../pages/Store";
import Assembly from "../pages/Assembly";

import ProtectedRoute from "../components/ProtectedRoute";
import AppShell from "../components/AppShell";
import TeamDetail from "../pages/TeamDetail";


export default function AppRoutes() {
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
        <Route path="/teams" element={<Teams />} />
        <Route path="/assembly" element={<Assembly />} />
        <Route path="/store" element={<Store />} />
        <Route path="/teams/:id" element={<TeamDetail />} />
      </Route>

      <Route path="*" element={<div style={{ padding: 24 }}>404</div>} />

    </Routes>
  );
}
