const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    googleId: {
      type: String,
      unique: true,
    },
    displayName: {
      type: String,
    },
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    image: {
      type: String,
    },
    password: {
      type: String,
      select: false,
    },
    isSubscribed: { 
      type: Boolean, 
      default: false 
    },
    chatStartTime: { type: Date },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
