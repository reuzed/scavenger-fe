import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Builder from "./pages/Builder";
import HuntPlayer from "./pages/HuntPlayer";
import HuntLanding from "./pages/HuntLanding";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Builder />} />
        <Route path="/:prefix" element={<HuntLanding />} />
        <Route path="/:prefix/play/:groupId" element={<HuntPlayer />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
