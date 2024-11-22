// src/components/GameComponent.jsx
import React, { useState, useEffect } from 'react';
import './GameComponent.css';
import ImageCapture from './ImageCaptureComponent';

const shapes = ['circle', 'square', 'triangle'];

// Function to shuffle an array
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function App() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [score, setScore] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [shuffledOptions, setShuffledOptions] = useState([]);
  const [streak, setStreak] = useState(0);
  const [isGameActive, setIsGameActive] = useState(true);
  const [sessionId, setSessionId] = useState(null);

  // Function to request a new session ID from the server
  const startSession = async () => {
    try {
      const response = await fetch('http://localhost:5000/start-session');
      const data = await response.json();
      setSessionId(data.sessionId);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  useEffect(() => {
    startSession(); // Start a new session when the game loads
  }, []);

  useEffect(() => {
    const newQuestions = Array(5)
      .fill(null)
      .map(() => {
        const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
        const randomCount = Math.floor(Math.random() * 5) + 1;
        const sequence = Array(randomCount)
          .fill(randomShape)
          .concat(
            Array(9 - randomCount).fill(null).map(() => shapes[Math.floor(Math.random() * shapes.length)]),
          );

        const correctAnswer = sequence.filter((s) => s === randomShape).length;

        let options = [correctAnswer];
        while (options.length < 4) {
          const randomOption = Math.floor(Math.random() * 5) + 1;
          if (!options.includes(randomOption)) {
            options.push(randomOption);
          }
        }

        return {
          shape: randomShape,
          sequence,
          correctAnswer,
          options: shuffleArray([...options])
        };
      });
    setQuestions(newQuestions);
  }, []);

  useEffect(() => {
    if (questions.length > 0 && currentQuestion < questions.length) {
      const { options } = questions[currentQuestion];
      setShuffledOptions(options);
    }
  }, [currentQuestion, questions]);

  const handleAnswer = (answer) => {
    if (!isAnswered) {
      setSelectedAnswer(answer);
      setIsAnswered(true);

      const correctAnswer = questions[currentQuestion].correctAnswer;
      const correct = answer === correctAnswer;
      setIsCorrect(correct);

      if (correct) {
        setScore(score + 1);
        setStreak(streak + 1); // Increment streak for correct answers
      } else {
        setStreak(0); // Reset streak on wrong answer
      }
    }
  };

  const nextQuestion = () => {
    setSelectedAnswer(null);
    setIsAnswered(false);
    setIsCorrect(null);
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setIsGameActive(false); // Set game as inactive when finished
      setCurrentQuestion(questions.length);
    }
  };

  const restartGame = async () => {
    await startSession(); // Start a new session when the game restarts
    setScore(0);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setIsCorrect(null);
    setStreak(0);
    setIsGameActive(true);
  };

  // Function to return the appropriate emoji based on the answer and streak
  const getSmiley = () => {
    if (!isAnswered) {
      return '😊'; // Neutral smiley before answering
    }
    if (isCorrect) {
      return streak > 1 ? '😁' : '😃'; // Happiest for streak, happy for single correct
    } else {
      return '😢'; // Sad for wrong answer
    }
  };

  // Render ImageCapture component only when game is active
  const renderImageCapture = () => {
    if (isGameActive && sessionId) {
      return <ImageCapture sessionId={sessionId} isActive={isGameActive} />;
    }
    return null;
  };

  if (currentQuestion >= questions.length) {
    return (
      <div className="app">
        <h1 className="game-title">Shape Counting Game</h1>
        <div className="game-container">
          <p className="result">Your score: {score} / {questions.length}</p>
          <button
            className="restart-btn"
            onClick={restartGame}
            aria-label="Play Again"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) return <div>Loading...</div>;

  const { shape, sequence, options } = questions[currentQuestion];

  return (
    <div className="app">
      {renderImageCapture()}
      <h1 className="game-title">Shape Counting Game</h1>
      <div className="game-container">
        <h3>How many <span className="target-shape">{shape}s</span> are in the sequence?</h3>
        <div className="shape-sequence">
          {sequence.map((s, index) => (
            <div 
              key={index} 
              className={`shape ${s} ${isCorrect === false ? 'sad' : ''}`} 
              aria-label={`A ${s}`}
            >
              {s && <span className="smiley">{getSmiley()}</span>}
            </div>
          ))}
        </div>
        <div className="options-container">
          {shuffledOptions.map((option, index) => (
            <button
              key={index}
              className="option-btn"
              onClick={() => handleAnswer(option)}
              disabled={isAnswered}
              aria-label={`Select ${option}`}
            >
              {option}
            </button>
          ))}
        </div>
        {selectedAnswer !== null && (
          <div>
            <p className="result">
              {isCorrect ? 'Correct!' : `Wrong! The correct answer was ${questions[currentQuestion].correctAnswer}.`}
            </p>
            <button
              className="next-btn"
              onClick={nextQuestion}
              aria-label="Next Question"
            >
              Next Question
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;