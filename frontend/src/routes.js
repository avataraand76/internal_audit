// src/routes.js
import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage.js";
import LoginPage from "./pages/LoginPage.js";
import ScoringPage from "./pages/ScoringPage.js";
import DetailedScoringPhasePage from "./pages/DetailedScoringPhasePage.js";
import ReportPage from "./pages/ReportPage.js";

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/scoring" element={<ScoringPage />} />
        <Route
          path="/scoring-phases/:phaseId"
          element={<DetailedScoringPhasePage />}
        />
        <Route path="/report" element={<ReportPage />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
