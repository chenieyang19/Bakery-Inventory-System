
const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required."],
      trim: true,
    },

    category: {
      type: String,
      default: "Other",
      trim: true,
    },

    quantity: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    price: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    expirationDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports =
  mongoose.models.Inventory ||
  mongoose.model("Inventory", inventorySchema);
