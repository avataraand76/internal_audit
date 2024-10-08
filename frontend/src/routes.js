// src/routes.js
import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage.js";
import LoginPage from "./pages/LoginPage.js";
import CreatePhasePage from "./pages/CreatePhasePage.js";
import DetailedPhasePage from "./pages/DetailedPhasePage.js";
import ReportPage from "./pages/ReportPage.js";

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/create-phase" element={<CreatePhasePage />} />
        <Route
          path="/scoring-phases/:phaseId"
          element={<DetailedPhasePage />}
        />
        <Route path="/report" element={<ReportPage />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
