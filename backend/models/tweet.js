import mongoose from "mongoose";

const TweetSchema = mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  content: {
    type: String,
    default: "",
  },

  likes: {
    type: Number,
    default: 0,
  },

  retweets: {
    type: Number,
    default: 0,
  },

  comments: {
    type: Number,
    default: 0,
  },

  likedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],

  retweetedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],

  image: {
    type: String,
    default: null,
  },

  // Audio Tweet
  audio: {
    type: String,
    default: null,
  },

  audioDuration: {
    type: Number,
    default: 0,
  },

  timestamp: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Tweet", TweetSchema);