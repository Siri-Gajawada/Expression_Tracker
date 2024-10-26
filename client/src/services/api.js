// client/src/services/api.js

import axios from "axios";

const API_URL = "http://localhost:5000";

export const uploadImages = async (screenshot, webcamImage) => {
  try {
    const formData = new FormData();
    formData.append("screenshot", screenshot);
    formData.append("webcam", webcamImage);

    // Remove the 'Content-Type' header, as it's automatically set by Axios
    const response = await axios.post(`${API_URL}/upload`, formData);

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
