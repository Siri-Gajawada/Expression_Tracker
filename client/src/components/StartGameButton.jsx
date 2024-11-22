import React from "react";
import { Circle, Square, Triangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./StartGameButton.css";

const StartGameButton = () => {
  const navigate = useNavigate();

  const handleStartGame = () => {
    navigate("/game"); // Redirect to the game page
  };

  return (
    <div className="game-start-container">
      <div className="game-start-content">
        <div className="animated-shapes">
          <Circle className="shape pink" size={48} />
          <Square className="shape blue" size={48} />
          <Triangle className="shape purple" size={48} />
        </div>

        <h1 className="game-title">
          Welcome to Shape Counting Game!
        </h1>

        <button 
          onClick={handleStartGame}
          className="start-button"
        >
          Play Game! 🎯
        </button>
      </div>
    </div>
  );
};

export default StartGameButton;
