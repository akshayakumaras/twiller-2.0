import mongoose from "mongoose";

const SubscriptionSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    plan: {
      type: String,
      enum: ["Bronze", "Silver", "Gold"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    tweetLimit: {
      type: Number,
      required: true,
    },

    tweetsUsed: {
      type: Number,
      default: 0,
    },

    razorpayOrderId: {
      type: String,
      required: true,
    },

    razorpayPaymentId: {
      type: String,
      default: null,
    },

    razorpaySignature: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "active", "failed", "cancelled"],
      default: "pending",
    },

    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Subscription", SubscriptionSchema);