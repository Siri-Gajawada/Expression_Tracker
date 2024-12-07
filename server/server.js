require("dotenv").config();
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
const port = process.env.PORT;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// User Profile Schema
const userProfileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, required: true },
  phone: { type: String, required: true },
  sessions: [
    {
      sessionId: {
        type: String,
        required: true,
      },
      createdAt: {
        type: Date,
        default: Date.now, // Automatically set the session  creation date
      },
    },
  ],
});

const UserProfile = mongoose.model("UserProfile", userProfileSchema);

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI, {})
  .then(() => {
    console.log("Connected to MongoDB successfully");
    uploadDefaultProfiles();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// Function to insert default profiles
async function uploadDefaultProfiles() {
  try {
    const existingProfiles = await UserProfile.find();
    console.log("Existing profiles found:", existingProfiles);

    const profiles = [
      {
        name: "admin",
        password: "admin123",
        role: "admin",
        phone: "1234567890",
      },
      { name: "user1", password: "user123", role: "kid", phone: "0987654321" },
      { name: "user2", password: "user123", role: "kid", phone: "1122334455" },
      { name: "user3", password: "user123", role: "kid", phone: "1122334455" },
      { name: "vijju", password: "123", role: "kid", phone: "1122334455" },
      { name: "siri", password: "123", role: "kid", phone: "1122334455" },
    ];

    for (const profile of profiles) {
      const existingUser = await UserProfile.findOne({ name: profile.name });
      if (!existingUser) {
        const newProfile = new UserProfile(profile);
        await newProfile.save();
        console.log("Profile inserted:", profile);
      } else {
        console.log("Profile already exists, skipping:", profile.name);
      }
    }
  } catch (error) {
    console.error("Error uploading default profiles:", error);
  }
}

// Analysis Schema
const AnalysisSchema = new mongoose.Schema({
  sessionId: String,
  imageAnalysis: [
    {
      imagePath: String,
      emotions: {
        angry: Number,
        disgust: Number,
        fear: Number,
        happy: Number,
        sad: Number,
        surprise: Number,
        neutral: Number,
      },
      dominantEmotion: String,
    },
  ],
  overallAnalysis: {
    emotions: {
      angry: Number,
      disgust: Number,
      fear: Number,
      happy: Number,
      sad: Number,
      surprise: Number,
      neutral: Number,
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Analysis = mongoose.model("Analysis", AnalysisSchema);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sessionId = req.query.currentSessionId;
    console.log(sessionId);
    if (!sessionId) {
      return cb(new Error("Session ID is missing."), null);
    }
    const sessionPath =
      file.fieldname === "webcam"
        ? path.join(__dirname, "uploads", "webcam_images", sessionId)
        : path.join(__dirname, "uploads", "screenshots", sessionId);
    fs.mkdirSync(sessionPath, { recursive: true });
    cb(null, sessionPath);
  },
  filename: (req, file, cb) => {
    // Create filename with timestamp for uniqueness
    const now = new Date();
    const dateString = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const timeString = now.toTimeString().split(" ")[0].split(":").join("-"); // HH-MM-SS
    const filename = `${dateString}_${timeString}.png`; // Format: YYYY-MM-DD_HH-MM-SS.png
    cb(null, filename);
  },
});

const upload = multer({ storage });

// Utility Functions
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
          Authorization: `Bearer ${process.env.API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.data.error?.includes("Model is loading")) {
      if (retryCount < maxRetries) {
        const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 10000);
        await delay(backoffTime);
        return analyzeImage(imagePath, retryCount + 1, maxRetries);
      } else {
        throw new Error("Max retries reached while waiting for model to load");
      }
    }

    const emotions = {
      angry: 0,
      disgust: 0,
      fear: 0,
      happy: 0,
      sad: 0,
      surprise: 0,
      neutral: 0,
    };

    let totalScore = 0;
    response.data.forEach((result) => {
      if (result.label.toLowerCase() in emotions) {
        totalScore += result.score;
      }
    });

    response.data.forEach((result) => {
      if (result.label.toLowerCase() in emotions) {
        emotions[result.label.toLowerCase()] = (result.score * 100).toFixed(2); // Convert score to percentage- 100%
      }
    });

    let dominantEmotion = Object.entries(emotions).reduce(
      (max, [emotion, value]) =>
        parseFloat(value) > parseFloat(max[1]) ? [emotion, value] : max,
      ["neutral", "0"]
    )[0];

    return { emotions, dominantEmotion };
  } catch (error) {
    if (retryCount < maxRetries) {
      const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 10000);
      await delay(backoffTime);
      return analyzeImage(imagePath, retryCount + 1, maxRetries);
    }

    console.error(
      "Error analyzing image:",
      path.basename(imagePath),
      error.message
    );
    return {
      emotions: {
        angry: "0.00",
        disgust: "0.00",
        fear: "0.00",
        happy: "0.00",
        sad: "0.00",
        surprise: "0.00",
        neutral: "100.00",
      },
      dominantEmotion: "neutral",
    };
  }
}

// Login route
app.post("/login", async (req, res) => {
  console.log("Login route hit");
  const { name, password } = req.body;
  console.log("Received login request with:", { name, password });

  try {
    const user = await UserProfile.findOne({ name, password });
    console.log("User found:", user);

    if (user) {
      if (user.role === "admin") {
        console.log("Redirecting to Admin Page for user:", name);
        res.json({ message: "Redirect to Admin Page", redirectUrl: "/admin" });
      } else if (user.role === "kid") {
        console.log("Redirecting to Game Page for user:", name);
        res.json({
          message: "Redirect to Game Page",
          redirectUrl: "/start-game",
        });
      }
    } else {
      console.log("Invalid username or password for user:", name);
      res.status(401).json({ message: "Invalid username or password" });
    }
  } catch (error) {
    console.error("Server error during login:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

// Start session route
app.get("/start-session", async (req, res) => {
  const username = req.query.username;

  if (!username) {
    return res.status(400).json({ message: "Username is required" });
  }

  try {
    const userProfile = await UserProfile.findOne({ name: username });

    if (!userProfile) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check for recent active sessions (within last 5 seconds)
    const fiveSecondsAgo = new Date(Date.now() - 5000);
    const recentSessions = userProfile.sessions.filter(
      (session) => session.createdAt > fiveSecondsAgo
    );

    let currentSessionId;
    if (recentSessions.length > 0) {
      // Reuse the most recent active session
      currentSessionId = recentSessions[recentSessions.length - 1].sessionId;
    } else {
      // Generate a new session ID
      currentSessionId = `session_${Date.now()}`;

      // Add new session only if user is a kid
      if (userProfile.role === "kid") {
        await UserProfile.findOneAndUpdate(
          { name: username },
          {
            $push: {
              sessions: {
                sessionId: currentSessionId,
                createdAt: new Date(),
              },
            },
          },
          { new: true, useFindAndModify: false }
        );
      }
    }

    res.json({ sessionId: currentSessionId });
  } catch (error) {
    console.error("Error starting session:", error);
    res
      .status(500)
      .json({ message: "Error starting session", error: error.message });
  }
});

app.post(
  "/upload",
  upload.fields([{ name: "screenshot" }, { name: "webcam" }]),
  (req, res) => {
    const sessionId = req.query.currentSessionId; // Get sessionId from query parameters
    console.log("Upload route called. Session ID:", sessionId);

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is missing." });
    }

    // Update storage destination based on the session ID from request
    const files = req.files;
    if (!files) {
      return res.status(400).json({ error: "No files uploaded." });
    }

    res.json({ message: "Images uploaded successfully!" });
  }
);

app.get("/sessions", async (req, res) => {
  try {
    const analyses = await Analysis.find({}, "sessionId createdAt").sort({
      createdAt: -1,
    });

    const sessionsFromDB = analyses.map((analysis) => analysis.sessionId);

    const sessionsDir = path.join(__dirname, "uploads", "webcam_images");
    const filesystemSessions = await fs.promises.readdir(sessionsDir);

    const allSessions = [
      ...new Set([...sessionsFromDB, ...filesystemSessions]),
    ];

    res.json({ sessions: allSessions });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ error: "Error reading sessions" });
  }
});

app.get("/api/sessions", async (req, res) => {
  try {
    const sessions = await UserProfile.aggregate([
      { $unwind: "$sessions" }, // Flatten the `sessions` array
      {
        $group: {
          _id: "$name", // Group by username (name)
          sessions: {
            $push: {
              sessionId: "$sessions.sessionId",
              createdAt: "$sessions.createdAt",
            },
          },
        },
      },
      { $project: { username: "$_id", _id: 0, sessions: 1 } }, // Restructure the output
    ]);

    res.json(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/analyze/:sessionId", async (req, res) => {
  const { sessionId } = req.params;

  try {
    const existingAnalysis = await Analysis.findOne({ sessionId });

    if (existingAnalysis) {
      console.log(`Found existing analysis for session ${sessionId}`);
      return res.json({
        imageAnalyses: existingAnalysis.imageAnalysis,
        overallAnalysis: existingAnalysis.overallAnalysis,
      });
    }

    const sessionDir = path.join(
      __dirname,
      "uploads",
      "webcam_images",
      sessionId
    );
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

    const totalEmotions = {
      angry: 0,
      disgust: 0,
      fear: 0,
      happy: 0,
      sad: 0,
      surprise: 0,
      neutral: 0,
    };

    imageAnalyses.forEach(({ emotions }) => {
      for (const emotion in emotions) {
        totalEmotions[emotion] += parseFloat(emotions[emotion]);
      }
    });

    const overallAnalysis = {
      emotions: {},
    };

    for (const emotion in totalEmotions) {
      overallAnalysis.emotions[emotion] = (
        totalEmotions[emotion] / imageAnalyses.length
      ).toFixed(2);
    }

    const analysisDoc = new Analysis({
      sessionId,
      imageAnalysis: imageAnalyses,
      overallAnalysis,
    });
    await analysisDoc.save();
    console.log(`Saved new analysis for session ${sessionId}`);

    res.json({ imageAnalyses, overallAnalysis });
  } catch (error) {
    console.error("Error during analysis:", error);
    res.status(500).json({ error: "Error analyzing images" });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on ${process.env.BASE_URL}`);
});