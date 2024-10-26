// server/models/Session.js
const mongoose = require('mongoose');

const AnalysisSchema = new mongoose.Schema({
  image: String,
  expression: String,
});

const SessionSchema = new mongoose.Schema({
  sessionId: String,
  analyses: [AnalysisSchema],
  overallAnalysis: {
    happy: { type: Number, default: 0 },
    sad: { type: Number, default: 0 },
    neutral: { type: Number, default: 0 },
    // Add other expressions as needed
  },
});

const Session = mongoose.model('Session', SessionSchema);

module.exports = Session;
