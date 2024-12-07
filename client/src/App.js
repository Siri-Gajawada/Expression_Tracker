// src/App.js
import React from "react";
import "./App.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import GameComponent from "./components/GameComponent/GameComponent";
import ImageCaptureComponent from "./components/ImageCapture/ImageCaptureComponent";
import LoginPage from "./components/LoginPage/LoginPage";
import AdminApp from "./components/AdminApp/AdminApp";
import StartGameButton from "./components/StartGameButton/StartGameButton";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/start-game" element={<StartGameButton />} />
        <Route
          path="/game"
          element={
            <>
              <GameComponent />
              <ImageCaptureComponent />
            </>
          }
        />
        <Route path="/admin" element={<AdminApp />} />
      </Routes>
    </Router>
  );
}

export default App;