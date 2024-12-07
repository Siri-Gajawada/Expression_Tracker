import React, { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import "./SessionList.css";
import "./AnalysisView.css";

function AdminApp() {
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // For session list
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false); // For analysis loading
  const [selectedSession, setSelectedSession] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/sessions");
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error("Error fetching sessions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSessionClick = async (sessionId) => {
    setSelectedSession(sessionId);
    setIsAnalysisLoading(true);
    try {
      const response = await fetch(
        `http://localhost:5000/analyze/${sessionId}`
      );
      if (!response.ok) {
        if (response.status === 404) {
          setAnalysisData({
            imageAnalyses: [],
            overallAnalysis: { emotions: {} },
          });
        } else {
          throw new Error("Network response was not ok");
        }
      }
      const data = await response.json();
      setAnalysisData(data);
    } catch (error) {
      console.error("Error analyzing session:", error);
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  const handleBackToSessions = () => {
    setSelectedSession(null);
    setAnalysisData(null);
  };

  const renderSessionsList = () => (
    <div className="sessions-list-container">
      <h2 className="admin-dashboard-h2">Admin Dashboard</h2>
      <h3 className="session-list-h3">Session List 📋</h3>
      {isLoading ? (
        <p>Loading sessions...</p>
      ) : (
        <div className="table-container1">
          <table className="sessions-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Session ID</th>
                <th>Date & Time</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((user) => (
                <React.Fragment key={user.username}>
                  {user.sessions.map((session, index) => (
                    <tr key={session.sessionId} className="session-row">
                      {index === 0 && (
                        <td rowSpan={user.sessions.length}>
                          {user.username} 👤
                        </td>
                      )}
                      <td>{session.sessionId}</td>
                      <td>{new Date(session.createdAt).toLocaleString()}</td>
                      <td>
                        <button
                          onClick={() => handleSessionClick(session.sessionId)}
                          className="action-button"
                        >
                          Get Analysis
                        </button>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderBarChart = () => {
    if (
      !analysisData ||
      !analysisData.overallAnalysis ||
      Object.keys(analysisData.overallAnalysis.emotions).length === 0
    )
      return null;

    const emotions = analysisData.overallAnalysis.emotions;
    const emotionLabelsWithEmojis = {
      happy: "😊 Happy",
      sad: "😢 Sad",
      angry: "😠 Angry",
      surprised: "😮 Surprised",
      fearful: "😨 Fearful",
      neutral: "😐 Neutral",
      disgust: "🤢 Disgust",
      fear: "😨 Fear",
      surprise: "😯 Surprise",
    };

    const data = {
      labels: Object.keys(emotions).map(
        (emotion) => emotionLabelsWithEmojis[emotion] || emotion
      ),
      datasets: [
        {
          label: "Emotion Percentage",
          data: Object.values(emotions).map((v) => parseFloat(v)),
          backgroundColor: "#4BC0C0",
          borderColor: "#36A2EB",
          borderWidth: 1,
        },
      ],
    };

    const options = {
      responsive: true,
      plugins: {
        legend: { position: "top" },
        title: { display: true, text: "Emotion Distribution" },
      },
      scales: { y: { beginAtZero: true } },
    };

    return (
      <div className="bar-chart-container">
        <Bar data={data} options={options} />
      </div>
    );
  };

  const renderAnalysis = () => {
    if (isAnalysisLoading) {
      return (
        <p className="isloading-container">Loading analysis, please wait...</p>
      );
    }

    return (
      <>
        {renderBarChart()}
        {renderTable()}
        <button onClick={handleBackToSessions} className="back-to-sessions-btn">
          ← Back to Sessions
        </button>
      </>
    );
  };

  const renderTable = () => {
    if (!analysisData || analysisData.imageAnalyses.length === 0) return null;

    return (
      <div className="table-container">
        <table className="analysis-table">
          <thead>
            <tr>
              <th>Webcam Capture</th>
              <th>Game Screenshot</th>
              <th>Analysis</th>
            </tr>
          </thead>
          <tbody>
            {analysisData.imageAnalyses.map((analysis, index) => (
              <tr key={index}>
                <td>
                  <img
                    src={`http://localhost:5000/uploads/webcam_images/${selectedSession}/${analysis.imagePath}`}
                    alt={`Webcam ${index}`}
                    className="webcam-image"
                    loading="lazy"
                  />
                </td>
                <td>
                  <img
                    src={`http://localhost:5000/uploads/screenshots/${selectedSession}/${analysis.imagePath}`}
                    alt={`Game Screenshot ${index}`}
                    className="screenshot-image"
                    loading="lazy"
                  />
                </td>
                <td className="analysis-data">
                  <h4>Emotion Analysis:</h4>
                  {Object.entries(analysis.emotions).map(([emotion, value]) => (
                    <div key={emotion} className="emotion-item">
                      <span>{emotion}:</span>
                      <span>{parseFloat(value).toFixed(2)}%</span>
                    </div>
                  ))}
                  <div className="dominant-emotion">
                    <strong>Dominant Emotion: </strong>
                    <span>{analysis.dominantEmotion}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="admin-app-container">
      <div className="content-container">
        {selectedSession ? renderAnalysis() : renderSessionsList()}
      </div>
    </div>
  );
}

export default AdminApp;