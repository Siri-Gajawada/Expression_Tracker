// src/App.js
import React from "react";
import "./App.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import GameComponent from "./components/GameComponent";
import ImageCaptureComponent from "./components/ImageCaptureComponent";
import LoginPage from "./components/LoginPage/LoginPage"; // Adjust path as necessary
import AdminApp from "./components/AdminApp/AdminApp"; // Adjust path as necessary

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route
          path="/game"
          element={
            <>
              <GameComponent /> <ImageCaptureComponent />
            </>
          }
        />
        <Route path="/admin" element={<AdminApp />} />
      </Routes>
    </Router>
  );
}
export default App;
