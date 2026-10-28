

require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const productRoutes = require("./routes/productRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

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

// Connect to MongoDB, then start server
async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from your .env file.");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully!");

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Backend startup failed:", error.message);
    process.exit(1);
  }
}

startServer();
