
const express = require("express");
const router = express.Router();
const Inventory = require("../models/Inventory");

router.post("/chat", async (req, res) => {
    try {
        const message = req.body?.message?.trim();

        if (!message) {
            return res.status(400).json({
                success: false,
                error: "Please enter a message.",
            });
        }

        if (!process.env.GEMINI_API_KEY) {
            throw new Error("GEMINI_API_KEY is missing from backend/.env");
        }

        // Get current bakery inventory from MongoDB
        const inventory = await Inventory.find({})
            .select("name category quantity price expirationDate")
            .lean();

        const inventoryText = JSON.stringify(inventory, null, 2);

        // Load Gemini
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY,
        });

        const prompt = `
You are a helpful AI assistant for a bakery inventory monitoring system.

Answer the user's question clearly and politely.
You can answer general questions and questions about bakery inventory.

Use the inventory data below for inventory-related answers.
Do not invent stock quantities, prices, or expiration dates.
If information is missing, say it is unavailable.
If the user asks to summarize inventory, summarize the available items,
quantities, categories, and important expiration information.

CURRENT BAKERY INVENTORY:
${inventoryText}

USER QUESTION:
${message}
`;

        const response = await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: prompt,
        });

        const reply = response.text;

        if (!reply || !reply.trim()) {
            console.error("Gemini returned an empty response:", response);

            return res.status(502).json({
                success: false,
                error: "Gemini returned an empty response. Please try again.",
            });
        }

        return res.json({
            success: true,
            reply: reply.trim(),
        });
    } catch (error) {
        console.error("AI chat error:", error);

        return res.status(500).json({
            success: false,
            error: error.message || "Unknown AI error",
        });
    }
});

module.exports = router;
