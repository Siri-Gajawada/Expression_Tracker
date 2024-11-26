// client/src/services/api.js

import axios from "axios";

const API_URL = "http://localhost:5000";

export const uploadImages = async (screenshot, webcamImage, sessionId) => {
  try {
    if (!sessionId) throw new Error("Session ID is required for image upload.");

    const formData = new FormData();
    formData.append("screenshot", screenshot);
    formData.append("webcam", webcamImage);
    formData.append("sessionId", sessionId);

    const config = {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    };

    const response = await axios.post(
      `${API_URL}/upload?currentSessionId=${sessionId}`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error("Error uploading images:", error);
    throw error;
  }
};

export const fetchSessions = async () => {
  try {
    const response = await axios.get(`${API_URL}/sessions`);
    // Assuming the response data has a 'sessions' property with an array of session IDs
    return response.data.sessions;
  } catch (error) {
    console.error("Error fetching sessions:", error);
    throw error;
  }
};

export const analyzeSession = async (sessionId) => {
  try {
    const response = await axios.get(`${API_URL}/analyze/${sessionId}`);

    // Check if the response data has the expected structure
    if (response.data.imageAnalyses && response.data.overallAnalysis) {
      return {
        imageAnalyses: response.data.imageAnalyses,
        overallEmotions: response.data.overallAnalysis.emotions,
      };
    } else {
      console.error("Invalid response data structure:", response.data);
      throw new Error("Invalid response data structure");
    }
  } catch (error) {
    console.error("Error analyzing session:", error);
    throw error;
  }
};