import mongoose from "mongoose";

const UserSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
  },

  displayName: {
    type: String,
    required: true,
  },

  avatar: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
  },

  bio: {
    type: String,
    default: "",
  },

  location: {
    type: String,
    default: "",
  },

  website: {
    type: String,
    default: "",
  },

  joinedDate: {
    type: Date,
    default: Date.now,
  },

  password: {
    type: String,
    default: "",
  },

  phone: {
    type: String,
    default: "",
  },

  lastPasswordReset: {
    type: Date,
    default: null,
  },

  loginOTP: {
    type: String,
    default: "",
  },

  otpExpiry: {
    type: Date,
    default: null,
  },

  languageOTP: {
    type: String,
    default: "",
  },

  languageOTPExpiry: {
    type: Date,
    default: null,
  },

  audioOTP: {
    type: String,
    default: "",
  },

  audioOTPExpiry: {
    type: Date,
    default: null,
  },

  audio: {
    type: String,
    default: null,
  },
  // ==========================================
  // SUBSCRIPTION
  // ==========================================

  subscriptionPlan: {
    type: String,
    enum: ["Free", "Bronze", "Silver", "Gold"],
    default: "Free",
  },

  subscriptionStart: {
    type: Date,
    default: null,
  },

  subscriptionEnd: {
    type: Date,
    default: null,
  },

  tweetsUsed: {
    type: Number,
    default: 0,
  },
});

export default mongoose.model("User", UserSchema);