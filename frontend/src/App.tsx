import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { DashboardPage } from "./pages/DashboardPage";
import { ScenariosPage } from "./pages/ScenariosPage";
import { SuitesPage } from "./pages/SuitesPage";
import { RunsPage, RunDetailPage } from "./pages/RunsPage";
import { TargetsPage } from "./pages/TargetsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/"            element={<DashboardPage />} />
          <Route path="/scenarios"   element={<ScenariosPage />} />
          <Route path="/suites"      element={<SuitesPage />} />
          <Route path="/runs"        element={<RunsPage />} />
          <Route path="/runs/:id"    element={<RunDetailPage />} />
          <Route path="/targets"     element={<TargetsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
