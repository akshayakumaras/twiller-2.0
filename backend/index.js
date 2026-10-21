import "dotenv/config";
import fs from "fs";

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import User from "./models/user.js";
import Tweet from "./models/tweet.js";
import { initializeApp, cert } from "firebase-admin/app";
import { createRequire } from "module";
import { getAuth } from "firebase-admin/auth";
import LoginHistory from "./models/loginHistory.js";
import { sendOTP } from "./utils/sendOTP.js";
import { sendSubscriptionInvoice } from "./utils/sendSubscriptionInvoice.js";
import multer from "multer";
import path from "path";
import Subscription from "./models/subscription.js";
import Razorpay from "razorpay";
import crypto from "crypto";


// ==========================================
// FIREBASE
// ==========================================


const require = createRequire(import.meta.url);

const serviceAccountPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  "./firebase-service-account.json";

const serviceAccount = require(serviceAccountPath);

initializeApp({
  credential: cert(serviceAccount),
});



// ==========================================
// EXPRESS APP
// ==========================================

const app = express();


// IMPORTANT:
// Middleware must come BEFORE your API routes.

app.use(cors());

app.use(express.json());


// ==========================================
// RAZORPAY
// ==========================================

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});


// ==========================================
// SUBSCRIPTION PLANS
// ==========================================

const SUBSCRIPTION_PLANS = {
  Free: {
    amount: 0,
    tweetLimit: 1,
  },

  Bronze: {
    amount: 100,
    tweetLimit: 3,
  },

  Silver: {
    amount: 300,
    tweetLimit: 5,
  },

  Gold: {
    amount: 1000,
    tweetLimit: -1,
  },
};


// ==========================================
// PAYMENT TIME
// TEMPORARILY ENABLED FOR TESTING
// ==========================================

const isPaymentTimeAllowed = () => {
  return true;
};


// ==========================================
// CREATE RAZORPAY ORDER
// ==========================================

app.post("/create-subscription", async (req, res) => {
  try {
    console.log(
      "Create subscription request:",
      req.body
    );

    const { userId, plan } = req.body;

    if (!userId || !plan) {
      return res.status(400).send({
        message: "User ID and plan are required.",
      });
    }

    if (!SUBSCRIPTION_PLANS[plan]) {
      return res.status(400).send({
        message: "Invalid subscription plan.",
      });
    }

    if (plan === "Free") {
      return res.status(200).send({
        message: "Free plan does not require payment.",
      });
    }

    if (!isPaymentTimeAllowed()) {
      return res.status(403).send({
        message:
          "Payments are allowed only between 10:00 AM and 11:00 AM IST.",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send({
        message: "User not found.",
      });
    }

    const planDetails =
      SUBSCRIPTION_PLANS[plan];


    // ==========================================
    // CREATE RAZORPAY ORDER
    // ==========================================

    const order = await razorpay.orders.create({
      amount: planDetails.amount * 100,

      currency: "INR",

      receipt:
        `twiller_${userId}_${Date.now()}`,

      notes: {
        userId: userId.toString(),
        plan: plan,
      },
    });


    console.log(
      "Razorpay order created:",
      order.id
    );


    // ==========================================
    // SAVE PENDING SUBSCRIPTION
    // ==========================================

    await Subscription.create({
      userId,

      plan,

      amount: planDetails.amount,

      tweetLimit:
        planDetails.tweetLimit,

      tweetsUsed: 0,

      razorpayOrderId:
        order.id,

      status: "pending",
    });


    return res.status(200).send({
      message: "Razorpay order created.",

      order,

      key:
        process.env.RAZORPAY_KEY_ID,
    });

  } catch (error) {

    console.error(
      "Create subscription error:",
      error
    );

    return res.status(500).send({
      message:
        error.message ||
        "Unable to create subscription.",
    });
  }
});


// ==========================================
// VERIFY RAZORPAY PAYMENT
// ==========================================

app.post("/verify-subscription", async (req, res) => {
  try {

    console.log(
      "Verify subscription request:",
      req.body
    );

    const {
      userId,
      plan,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = req.body;


    if (
      !userId ||
      !plan ||
      !razorpay_payment_id ||
      !razorpay_order_id ||
      !razorpay_signature
    ) {

      return res.status(400).send({
        message:
          "Payment verification details are incomplete.",
      });
    }


    // ==========================================
    // FIND PENDING SUBSCRIPTION
    // ==========================================

    const subscription =
      await Subscription.findOne({
        userId,

        razorpayOrderId:
          razorpay_order_id,

        status: "pending",
      });


    if (!subscription) {

      return res.status(404).send({
        message:
          "Subscription order not found.",
      });
    }


    // ==========================================
    // GENERATE SIGNATURE
    // ==========================================

    const generatedSignature =
      crypto
        .createHmac(
          "sha256",
          process.env.RAZORPAY_KEY_SECRET
        )
        .update(
          razorpay_order_id +
          "|" +
          razorpay_payment_id
        )
        .digest("hex");


    // ==========================================
    // VERIFY SIGNATURE
    // ==========================================

    if (
      generatedSignature !==
      razorpay_signature
    ) {

      return res.status(400).send({
        message:
          "Invalid Razorpay payment signature.",
      });
    }


    // ==========================================
    // FIND USER
    // ==========================================

    const user =
      await User.findById(userId);


    if (!user) {

      return res.status(404).send({
        message: "User not found.",
      });
    }


    // ==========================================
    // SUBSCRIPTION DATES
    // ==========================================

    const startDate =
      new Date();

    const endDate =
      new Date();

    endDate.setDate(
      endDate.getDate() + 30
    );


    const planDetails =
      SUBSCRIPTION_PLANS[plan];


    // ==========================================
    // UPDATE SUBSCRIPTION
    // ==========================================

    subscription.status =
      "active";

    subscription.startDate =
      startDate;

    subscription.endDate =
      endDate;

    subscription.razorpayPaymentId =
      razorpay_payment_id;

    subscription.razorpaySignature =
      razorpay_signature;

    subscription.tweetsUsed = 0;


    await subscription.save();


    // ==========================================
    // UPDATE USER
    // ==========================================

    user.subscriptionPlan =
      plan;

    user.subscriptionStart =
      startDate;

    user.subscriptionEnd =
      endDate;

    user.tweetsUsed = 0;


    await user.save();


    // ==========================================
    // SEND INVOICE EMAIL
    // ==========================================

    try {

      await sendSubscriptionInvoice({
        email: user.email,

        name: user.displayName,

        plan,

        amount:
          planDetails.amount,

        paymentId:
          razorpay_payment_id,

        orderId:
          razorpay_order_id,

        startDate,

        endDate,
      });

      console.log(
        "Subscription invoice sent."
      );

    } catch (emailError) {

      console.error(
        "Invoice email error:",
        emailError
      );

      // Payment remains successful
      // even if email fails.
    }


    // ==========================================
    // RESPONSE
    // ==========================================

    return res.status(200).send({

      success: true,

      message:
        "Subscription activated successfully.",

      plan,

      endDate,
    });

  } catch (error) {

    console.error(
      "Verify subscription error:",
      error
    );

    return res.status(500).send({

      success: false,

      message:
        error.message ||
        "Payment verification failed.",
    });
  }
});


// ==========================================
// GET CURRENT SUBSCRIPTION
// ==========================================

app.get(
  "/subscription/:userId",
  async (req, res) => {

    try {

      const user =
        await User.findById(
          req.params.userId
        );


      if (!user) {

        return res.status(404).send({
          message:
            "User not found.",
        });
      }


      const plan =
        SUBSCRIPTION_PLANS[
          user.subscriptionPlan ||
          "Free"
        ];


      return res.status(200).send({

        plan:
          user.subscriptionPlan ||
          "Free",

        tweetsUsed:
          user.tweetsUsed || 0,

        tweetLimit:
          plan?.tweetLimit ?? 1,

        subscriptionStart:
          user.subscriptionStart,

        subscriptionEnd:
          user.subscriptionEnd,
      });

    } catch (error) {

      return res.status(500).send({
        message:
          error.message,
      });
    }
  }
);


// Audio uploads are allowed from 2:00 PM until 7:00 PM IST (7 PM exclusive).
const isWithinAudioUploadWindow = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  const minutes = hour * 60 + minute;
  return minutes >= 14 * 60 && minutes < 19 * 60;
};

// ==========================================
// MULTER AUDIO UPLOAD
// ==========================================

const storage =
  multer.diskStorage({

    destination: (
      req,
      file,
      cb
    ) => {

      cb(
        null,
        "uploads/audio/"
      );
    },


    filename: (
      req,
      file,
      cb
    ) => {

      const extension =
        path.extname(
          file.originalname
        );


      const uniqueName =
        Date.now() +
        "-" +
        Math.round(
          Math.random() * 1e9
        ) +
        extension;


      cb(
        null,
        uniqueName
      );
    },
  });


const upload =
  multer({

    storage,

    limits: {
      fileSize:
        100 * 1024 * 1024,
    },


    fileFilter: (
      req,
      file,
      cb
    ) => {

      if (
        file.mimetype.startsWith(
          "audio/"
        )
      ) {

        cb(null, true);

      } else {

        cb(
          new Error(
            "Only audio files are allowed"
          )
        );
      }
    },
  });


app.use(
  "/uploads",
  express.static("uploads")
);


// ==========================================
// HOME
// ==========================================

app.get("/", (req, res) => {

  res.send(
    "Twiller backend is running successfully"
  );

});


// ==========================================
// AUDIO UPLOAD
// ==========================================


app.post(
  "/upload-audio",
  (req, res, next) => {
    upload.single("audio")(req, res, (err) => {
      if (err) {
        console.error("Audio upload parsing error:", err);

        return res.status(400).json({
          message: err.message || "Unable to process audio upload.",
        });
      }

      next();
    });
  },
  async (req, res) => {
    try {
      // Read the registered email from multipart form data.
      const email =
        typeof req.body?.email === "string"
          ? req.body.email.trim().toLowerCase()
          : "";

      console.log("Audio upload received:", {
        emailReceived: Boolean(email),
        fileReceived: Boolean(req.file),
        fileSize: req.file?.size,
      });

      if (!email) {
        if (req.file) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (cleanupError) {
            console.error("Audio cleanup error:", cleanupError);
          }
        }

        return res.status(400).json({
          message:
            "Registered email is required for audio verification.",
        });
      }

      const user = await User.findOne({ email });

      if (!user) {
        if (req.file) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (cleanupError) {
            console.error("Audio cleanup error:", cleanupError);
          }
        }

        return res.status(404).json({
          message: "User not found.",
        });
      }

      // Require successful OTP verification within the last five minutes.
      if (
        !user.audioOTPVerifiedUntil ||
        new Date(user.audioOTPVerifiedUntil).getTime() <= Date.now()
      ) {
        if (req.file) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (cleanupError) {
            console.error("Audio cleanup error:", cleanupError);
          }
        }

        return res.status(403).json({
          message: "Verify the audio OTP before uploading.",
        });
      }

      // Enforce the 2 PM to 7 PM India Standard Time window.
      if (!isWithinAudioUploadWindow()) {
        if (req.file) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (cleanupError) {
            console.error("Audio cleanup error:", cleanupError);
          }
        }

        return res.status(403).json({
          message:
            "Audio tweets are allowed only between 2:00 PM and 7:00 PM IST.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "Audio file is required.",
        });
      }

      // Consume the OTP authorization after validating the upload.
      user.audioOTPVerifiedUntil = null;
      await user.save();

      const audioUrl =
        `${req.protocol}://${req.get("host")}` +
        `/uploads/audio/${req.file.filename}`;

      return res.status(200).json({
        message: "Audio uploaded successfully.",
        audioUrl,
      });
    } catch (error) {
      console.error("Audio upload error:", error);

      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          console.error("Audio cleanup error:", cleanupError);
        }
      }

      return res.status(500).json({
        message: "Unable to upload audio.",
      });
    }
  }
);


// ==========================================
// FORGOT PASSWORD
// ==========================================

app.post(
  "/forgot-password",
  async (req, res) => {

    try {

      const {
        identifier
      } = req.body;


      if (!identifier) {

        return res.status(400).send({
          message:
            "Email or phone number is required.",
        });
      }


      const user =
        await User.findOne({

          $or: [
            {
              email:
                identifier
            },

            {
              phone:
                identifier
            },
          ],
        });


      if (!user) {

        return res.status(404).send({
          message:
            "User not found.",
        });
      }


      // ==========================================
      // ONLY ONE RESET PER DAY
      // ==========================================

      if (
        user.lastPasswordReset
      ) {

        const today =
          new Date();

        const last =
          new Date(
            user.lastPasswordReset
          );


        if (
          today.getDate() ===
            last.getDate() &&

          today.getMonth() ===
            last.getMonth() &&

          today.getFullYear() ===
            last.getFullYear()
        ) {

          return res.status(400).send({
            message:
              "You can use this option only one time per day.",
          });
        }
      }


      // ==========================================
      // GENERATE PASSWORD
      // ==========================================

      const letters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";


      let password = "";


      for (
        let i = 0;
        i < 10;
        i++
      ) {

        password +=
          letters.charAt(
            Math.floor(
              Math.random() *
              letters.length
            )
          );
      }


      console.log(
        "Finding Firebase user..."
      );


      const firebaseUser =
        await getAuth()
          .getUserByEmail(
            user.email
          );


      console.log(
        "Firebase UID:",
        firebaseUser.uid
      );


      await getAuth()
        .updateUser(
          firebaseUser.uid,
          {
            password,
          }
        );


      console.log(
        "Firebase password updated successfully."
      );


      user.password =
        password;

      user.lastPasswordReset =
        new Date();


      await user.save();


      return res.status(200).send({

        message:
          "Password reset successful.",

        password,
      });

    } catch (error) {

      return res.status(500).send({
        message:
          error.message,
      });
    }
  }
);


// ==========================================
// REGISTER
// ==========================================

app.post(
  "/register",
  async (req, res) => {

    try {

      const existinguser =
        await User.findOne({
          email:
            req.body.email,
        });


      if (existinguser) {

        return res
          .status(200)
          .send(existinguser);
      }


      const newUser =
        new User(
          req.body
        );


      await newUser.save();


      return res
        .status(201)
        .send(newUser);

    } catch (error) {

      return res.status(400).send({
        error:
          error.message,
      });
    }
  }
);


// ==========================================
// LOGGED IN USER
// ==========================================

app.get(
  "/loggedinuser",
  async (req, res) => {

    try {

      const {
        email
      } = req.query;


      if (!email) {

        return res.status(400).send({
          error:
            "Email required",
        });
      }


      const user =
        await User.findOne({
          email,
        });


      return res
        .status(200)
        .send(user);

    } catch (error) {

      return res.status(400).send({
        error:
          error.message,
      });
    }
  }
);


// ==========================================
// LOGIN HISTORY
// ==========================================

app.get(
  "/login-history/:userId",
  async (req, res) => {

    try {

      const history =
        await LoginHistory.find({
          userId:
            req.params.userId,
        }).sort({
          loginTime: -1,
        });


      return res
        .status(200)
        .send(history);

    } catch (error) {

      return res.status(500).send({
        message:
          error.message,
      });
    }
  }
);


// ==========================================
// CREATE LOGIN HISTORY
// ==========================================

app.post(
  "/login-history",
  async (req, res) => {

    try {

      const {
        userId,
        browser,
        operatingSystem,
        deviceType,
        ipAddress,
      } = req.body;


      const device =
        (deviceType || "")
          .toLowerCase();


      console.log(
        "Device Type:",
        deviceType
      );


      console.log(
        "Current Hour:",
        new Date().getHours()
      );


      // Mobile login restriction
      // 10 AM - 1 PM

      if (
        device === "mobile"
      ) {

        const currentHour =
          new Date().getHours();


        if (
          currentHour < 10 ||
          currentHour >= 13
        ) {

          return res
            .status(403)
            .send({

              message:
                "Mobile login is allowed only between 10:00 AM and 1:00 PM.",
            });
        }
      }


      const login =
        new LoginHistory({

          userId,

          browser,

          operatingSystem,

          deviceType,

          ipAddress,
        });


      await login.save();


      return res
        .status(201)
        .send(login);

    } catch (error) {

      return res.status(500).send({
        message:
          error.message,
      });
    }
  }
);


// ==========================================
// UPDATE PROFILE
// ==========================================

app.patch(
  "/userupdate/:email",
  async (req, res) => {

    try {

      const {
        email
      } = req.params;


      const updated =
        await User.findOneAndUpdate(

          { email },

          {
            $set:
              req.body,
          },

          {
            new: true,
            upsert: false,
          }
        );


      return res
        .status(200)
        .send(updated);

    } catch (error) {

      return res.status(400).send({
        error:
          error.message,
      });
    }
  }
);


// ==========================================
// CREATE TWEET WITH SUBSCRIPTION LIMIT
// ==========================================

app.post(
  "/post",
  async (req, res) => {

    try {

      const {
        author,
        content,
        image,
        audio,
      } = req.body;


      if (!author) {

        return res.status(400).send({
          message:
            "Author is required.",
        });
      }


      const user =
        await User.findById(
          author
        );


      if (!user) {

        return res.status(404).send({
          message:
            "User not found.",
        });
      }


      const plan =
        user.subscriptionPlan ||
        "Free";


      const planDetails =
        SUBSCRIPTION_PLANS[
          plan
        ];


      const tweetLimit =
        planDetails?.tweetLimit ??
        1;


      // ==========================================
      // CHECK TWEET LIMIT
      // ==========================================

      if (
        tweetLimit !== -1 &&
        (user.tweetsUsed || 0) >=
          tweetLimit
      ) {

        return res.status(403).send({

          message:
            `You have reached your ${plan} plan tweet limit of ${tweetLimit}. Please upgrade your subscription.`,
        });
      }


      // ==========================================
      // CREATE TWEET
      // ==========================================

      const tweet =
        new Tweet({

          author,

          content,

          image,

          audio,
        });


      await tweet.save();


      // ==========================================
      // INCREASE TWEET COUNT
      // ==========================================

      user.tweetsUsed =
        (user.tweetsUsed || 0) +
        1;


      await user.save();


      return res
        .status(201)
        .send({

          ...tweet.toObject(),

          subscription: {

            plan,

            tweetsUsed:
              user.tweetsUsed,

            tweetLimit,
          },
        });

    } catch (error) {

      console.error(
        "Create tweet error:",
        error
      );


      return res.status(400).send({
        error:
          error.message,
      });
    }
  }
);


// ==========================================
// GET ALL TWEETS
// ==========================================

app.get(
  "/post",
  async (req, res) => {

    try {

      const tweet =
        await Tweet.find()
          .sort({
            timestamp: -1,
          })
          .populate("author");


      return res
        .status(200)
        .send(tweet);

    } catch (error) {

      return res.status(400).send({
        error:
          error.message,
      });
    }
  }
);


// ==========================================
// LIKE TWEET
// ==========================================

app.post(
  "/like/:tweetid",
  async (req, res) => {

    try {

      const {
        userId
      } = req.body;


      const tweet =
        await Tweet.findById(
          req.params.tweetid
        );


      if (
        !tweet.likedBy.includes(
          userId
        )
      ) {

        tweet.likes += 1;

        tweet.likedBy.push(
          userId
        );

        await tweet.save();
      }


      res.send(tweet);

    } catch (error) {

      return res.status(400).send({
        error:
          error.message,
      });
    }
  }
);


// ==========================================
// RETWEET
// ==========================================

app.post(
  "/retweet/:tweetid",
  async (req, res) => {

    try {

      const {
        userId
      } = req.body;


      const tweet =
        await Tweet.findById(
          req.params.tweetid
        );


      if (
        !tweet.retweetedBy.includes(
          userId
        )
      ) {

        tweet.retweets += 1;

        tweet.retweetedBy.push(
          userId
        );

        await tweet.save();
      }


      res.send(tweet);

    } catch (error) {

      return res.status(400).send({
        error:
          error.message,
      });
    }
  }
);


// ==========================================
// SEND LOGIN OTP
// ==========================================

app.post(
  "/send-otp",
  async (req, res) => {

    try {

      const {
        email
      } = req.body;

      console.log("OTP recipient:", email);

      const user =
        await User.findOne({
          email,
        });


      if (!user) {

        return res.status(404).send({
          message:
            "User not found",
        });
      }


      const otp =
        Math.floor(
          100000 +
          Math.random() *
          900000
        ).toString();


      user.loginOTP =
        otp;


      user.otpExpiry =
        new Date(
          Date.now() +
          5 * 60 * 1000
        );


      await user.save();


      await sendOTP(
        email,
        otp
      );


      return res
        .status(200)
        .send({

          message:
            "OTP sent successfully",
        });

    } catch (error) {

      return res.status(500).send({
        message:
          error.message,
      });
    }
  }
);


app.post("/verify-otp", async (req, res) => {
  try {
    const email =
      typeof req.body.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    const otp =
      typeof req.body.otp === "string"
        ? req.body.otp.trim()
        : String(req.body.otp ?? "").trim();

    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        message: "Please provide a valid email and 6-digit OTP.",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const storedOTP = String(user.loginOTP ?? "").trim();
    const expiry = user.otpExpiry
      ? new Date(user.otpExpiry)
      : null;

    if (
      storedOTP !== otp ||
      !expiry ||
      Number.isNaN(expiry.getTime()) ||
      expiry.getTime() <= Date.now()
    ) {
      return res.status(400).json({
        message: "Invalid or expired OTP. Request a new OTP and try again.",
      });
    }

    // Clear the OTP so it cannot be reused.
    user.loginOTP = "";
    user.otpExpiry = null;
    await user.save();

    return res.status(200).json({
      message: "OTP verified successfully.",
    });
  } catch (error) {
    console.error("OTP verification error:", error);

    return res.status(500).json({
      message: "Server error while verifying OTP.",
    });
  }
});


app.post(
  "/send-language-otp",
  async (req, res) => {

    try {

      const {
        email
      } = req.body;


      if (!email) {

        return res.status(400).send({
          message:
            "Email is required",
        });
      }


      const user =
        await User.findOne({
          email,
        });


      if (!user) {

        return res.status(404).send({
          message:
            "User not found",
        });
      }


      const otp =
        Math.floor(
          100000 +
          Math.random() *
          900000
        ).toString();


      user.languageOTP =
        otp;


      user.languageOTPExpiry =
        new Date(
          Date.now() +
          5 * 60 * 1000
        );


      await user.save();


      await sendOTP(
        email,
        otp
      );


      return res
        .status(200)
        .send({

          message:
            "Language change OTP sent successfully",
        });

    } catch (error) {

      console.error(
        "Language OTP error:",
        error
      );


      return res.status(500).send({
        message:
          error.message,
      });
    }
  }
);


// ==========================================
// LANGUAGE CHANGE - VERIFY OTP
// ==========================================

app.post(
  "/verify-language-otp",
  async (req, res) => {

    try {

      const {
        email,
        otp
      } = req.body;


      if (!email || !otp) {

        return res.status(400).send({
          message:
            "Email and OTP are required",
        });
      }


      const user =
        await User.findOne({
          email,
        });


      if (!user) {

        return res.status(404).send({
          message:
            "User not found",
        });
      }


      if (
        user.languageOTP !== otp ||
        !user.languageOTPExpiry ||
        user.languageOTPExpiry <
          new Date()
      ) {

        return res.status(400).send({
          message:
            "Invalid or expired OTP",
        });
      }


      user.languageOTP = "";

      user.languageOTPExpiry =
        null;


      await user.save();


      return res
        .status(200)
        .send({

          message:
            "Language OTP verified successfully",
        });

    } catch (error) {

      console.error(
        "Verify language OTP error:",
        error
      );


      return res.status(500).send({
        message:
          error.message,
      });
    }
  }
);


// ==========================================
// AUDIO TWEET - SEND OTP
// ==========================================

app.post(
  "/send-audio-otp",
  async (req, res) => {

    try {

      const {
        email
      } = req.body;


      if (!email) {

        return res.status(400).send({
          message:
            "Email is required",
        });
      }


      const normalizedEmail = email.trim().toLowerCase();

      if (!isWithinAudioUploadWindow()) {
        return res.status(403).send({
          message: "Audio OTPs are available only between 2:00 PM and 7:00 PM IST.",
        });
      }

      const user =
        await User.findOne({
          email: normalizedEmail,
        });


      if (!user) {

        return res.status(404).send({
          message:
            "User not found",
        });
      }


      const otp =
        Math.floor(
          100000 +
          Math.random() *
          900000
        ).toString();


      user.audioOTP =
        otp;
      user.audioOTPVerifiedUntil = null;


      user.audioOTPExpiry =
        new Date(
          Date.now() +
          5 * 60 * 1000
        );


      await user.save();


      try {
        await sendOTP(normalizedEmail, otp);
      } catch (emailError) {
        user.audioOTP = "";
        user.audioOTPExpiry = null;
        await user.save();
        throw emailError;
      }


      return res
        .status(200)
        .send({

          message:
            "Audio upload OTP sent successfully",
        });

    } catch (error) {

      console.error(
        "Audio OTP error:",
        error
      );


      return res.status(500).send({
        message:
          error.message,
      });
    }
  }
);


// ==========================================
// AUDIO TWEET - VERIFY OTP
// ==========================================

app.post(
  "/verify-audio-otp",
  async (req, res) => {

    try {

      const {
        email,
        otp
      } = req.body;


      if (!email || !otp) {

        return res.status(400).send({
          message:
            "Email and OTP are required",
        });
      }


      const normalizedEmail = email.trim().toLowerCase();
      const user =
        await User.findOne({
          email: normalizedEmail,
        });


      if (!user) {

        return res.status(404).send({
          message:
            "User not found",
        });
      }


      if (
        user.audioOTP !== otp ||
        !user.audioOTPExpiry ||
        user.audioOTPExpiry <
          new Date()
      ) {

        return res.status(400).send({
          message:
            "Invalid or expired OTP",
        });
      }


      user.audioOTP = "";
      user.audioOTPExpiry = null;
      user.audioOTPVerifiedUntil = new Date(Date.now() + 5 * 60 * 1000);

      await user.save();


      return res
        .status(200)
        .send({

          message:
            "Audio OTP verified successfully",
        });

    } catch (error) {

      console.error(
        "Verify audio OTP error:",
        error
      );


      return res.status(500).send({
        message:
          error.message,
      });
    }
  }
);


// ==========================================
// SERVER
// ==========================================

const port =
  process.env.PORT || 5000;

const url =
  process.env.MONGODB_URL;


mongoose
  .connect(url)

  .then(() => {

    console.log(
      "✅ Connected to MongoDB"
    );


    app.listen(
      port,
      "0.0.0.0",
      () => {

        console.log(
          `🚀 Server running on port ${port}`
        );
      }
    );

  })

  .catch((err) => {

    console.error(
      "❌ MongoDB connection error:",
      err.message
    );
  });