
const express = require("express");
const router = express.Router();
const Inventory = require("../models/Inventory");

// Dashboard thresholds
const LOW_STOCK_LIMIT = 10;
const EXPIRING_WITHIN_DAYS = 7;

// GET /api/ai/summary
// Returns dashboard summary counts
router.get("/summary", async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expirationLimit = new Date(today);
        expirationLimit.setDate(
            expirationLimit.getDate() + EXPIRING_WITHIN_DAYS
        );
        expirationLimit.setHours(23, 59, 59, 999);

        const [totalProducts, lowStockCount, expiringCount] =
            await Promise.all([
                Inventory.countDocuments({}),
                Inventory.countDocuments({
                    quantity: { $lte: LOW_STOCK_LIMIT },
                }),
                Inventory.countDocuments({
                    expirationDate: {
                        $gte: today,
                        $lte: expirationLimit,
                    },
                }),
            ]);

        return res.json({
            success: true,
            totalItems: totalProducts,
            totalProducts,
            lowStockCount,
            expiringCount,
        });
    } catch (error) {
        console.error("Dashboard summary error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve inventory summary.",
        });
    }
});

// GET /api/ai/low-stock
// Returns products with 10 or fewer items
router.get("/low-stock", async (req, res) => {
    try {
        const items = await Inventory.find({
            quantity: { $lte: LOW_STOCK_LIMIT },
        })
            .sort({ quantity: 1 })
            .lean();

        return res.json(items);
    } catch (error) {
        console.error("Low-stock error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve low-stock items.",
        });
    }
});

// GET /api/ai/expiration-alerts
// Returns products expiring today through the next 7 days
router.get("/expiration-alerts", async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expirationLimit = new Date(today);
        expirationLimit.setDate(
            expirationLimit.getDate() + EXPIRING_WITHIN_DAYS
        );
        expirationLimit.setHours(23, 59, 59, 999);

        const items = await Inventory.find({
            expirationDate: {
                $gte: today,
                $lte: expirationLimit,
            },
        })
            .sort({ expirationDate: 1 })
            .lean();

        return res.json(items);
    } catch (error) {
        console.error("Expiration alerts error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve expiration alerts.",
        });
    }
});

// POST /api/ai/chat
// Gemini AI assistant — existing chat functionality preserved
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

        const inventory = await Inventory.find({})
            .select("name category quantity price expirationDate")
            .lean();

        const inventoryText = JSON.stringify(inventory, null, 2);

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
            model: "gemini-3.5-flash-lite",
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
