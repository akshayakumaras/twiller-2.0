import mongoose from "mongoose";

const LoginHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  browser: {
    type: String,
    required: true,
  },
  operatingSystem: {
    type: String,
    required: true,
  },
  deviceType: {
    type: String,
    required: true,
  },
  ipAddress: {
    type: String,
    required: true,
  },
  loginTime: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("LoginHistory", LoginHistorySchema);