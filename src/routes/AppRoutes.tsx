import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { HomePage } from "@/routes/HomePage";

// Les pages secondaires sont chargees a la demande pour alleger le bundle initial.
const StationDetailPage = lazy(() =>
  import("@/routes/StationDetailPage").then((module) => ({ default: module.StationDetailPage })),
);
const TrendPage = lazy(() => import("@/routes/TrendPage"));
const EuropePage = lazy(() => import("@/routes/EuropePage"));

const RouteFallback = () => (
  <div aria-busy="true" aria-label="Chargement de la page" className="mx-auto max-w-5xl space-y-4 px-4 py-8" role="status">
    <Skeleton className="h-8 w-1/3" />
    <Skeleton className="h-64 w-full" />
  </div>
);

export const AppRoutes = () => {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<HomePage />} path="/" />
        <Route element={<StationDetailPage />} path="/station/:id" />
        <Route element={<TrendPage />} path="/trends" />
        <Route element={<EuropePage />} path="/europe" />
      </Routes>
    </Suspense>
  );
};
