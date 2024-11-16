// Required module imports
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const axios = require("axios");
const FormData = require("form-data");
const sharp = require("sharp");
const cors = require("cors");

// Initialize Express app
const app = express();
const port = 5000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));  // Serve static files in 'uploads' directory

// MongoDB Connection
mongoose.connect('mongodb+srv://leela:leeladhari@cluster0.aokrg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB successfully');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

// Define MongoDB schema for analysis
const AnalysisSchema = new mongoose.Schema({
  sessionId: String,
  imageAnalysis: [{
    imagePath: String,
    emotions: {
      angry: Number,
      disgust: Number,
      fear: Number,
      happy: Number,
      sad: Number,
      surprise: Number,
      neutral: Number
    },
    dominantEmotion: String
  }],
  overallAnalysis: {
    emotions: {
      angry: Number,
      disgust: Number,
      fear: Number,
      happy: Number,
      sad: Number,
      surprise: Number,
      neutral: Number
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create Analysis model
const Analysis = mongoose.model('Analysis', AnalysisSchema);

let currentSessionId = null;  // Holds current session ID

// Multer configuration for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!currentSessionId) {
      return cb(new Error("Session ID is missing."), null);
    }
    // Set upload path based on file type and session ID
    const sessionPath = file.fieldname === "webcam"
      ? path.join(__dirname, "uploads", "webcam_images", currentSessionId)
      : path.join(__dirname, "uploads", "screenshots", currentSessionId);
    fs.mkdirSync(sessionPath, { recursive: true });
    cb(null, sessionPath);
  },
  filename: (req, file, cb) => {
    // Create filename with timestamp for uniqueness
    const now = new Date();
    const dateString = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeString = now.toTimeString().split(' ')[0].split(':').join('-'); // HH-MM-SS
    const filename = `${dateString}_${timeString}.png`; // Format: YYYY-MM-DD_HH-MM-SS.png
    cb(null, filename);
  },
});

const upload = multer({ storage });

// Helper function to delay execution
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Image analysis function with retry mechanism
async function analyzeImage(imagePath, retryCount = 0, maxRetries = 5) {
  try {
    // Read image as buffer
    const imageBuffer = await fs.promises.readFile(imagePath);

    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error("Image file is empty or unreadable.");
    }

    // Send image to external model API for analysis
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/motheecreator/vit-Facial-Expression-Recognition",
      imageBuffer,
      {
        headers: {
          'Authorization': 'Bearer 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',
          'Content-Type': 'application/json'
        }
      }
    );

    // Retry if model is loading
    if (response.data.error?.includes("Model is loading")) {
      if (retryCount < maxRetries) {
        const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 seconds
        await delay(backoffTime);
        return analyzeImage(imagePath, retryCount + 1, maxRetries);
      } else {
        throw new Error("Max retries reached while waiting for model to load");
      }
    }

    // Calculate emotion percentages
    const emotions = {
      angry: 0,
      disgust: 0,
      fear: 0,
      happy: 0,
      sad: 0,
      surprise: 0,
      neutral: 0
    };

    let totalScore = 0;
    response.data.forEach((result) => {
      if (result.label.toLowerCase() in emotions) {
        totalScore += result.score;
      }
    });

    response.data.forEach((result) => {
      if (result.label.toLowerCase() in emotions) {
        emotions[result.label.toLowerCase()] = ((result.score / totalScore) * 100).toFixed(2);
      }
    });

    // Determine dominant emotion
    let dominantEmotion = Object.entries(emotions).reduce((max, [emotion, value]) =>
      parseFloat(value) > parseFloat(max[1]) ? [emotion, value] : max,
      ['neutral', '0']
    )[0];

    return { emotions, dominantEmotion };

  } catch (error) {
    // Retry logic for failed analyses
    if (retryCount < maxRetries) {
      const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 seconds
      await delay(backoffTime);
      return analyzeImage(imagePath, retryCount + 1, maxRetries);
    }

    console.error("Error analyzing image:", path.basename(imagePath), error.message);
    return {
      emotions: {
        angry: "0.00",
        disgust: "0.00",
        fear: "0.00",
        happy: "0.00",
        sad: "0.00",
        surprise: "0.00",
        neutral: "100.00"
      },
      dominantEmotion: 'neutral'
    };
  }
}

// API to start a new session and generate session ID
app.get("/start-session", async (req, res) => {
  currentSessionId = `session_${Date.now()}`;
  res.json({ sessionId: currentSessionId });
});

// API to upload images (screenshots and webcam captures)
app.post("/upload", upload.fields([{ name: "screenshot" }, { name: "webcam" }]), (req, res) => {
  if (!currentSessionId) {
    return res.status(400).json({ error: "Session ID is missing." });
  }

  const screenshotPaths = req.files['screenshot'].map(file => path.join(__dirname, "uploads", "screenshots", currentSessionId, file.filename));
  console.log("Uploaded screenshot paths:", screenshotPaths);

  res.json({ message: "Images uploaded successfully!" });
});

// API to get all available sessions
app.get("/sessions", async (req, res) => {
  try {
    // Retrieve sessions from MongoDB
    const analyses = await Analysis.find({}, 'sessionId createdAt').sort({ createdAt: -1 });
    const sessionsFromDB = analyses.map(analysis => analysis.sessionId);

    // Get session directories on filesystem
    const sessionsDir = path.join(__dirname, "uploads", "webcam_images");
    const filesystemSessions = await fs.promises.readdir(sessionsDir);

    // Combine MongoDB and filesystem sessions, removing duplicates
    const allSessions = [...new Set([...sessionsFromDB, ...filesystemSessions])];

    res.json({ sessions: allSessions });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ error: "Error reading sessions" });
  }
});

// API to analyze images in a session, or retrieve existing analysis from MongoDB
app.get("/analyze/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  try {
    // Check if analysis already exists in MongoDB
    const existingAnalysis = await Analysis.findOne({ sessionId });

    if (existingAnalysis) {
      console.log(`Found existing analysis for session ${sessionId}`);
      return res.json({
        imageAnalyses: existingAnalysis.imageAnalysis,
        overallAnalysis: existingAnalysis.overallAnalysis
      });
    }

    // Process new images for analysis
    const sessionDir = path.join(__dirname, "uploads", "webcam_images", sessionId);
    const files = await fs.promises.readdir(sessionDir);
    const batchSize = 3;
    const imageAnalyses = [];

    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      const batchPromises = batch.map(async (file) => {
        const imagePath = path.join(sessionDir, file);
        const { emotions, dominantEmotion } = await analyzeImage(imagePath);
        return { imagePath: file, emotions, dominantEmotion };
      });

      const batchResults = await Promise.all(batchPromises);
      imageAnalyses.push(...batchResults);
    }

    // Calculate overall emotion analysis
    const totalEmotions = {
      angry: 0,
      disgust: 0,
      fear: 0,
      happy: 0,
      sad: 0,
      surprise: 0,
      neutral: 0
    };
    let totalImages = imageAnalyses.length;

    imageAnalyses.forEach(({ emotions }) => {
      Object.entries(emotions).forEach(([emotion, value]) => {
        totalEmotions[emotion] += parseFloat(value);
      });
    });

    const overallAnalysis = {
      emotions: Object.fromEntries(Object.entries(totalEmotions).map(([emotion, value]) => [emotion, (value / totalImages).toFixed(2)]))
    };

    const newAnalysis = new Analysis({ sessionId, imageAnalysis: imageAnalyses, overallAnalysis });
    await newAnalysis.save();

    res.json({ imageAnalyses, overallAnalysis });

  } catch (error) {
    console.error("Error analyzing images:", error);
    res.status(500).json({ error: "Error analyzing images" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
