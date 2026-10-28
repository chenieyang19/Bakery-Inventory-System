
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const Inventory = require("../models/Inventory");

// GET /api/products - Get all products or search products
router.get("/", async (req, res) => {
    try {
        const { search, category } = req.query;
        const filter = {};

        if (search && search.trim()) {
            const safeSearch = search.trim().replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
            );

            filter.name = {
                $regex: safeSearch,
                $options: "i",
            };
        }

        if (category && category.trim()) {
            filter.category = category.trim();
        }

        const products = await Inventory.find(filter).sort({
            createdAt: -1,
        });

        res.json(products);
    } catch (error) {
        console.error("Get products error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to retrieve products.",
        });
    }
});

// GET /api/products/:id - Get one product
router.get("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid product ID.",
            });
        }

        const product = await Inventory.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                error: "Product not found.",
            });
        }

        res.json(product);
    } catch (error) {
        console.error("Get product error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to retrieve product.",
        });
    }
});

// POST /api/products - Add a product
router.post("/", async (req, res) => {
    try {
        const { name, category, quantity, price, expirationDate } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                error: "Product name is required.",
            });
        }

        const product = await Inventory.create({
            name: name.trim(),
            category,
            quantity,
            price,
            expirationDate: expirationDate || null,
        });

        res.status(201).json({
            success: true,
            message: "Product added successfully.",
            product,
        });
    } catch (error) {
        console.error("Add product error:", error.message);
        res.status(400).json({
            success: false,
            error: error.message || "Failed to add product.",
        });
    }
});

// PUT /api/products/:id - Update a product
router.put("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid product ID.",
            });
        }

        const allowedFields = [
            "name",
            "category",
            "quantity",
            "price",
            "expirationDate",
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (
            updates.name !== undefined &&
            (typeof updates.name !== "string" || !updates.name.trim())
        ) {
            return res.status(400).json({
                success: false,
                error: "Product name cannot be empty.",
            });
        }

        if (typeof updates.name === "string") {
            updates.name = updates.name.trim();
        }

        const product = await Inventory.findByIdAndUpdate(
            req.params.id,
            updates,
            {
                returnDocument: "after",
                runValidators: true,
            }
        );

        if (!product) {
            return res.status(404).json({
                success: false,
                error: "Product not found.",
            });
        }

        res.json({
            success: true,
            message: "Product updated successfully.",
            product,
        });
    } catch (error) {
        console.error("Update product error:", error.message);
        res.status(400).json({
            success: false,
            error: error.message || "Failed to update product.",
        });
    }
});

// DELETE /api/products/:id - Delete a product
router.delete("/:id", async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                error: "Invalid product ID.",
            });
        }

        const product = await Inventory.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({
                success: false,
                error: "Product not found.",
            });
        }

        res.json({
            success: true,
            message: "Product deleted successfully.",
        });
    } catch (error) {
        console.error("Delete product error:", error.message);
        res.status(500).json({
            success: false,
            error: "Failed to delete product.",
        });
    }
});

module.exports = router;
