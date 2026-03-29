import { Route, Routes } from "react-router-dom";

import DashboardPage from "./pages/DashboardPage.jsx";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
    </Routes>
  );
};

export default App;

