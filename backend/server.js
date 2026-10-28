
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const productRoutes = require("./routes/productRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const HOST = "127.0.0.1";

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

async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from .env");
    }

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing from .env");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully!");

    const server = app.listen(PORT, HOST, () => {
      console.log(`Backend running at http://${HOST}:${PORT}`);
      console.log(`AI endpoint: http://${HOST}:${PORT}/api/ai/chat`);
    });

    server.on("error", (error) => {
      console.error("HTTP server error:", error);
    });
  } catch (error) {
    console.error("Backend startup failed:", error);
    process.exitCode = 1;
  }
}

startServer();
