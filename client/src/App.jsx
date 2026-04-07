import { Route, Routes } from "react-router-dom";

import HomePage from "./pages/HomePage.jsx";
import MeetingDetailPage from "./pages/MeetingDetailPage.jsx";
import MeetingsPage from "./pages/MeetingsPage.jsx";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/meetings" element={<MeetingsPage />} />
      <Route path="/meetings/:meetingId" element={<MeetingDetailPage />} />
    </Routes>
  );
};

export default App;
