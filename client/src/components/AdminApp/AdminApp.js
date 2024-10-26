import React, { useState, useEffect } from 'react';
import { Pie } from 'react-chartjs-2'; // Changed Bar to Pie component
import 'chart.js/auto'; // Import auto to handle chart.js registration

function AdminApp() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('http://localhost:5000/sessions');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      setSessions(data.sessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const handleSessionClick = async (sessionId) => {
    setSelectedSession(sessionId);
    try {
      const response = await fetch(`http://localhost:5000/analyze/${sessionId}`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();
      setAnalysisData(data);
    } catch (error) {
      console.error('Error analyzing session:', error);
    }
  };

  const handleBackToSessions = () => {
    setSelectedSession(null);
    setAnalysisData(null);
  };

  const renderTable = () => {
    if (!analysisData || !analysisData.imageAnalyses) return null;

    return (
      <div style={{ overflowX: 'auto', marginTop: '20px' }}> {/* Enable horizontal scrolling */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '12px', backgroundColor: '#f2f2f2', textAlign: 'center' }}>Webcam Capture</th>
              <th style={{ border: '1px solid #ddd', padding: '12px', backgroundColor: '#f2f2f2', textAlign: 'center' }}>Game Screenshot</th>
              <th style={{ border: '1px solid #ddd', padding: '12px', backgroundColor: '#f2f2f2', textAlign: 'center' }}>Analysis</th>
            </tr>
          </thead>
          <tbody>
            {analysisData.imageAnalyses.map((analysis, index) => (
              <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center' }}>
                  <img 
                    src={`http://localhost:5000/uploads/webcam_images/${selectedSession}/${analysis.imagePath}`} 
                    srcSet={`http://localhost:5000/uploads/webcam_images/${selectedSession}/small/${analysis.imagePath} 200w,
                             http://localhost:5000/uploads/webcam_images/${selectedSession}/medium/${analysis.imagePath} 400w,
                             http://localhost:5000/uploads/webcam_images/${selectedSession}/${analysis.imagePath} 800w`}
                    sizes="(max-width: 400px) 200px, (max-width: 800px) 400px, 800px"
                    alt={`Webcam ${index}`} 
                    style={{ width: '100%', height: 'auto', borderRadius: '5px' }}
                    loading="lazy" 
                  />
                </td>
                
                <td style={{ border: '1px solid #ddd', padding: '12px', textAlign: 'center' }}>
                  <img 
                    src={`http://localhost:5000/uploads/game_screenshots/${selectedSession}/screenshot_${index}.png`} 
                    srcSet={`http://localhost:5000/uploads/game_screenshots/${selectedSession}/small/screenshot_${index}.png 200w,
                             http://localhost:5000/uploads/game_screenshots/${selectedSession}/medium/screenshot_${index}.png 400w,
                             http://localhost:5000/uploads/game_screenshots/${selectedSession}/screenshot_${index}.png 800w`}
                    sizes="(max-width: 400px) 200px, (max-width: 800px) 400px, 800px"
                    alt={`Game Screenshot ${index}`} 
                    style={{ width: '100%', height: 'auto', borderRadius: '5px' }}
                    loading="lazy" 
                  />
                </td>

                <td style={{ border: '1px solid #ddd', padding: '12px' }}>
                  {Object.entries(analysis.emotions).map(([emotion, value]) => (
                    <p key={emotion} style={{ margin: '5px 0' }}>{emotion}: {parseFloat(value).toFixed(2)}%</p>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderPieChart = () => {
    if (!analysisData || !analysisData.overallAnalysis) return null;

    const emotions = analysisData.overallAnalysis.emotions;
    const data = {
      labels: Object.keys(emotions),
      datasets: [{
        label: 'Emotion Analysis (%)',
        data: Object.values(emotions).map(v => parseFloat(v)),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'],
      }]
    };

    const options = {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
      },
    };

    return (
      <div style={{ width: '60%', margin: '0 auto' }}>
        <h3 style={{ textAlign: 'center' }}>Overall Emotion Analysis</h3>
        <Pie data={data} options={options} />
      </div>
    );
  };

  return (
    <div style={{ padding: '20px', maxHeight: '100vh', overflowY: 'auto' }}> {/* Added maxHeight and overflowY */}
      <h2>Admin Dashboard</h2>
      
      {/* Pie Chart for Overall Emotion Analysis */}
      {renderPieChart()}

      <div style={{ display: 'flex', marginTop: '40px' }}>
        {selectedSession ? (
          <div style={{ width: '100%' }}>
            <h3>Analysis for Session: {selectedSession}</h3>
            {renderTable()}
            
            {/* Back to Sessions Button */}
            <button 
              onClick={handleBackToSessions} 
              style={{
                backgroundColor: '#A2C2E2', // Pastel blue color
                color: '#fff',
                padding: '10px 15px',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                marginTop: '20px',
                display: 'block',
                marginLeft: 'auto',
                marginRight: 'auto'
              }}
            >
              Back to Sessions
            </button>
          </div>
        ) : (
          <div style={{ width: '30%', marginRight: '20px' }}>
            <h3>Sessions</h3>
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {sessions.map((session) => (
                <li 
                  key={session} 
                  onClick={() => handleSessionClick(session)}
                  style={{ cursor: 'pointer', padding: '10px', border: '1px solid #ddd', marginBottom: '5px' }}
                >
                  {session}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminApp;
