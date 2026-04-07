import { Route, Routes } from "react-router-dom";
import { HomePage } from "@/routes/HomePage";
import { StationDetailPage } from "@/routes/StationDetailPage";
import TrendPage from "@/routes/TrendPage";
import EuropePage from "@/routes/EuropePage";

export const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<HomePage />} path="/" />
      <Route element={<StationDetailPage />} path="/station/:id" />
      <Route element={<TrendPage />} path="/trends" />
      <Route element={<EuropePage />} path="/europe" />
    </Routes>
  );
};
