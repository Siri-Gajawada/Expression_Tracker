import React, { useState, useEffect } from "react";
import { Pie } from "react-chartjs-2";
import "chart.js/auto";
import "./AdminApp.css";

function AdminApp() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/sessions");
      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
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
    try {
      const response = await fetch(
        `http://localhost:5000/analyze/${sessionId}`
      );
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const data = await response.json();
      setAnalysisData(data);
    } catch (error) {
      console.error("Error analyzing session:", error);
    }
  };

  const handleBackToSessions = () => {
    setSelectedSession(null);
    setAnalysisData(null);
  };

  const renderSessionList = () => (
    <div style={{ width: "100%" }}>
      <h3>Session List</h3>
      {isLoading ? (
        <p>Loading sessions...</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ backgroundColor: "#f4f4f4" }}>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>
                Username
              </th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>
                Session ID
              </th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>
                Date & Time
              </th>
              <th style={{ padding: "10px", border: "1px solid #ddd" }}>
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((user) => (
              <React.Fragment key={user.username}>
                {user.sessions.map((session, index) => (
                  <tr key={session.sessionId}>
                    {index === 0 && (
                      <td
                        style={{ padding: "10px", border: "1px solid #ddd" }}
                        rowSpan={user.sessions.length}
                      >
                        {user.username}
                      </td>
                    )}
                    <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                      {session.sessionId}
                    </td>
                    <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                      {new Date(session.createdAt).toLocaleString()}
                    </td>
                    <td style={{ padding: "10px", border: "1px solid #ddd" }}>
                      <button
                        onClick={() => handleSessionClick(session.sessionId)}
                        style={{
                          backgroundColor: "#4CAF50",
                          color: "white",
                          padding: "5px 10px",
                          border: "none",
                          borderRadius: "3px",
                          cursor: "pointer",
                        }}
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
      )}
    </div>
  );

  const renderPieChart = () => {
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
          data: Object.values(emotions).map((v) => parseFloat(v)),
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
            "#C9CBCF",
          ],
          borderWidth: 1,
        },
      ],
    };

    const options = {
      responsive: true,
      plugins: {
        legend: {
          position: "right",
        },
        title: {
          display: true,
        },
      },
    };

    return (
      <div className="pie-chart-container">
        <Pie data={data} options={options} />
      </div>
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
                    srcSet={`http://localhost:5000/uploads/webcam_images/${selectedSession}/small/${analysis.imagePath} 200w,
                             http://localhost:5000/uploads/webcam_images/${selectedSession}/medium/${analysis.imagePath} 400w,
                             http://localhost:5000/uploads/webcam_images/${selectedSession}/${analysis.imagePath} 800w`}
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
    <div style={{ padding: "20px", maxHeight: "100vh", overflowY: "auto" }}>
      <h2>Admin Dashboard</h2>

      {selectedSession ? (
        <div style={{ width: "100%" }}>
          <h3>Analysis for Session: {selectedSession}</h3>
          {renderPieChart()}
          {renderTable()}
          <button
            onClick={handleBackToSessions}
            style={{
              backgroundColor: "#A2C2E2",
              color: "#fff",
              padding: "10px 15px",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              marginTop: "20px",
              display: "block",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Back to Sessions
          </button>
        </div>
      ) : (
        renderSessionList()
      )}
    </div>
  );
}

export default AdminApp;