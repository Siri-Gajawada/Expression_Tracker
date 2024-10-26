const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const axios = require("axios");
const FormData = require("form-data");
const sharp = require("sharp");
const cors = require("cors");

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

mongoose.connect('mongodb+srv://leela:leeladhari@cluster0.aokrg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', { useNewUrlParser: true, useUnifiedTopology: true });

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
  }
});

const Analysis = mongoose.model('Analysis', AnalysisSchema);

let currentSessionId = null;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!currentSessionId) {
      return cb(new Error("Session ID is missing."), null);
    }
    const sessionPath = file.fieldname === "webcam"
      ? path.join(__dirname, "uploads", "webcam_images", currentSessionId)
      : path.join(__dirname, "uploads", "screenshots", currentSessionId);
    fs.mkdirSync(sessionPath, { recursive: true });
    cb(null, sessionPath);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}.png`);
  },
});

const upload = multer({ storage });

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function analyzeImage(imagePath, retryCount = 0, maxRetries = 5) {
  try {
    const imageBuffer = await fs.promises.readFile(imagePath);

    if (!imageBuffer || imageBuffer.length === 0) {
      throw new Error("Image file is empty or unreadable.");
    }

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

    // If model is loading, retry with exponential backoff
    if (response.data.error?.includes("Model is loading")) {
      if (retryCount < maxRetries) {
        const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 seconds
        await delay(backoffTime);
        return analyzeImage(imagePath, retryCount + 1, maxRetries);
      } else {
        throw new Error("Max retries reached while waiting for model to load");
      }
    }

    // Initialize emotions object
    const emotions = {
      angry: 0,
      disgust: 0,
      fear: 0,
      happy: 0,
      sad: 0,
      surprise: 0,
      neutral: 0
    };

    // Calculate total score for normalization
    let totalScore = 0;
    response.data.forEach((result) => {
      if (result.label.toLowerCase() in emotions) {
        totalScore += result.score;
      }
    });

    // Normalize emotions to sum to 100%
    response.data.forEach((result) => {
      if (result.label.toLowerCase() in emotions) {
        emotions[result.label.toLowerCase()] = ((result.score / totalScore) * 100).toFixed(2);
      }
    });

    // Find dominant emotion
    let dominantEmotion = Object.entries(emotions).reduce((max, [emotion, value]) => 
      parseFloat(value) > parseFloat(max[1]) ? [emotion, value] : max, 
      ['neutral', '0']
    )[0];

    return { emotions, dominantEmotion };

  } catch (error) {
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

app.get("/start-session", async (req, res) => {
  currentSessionId = `session_${Date.now()}`;
  res.json({ sessionId: currentSessionId });
});

app.post("/upload", upload.fields([{ name: "screenshot" }, { name: "webcam" }]), (req, res) => {
  if (!currentSessionId) {
    return res.status(400).json({ error: "Session ID is missing." });
  }
  res.json({ message: "Images uploaded successfully!" });
});

app.get("/sessions", (req, res) => {
  const sessionsDir = path.join(__dirname, "uploads", "webcam_images");
  fs.readdir(sessionsDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Error reading sessions directory" });
    }
    res.json({ sessions: files });
  });
});

app.get("/analyze/:sessionId", async (req, res) => {
  const { sessionId } = req.params;
  const sessionDir = path.join(__dirname, "uploads", "webcam_images", sessionId);
  
  try {
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

    // Initialize overall analysis with all emotions set to 0
    const totalEmotions = {
      angry: 0,
      disgust: 0,
      fear: 0,
      happy: 0,
      sad: 0,
      surprise: 0,
      neutral: 0
    };

    // Sum up all emotion values from each image analysis
    imageAnalyses.forEach(({ emotions }) => {
      for (const emotion in emotions) {
        totalEmotions[emotion] += parseFloat(emotions[emotion]);
      }
    });

    // Calculate average for each emotion
    const overallAnalysis = {
      emotions: {}
    };

    for (const emotion in totalEmotions) {
      overallAnalysis.emotions[emotion] = (totalEmotions[emotion] / imageAnalyses.length).toFixed(2);
    }

    const analysisDoc = new Analysis({
      sessionId,
      imageAnalysis: imageAnalyses,
      overallAnalysis
    });
    await analysisDoc.save();

    res.json({ imageAnalyses, overallAnalysis });
  } catch (error) {
    console.error('Error during analysis:', error);
    res.status(500).json({ error: "Error analyzing images" });
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});