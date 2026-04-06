import { Route, Routes } from "react-router-dom";

import DashboardPage from "./pages/DashboardPage.jsx";
import MeetingDetailPage from "./pages/MeetingDetailPage.jsx";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/meetings/:meetingId" element={<MeetingDetailPage />} />
    </Routes>
  );
};

export default App;
