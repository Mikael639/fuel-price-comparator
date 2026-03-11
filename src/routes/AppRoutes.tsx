import { Route, Routes } from "react-router-dom";
import { HomePage } from "@/routes/HomePage";
import { StationDetailPage } from "@/routes/StationDetailPage";

export const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<HomePage />} path="/" />
      <Route element={<StationDetailPage />} path="/station/:id" />
    </Routes>
  );
};
