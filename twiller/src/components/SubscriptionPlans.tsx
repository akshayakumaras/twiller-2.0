"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import axiosInstance from "@/lib/axiosInstance";
import { useAuth } from "@/context/AuthContext";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface SubscribeProps {
  onClose: () => void;
}

const plans = [
  {
    name: "Free",
    price: 0,
    limit: "1 tweet",
  },
  {
    name: "Bronze",
    price: 100,
    limit: "3 tweets",
  },
  {
    name: "Silver",
    price: 300,
    limit: "5 tweets",
  },
  {
    name: "Gold",
    price: 1000,
    limit: "Unlimited tweets",
  },
];

const Subscribe = ({ onClose }: SubscribeProps) => {
  const { user } = useAuth();

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  // Frontend check.
  // Backend also checks this time, which is the important security check.
  const isPaymentTimeAllowed = () => {
    const parts = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date());

    const hour = Number(
      parts.find((part) => part.type === "hour")?.value
    );

    const minute = Number(
      parts.find((part) => part.type === "minute")?.value
    );

    const totalMinutes = hour * 60 + minute;

    return totalMinutes >= 600 && totalMinutes < 660;
  };

  const loadRazorpay = () => {
    return new Promise<boolean>((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");

      script.id = "razorpay-checkout";

      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () => {
        resolve(true);
      };

      script.onerror = () => {
        resolve(false);
      };

      document.body.appendChild(script);
    });
  };

  const handleSubscribe = async (plan: any) => {
    if (!user?._id || !user?.email) {
      setMessage("Please login before subscribing.");
      return;
    }

    if (plan.price === 0) {
      setMessage("Free Plan is already available.");
      return;
    }

  
    //   if (!isPaymentTimeAllowed()) {
    //   setMessage(
    //     "Payments are available only between 10:00 AM and 11:00 AM IST."
    //   );
    //   return;
    // }

    try {
      setLoadingPlan(plan.name);
      setMessage("");

      // Load Razorpay Checkout
      const razorpayLoaded = await loadRazorpay();

      if (!razorpayLoaded) {
        setMessage(
          "Unable to load Razorpay. Please try again."
        );
        return;
      }

      /*
       * Create Razorpay ORDER
       *
       * This matches your current backend:
       * POST /create-subscription
       */
      const response = await axiosInstance.post(
        "/create-subscription",
        {
          userId: user._id,
          email: user.email,
          plan: plan.name,
        }
      );

      console.log("Create order response:", response.data);

      const { order, key } = response.data;

      if (!order || !order.id || !key) {
        console.error("Invalid Razorpay response:", response.data);

        setMessage("Unable to create Razorpay order.");
        return;
      }

      /*
       * Razorpay Checkout
       */
      const options = {
        key: key,

        amount: order.amount,

        currency: order.currency,

        name: "Twiller",

        description: `${plan.name} Plan - ${plan.limit}`,

        order_id: order.id,

        prefill: {
          name: user.displayName || "",
          email: user.email || "",
          contact: user.phone || "",
        },

        theme: {
          color: "#1d9bf0",
        },

        handler: async function (paymentResponse: any) {
          try {
            console.log(
              "Razorpay payment response:",
              paymentResponse
            );

            setMessage("Verifying payment...");

            /*
             * Verify payment with backend
             */
            const verifyResponse =
              await axiosInstance.post(
                "/verify-subscription",
                {
                  userId: user._id,

                  plan: plan.name,

                  razorpay_payment_id:
                    paymentResponse.razorpay_payment_id,

                  razorpay_order_id:
                    paymentResponse.razorpay_order_id,

                  razorpay_signature:
                    paymentResponse.razorpay_signature,
                }
              );

            console.log(
              "Verification response:",
              verifyResponse.data
            );

            if (verifyResponse.data.success) {
  // Update the current plan immediately after successful verification.
  setCurrentPlan(plan.name);

  const selectedPlan = plans.find(
    (item) => item.name === plan.name
  );

  setCurrentTweetLimit(
    plan.name === "Gold"
      ? -1
      : plan.name === "Silver"
      ? 5
      : plan.name === "Bronze"
      ? 3
      : 1
  );

  setPaymentMessage(
    `${plan.name} Plan activated successfully! Invoice sent to your email.`
  );

  setTimeout(() => {
    setShowPlans(false);
    setPaymentMessage("");
  }, 3000);

              setTimeout(() => {
                onClose();
              }, 2000);
            } else {
              setMessage(
                "Payment completed but subscription activation failed."
              );
            }
          } catch (error: any) {
            console.error(
              "Subscription verification error:",
              error
            );

            setMessage(
              error.response?.data?.message ||
                "Payment was successful, but verification failed."
            );
          }
        },

        modal: {
          ondismiss: function () {
            setMessage("Payment cancelled.");
          },
        },
      };

      const razorpay = new window.Razorpay(options);

      razorpay.on(
        "payment.failed",
        function (response: any) {
          console.error(
            "Razorpay payment failed:",
            response
          );

          setMessage(
            response.error?.description ||
              "Payment failed. Please try again."
          );
        }
      );

      razorpay.open();
    } catch (error: any) {
      console.error("Subscription error:", error);

      setMessage(
        error.response?.data?.message ||
          "Unable to start payment."
      );
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-gray-700 bg-black p-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-white">
            Choose your plan
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-7 w-7" />
          </button>
        </div>

        {/* Payment restriction */}
        <p className="text-gray-400 text-lg mb-6">
          Payments are available only between{" "}
          <span className="text-white font-semibold">
            10:00 AM and 11:00 AM IST
          </span>
          .
        </p>

        {/* Plans */}
        <div className="space-y-5">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="flex items-center justify-between rounded-2xl border border-gray-700 bg-gray-900 p-6"
            >
              {/* Plan details */}
              <div>
                <h3 className="text-2xl font-bold text-white">
                  {plan.name}
                </h3>

                <p className="text-gray-400 text-lg mt-2">
                  {plan.limit}
                </p>
              </div>

              {/* Price + button */}
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-2xl font-bold text-white">
                    ₹{plan.price}
                  </span>

                  {plan.price > 0 && (
                    <span className="text-gray-400 text-lg">
                      {" "}
                      / month
                    </span>
                  )}
                </div>

                {plan.name === "Free" ? (
                  <Button
                    disabled
                    className="bg-blue-500 text-white font-semibold rounded-full px-8"
                  >
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    onClick={() =>
                      handleSubscribe(plan)
                    }
                    disabled={loadingPlan !== null}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-full px-8"
                  >
                    {loadingPlan === plan.name
                      ? "Starting..."
                      : "Subscribe"}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Message */}
        {message && (
          <p
            className={`mt-6 text-center text-sm ${
              message.includes("successfully")
                ? "text-green-400"
                : "text-yellow-400"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
};

export default Subscribe;

function setPaymentMessage(arg0: string) {
  throw new Error("Function not implemented.");
}
function setShowPlans(arg0: boolean) {
  throw new Error("Function not implemented.");
}

function setCurrentTweetLimit(arg0: number) {
  throw new Error("Function not implemented.");
}

function setCurrentPlan(name: any) {
  throw new Error("Function not implemented.");
}

