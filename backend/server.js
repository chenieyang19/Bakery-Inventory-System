require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const productRoutes = require("./routes/productRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();

// Render provides PORT automatically.
// Locally, the backend will use port 5000.
const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Bakery Inventory API is running!",
  });
});

// API routes
app.use("/api/products", productRoutes);
app.use("/api/ai", aiRoutes);

// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Route not found.",
  });
});

// Start the backend
async function startServer() {
  try {
    // Check required environment variables
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing.");
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing.");
    }

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB connected successfully!");

    // Start Express server
    const server = app.listen(PORT, HOST, () => {
      console.log(`Backend running on port ${PORT}`);
      console.log("Products API: /api/products");
      console.log("AI endpoint: /api/ai/chat");
    });

    server.on("error", (error) => {
      console.error("HTTP server error:", error);
      process.exit(1);
    });
  } catch (error) {
    console.error("Backend startup failed:", error.message);
    process.exit(1);
  }
}

startServer();