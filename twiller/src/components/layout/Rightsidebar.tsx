"use client";

import { Search, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Input } from "../ui/input";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useAuth } from "@/context/AuthContext";
import axiosInstance from "@/lib/axiosInstance";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const suggestions = [
  {
    id: "1",
    username: "narendramodi",
    displayName: "Narendra Modi",
    avatar:
      "https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400",
    verified: true,
  },
  {
    id: "2",
    username: "akshaykumar",
    displayName: "Akshay Kumar",
    avatar:
      "https://images.pexels.com/photos/1382735/pexels-photo-1382735.jpeg?auto=compress&cs=tinysrgb&w=400",
    verified: true,
  },
  {
    id: "3",
    username: "rashtrapatibhvn",
    displayName: "President of India",
    avatar:
      "https://images.pexels.com/photos/1080213/pexels-photo-1080213.jpeg?auto=compress&cs=tinysrgb&w=400",
    verified: true,
  },
];

const plans = [
  {
    name: "Free",
    price: 0,
    tweets: "1 tweet",
  },
  {
    name: "Bronze",
    price: 100,
    tweets: "3 tweets",
  },
  {
    name: "Silver",
    price: 300,
    tweets: "5 tweets",
  },
  {
    name: "Gold",
    price: 1000,
    tweets: "Unlimited tweets",
  },
];

export default function RightSidebar() {
  const { user } = useAuth();

  const [currentPlan, setCurrentPlan] = useState("Free");
const [currentTweetLimit, setCurrentTweetLimit] = useState(1);

useEffect(() => {
  if (!user?._id) return;

  const fetchSubscription = async () => {
    try {
      const response = await axiosInstance.get(
        `/subscription/${user._id}`
      );

      setCurrentPlan(response.data.plan || "Free");
      setCurrentTweetLimit(response.data.tweetLimit ?? 1);
    } catch (error) {
      console.error("Failed to load subscription:", error);
    }
  };

  fetchSubscription();
}, [user?._id]);

  const [showPlans, setShowPlans] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [isPaymentLoading, setIsPaymentLoading] =
    useState(false);

  // ==========================================
  // LOAD RAZORPAY
  // ==========================================

  const loadRazorpay = () => {
    return new Promise<boolean>((resolve) => {
      if (document.getElementById("razorpay-script")) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");

      script.id = "razorpay-script";

      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";

      script.onload = () => resolve(true);

      script.onerror = () => resolve(false);

      document.body.appendChild(script);
    });
  };

  // ==========================================
  // SUBSCRIBE
  // ==========================================

  const handleSubscribe = async (plan: any) => {
    if (!user?._id || !user?.email) {
      setPaymentMessage(
        "Please login before subscribing."
      );

      return;
    }

    if (plan.price === 0) {
      setPaymentMessage(
        "Free Plan is already available."
      );

      return;
    }

    try {
      setIsPaymentLoading(true);

      setPaymentMessage(
        "Checking payment time..."
      );

      const razorpayLoaded =
        await loadRazorpay();

      if (!razorpayLoaded) {
        setPaymentMessage(
          "Unable to load Razorpay."
        );

        setIsPaymentLoading(false);

        return;
      }

      // ==========================================
      // CREATE ORDER
      // ==========================================

      const response =
        await axiosInstance.post(
          "/create-subscription",
          {
            userId: user._id,
            plan: plan.name,
          }
        );

      const { order, key } =
        response.data;

      if (!order || !key) {
        setPaymentMessage(
          "Unable to create payment order."
        );

        setIsPaymentLoading(false);

        return;
      }

      // ==========================================
      // RAZORPAY OPTIONS
      // ==========================================

      const options = {
        key: key,

        amount: order.amount,

        currency: order.currency,

        name: "Twiller",

        description:
          `${plan.name} Plan Subscription`,

        order_id: order.id,

        prefill: {
          name: user.displayName,

          email: user.email,

          contact: user.phone || "",
        },

        theme: {
          color: "#1d9bf0",
        },

        handler: async (
          paymentResponse: any
        ) => {
          try {
            setPaymentMessage(
              "Verifying payment..."
            );

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

            if (
              verifyResponse.data.success
            ) {
              setPaymentMessage(
                `${plan.name} Plan activated successfully! Invoice sent to your email.`
              );

              setTimeout(() => {
                setShowPlans(false);

                setPaymentMessage("");
              }, 3000);
            }
          } catch (error: any) {
            console.error(
              "Payment verification error:",
              error
            );

            setPaymentMessage(
              error.response?.data
                ?.message ||
                "Payment verification failed."
            );
          } finally {
            setIsPaymentLoading(false);
          }
        },

        modal: {
          ondismiss: () => {
            setPaymentMessage(
              "Payment cancelled."
            );

            setIsPaymentLoading(false);
          },
        },
      };

      const razorpay =
        new window.Razorpay(options);

      razorpay.open();
    } catch (error: any) {
      console.error(
        "Razorpay error:",
        error
      );

      setPaymentMessage(
        error.response?.data?.message ||
          "Unable to start payment."
      );

      setIsPaymentLoading(false);
    }
  };

  return (
    <div className="w-80 p-4 space-y-4">

      {/* Search */}

      <div className="relative">

        <Search
          className="
            absolute left-4 top-1/2
            transform -translate-y-1/2
            text-gray-400 h-5 w-5
          "
        />

        <Input
          placeholder="Search"
          className="
            pl-12
            bg-gray-900
            border-gray-800
            text-white
            placeholder-gray-400
            rounded-full
            py-3
          "
        />

      </div>

      {/* Premium */}

      <Card className="bg-gray-900 border-gray-800">

        <CardContent className="p-4">

          <h3 className="
            text-white
            text-xl
            font-bold
            mb-2
          ">
            Subscribe to Premium
          </h3>

          <p className="
            text-gray-400
            text-sm
            mb-4
          ">
           Current plan: {currentPlan}

<br />

{currentTweetLimit === -1
  ? "Unlimited tweets"
  : `${currentTweetLimit} tweet${currentTweetLimit === 1 ? "" : "s"} allowed`}
          </p>

          <Button
            onClick={() => {
              setShowPlans(true);
              setPaymentMessage("");
            }}
            className="
              bg-blue-500
              hover:bg-blue-600
              text-white
              font-semibold
              rounded-full
            "
          >
            Subscribe
          </Button>

        </CardContent>

      </Card>

      {/* Subscription Modal */}

      {showPlans && (

        <div className="
          fixed
          inset-0
          z-[100]
          flex
          items-center
          justify-center
          bg-black/80
          px-4
        ">

          <div className="
            w-full
            max-w-lg
            rounded-2xl
            border
            border-gray-700
            bg-black
            p-6
          ">

            {/* Header */}

            <div className="
              flex
              items-center
              justify-between
              mb-5
            ">

              <h2 className="
                text-2xl
                font-bold
                text-white
              ">
                Choose your plan
              </h2>

              <button
                type="button"
                onClick={() => {
                  setShowPlans(false);
                  setPaymentMessage("");
                }}
                className="
                  text-gray-400
                  hover:text-white
                "
              >
                <X className="h-6 w-6" />
              </button>

            </div>

            <p className="
              text-gray-400
              text-sm
              mb-5
            ">
              Payments are available only
              between 10:00 AM and 11:00 AM IST.
            </p>

            {/* Plans */}

            <div className="space-y-3">

              {plans.map((plan) => (

                <div
                  key={plan.name}
                  className="
                    flex
                    items-center
                    justify-between
                    rounded-xl
                    border
                    border-gray-700
                    bg-gray-900
                    p-4
                  "
                >

                  <div>

                    <h3 className="
                      text-white
                      text-lg
                      font-bold
                    ">
                      {plan.name}
                    </h3>

                    <p className="
                      text-gray-400
                      text-sm
                    ">
                      {plan.tweets}
                    </p>

                  </div>

                  <div className="text-right">

                    <p className="
                      text-white
                      font-bold
                    ">

                      ₹{plan.price}

                      {plan.price > 0 && (

                        <span className="
                          text-gray-400
                          text-sm
                        ">
                          {" "}
                          / month
                        </span>

                      )}

                    </p>

                    <Button
                      disabled={
                        isPaymentLoading
                      }
                      onClick={() =>
                        handleSubscribe(plan)
                      }
                      className="
                        mt-2
                        bg-blue-500
                        hover:bg-blue-600
                        rounded-full
                      "
                    >

                      {currentPlan === plan.name
  ? "Current Plan"
  : isPaymentLoading
  ? "Processing..."
  : "Subscribe"}

                    </Button>

                  </div>

                </div>

              ))}

            </div>

            {/* Payment Message */}

            {paymentMessage && (

              <p className="
                mt-4
                text-center
                text-sm
                text-yellow-400
              ">
                {paymentMessage}
              </p>

            )}

          </div>

        </div>

      )}

      {/* Who to follow */}

      <Card className="
        bg-gray-900
        border-gray-800
      ">

        <CardContent className="p-4">

          <h3 className="
            text-white
            text-xl
            font-bold
            mb-4
          ">
            You might like
          </h3>

          <div className="space-y-4">

            {suggestions.map(
              (suggestedUser) => (

                <div
                  key={suggestedUser.id}
                  className="
                    flex
                    items-center
                    justify-between
                  "
                >

                  <div className="
                    flex
                    items-center
                    space-x-3
                  ">

                    <Avatar className="
                      h-10
                      w-10
                    ">

                      <AvatarImage
                        src={
                          suggestedUser.avatar
                        }
                        alt={
                          suggestedUser.displayName
                        }
                      />

                      <AvatarFallback>
                        {
                          suggestedUser
                            .displayName[0]
                        }
                      </AvatarFallback>

                    </Avatar>

                    <div>

                      <div className="
                        flex
                        items-center
                        space-x-1
                      ">

                        <span className="
                          text-white
                          font-semibold
                        ">
                          {
                            suggestedUser
                              .displayName
                          }
                        </span>

                        {suggestedUser.verified && (

                          <div className="
                            bg-blue-500
                            rounded-full
                            p-0.5
                          ">

                            <svg
                              className="
                                h-3
                                w-3
                                text-white
                                fill-current
                              "
                              viewBox="0 0 20 20"
                            >

                              <path d="
                                M6.267 3.455
                                a3.066 3.066 0
                                001.745-.723
                                3.066 3.066 0
                                013.976 0
                                3.066 3.066 0
                                001.745.723
                                3.066 3.066 0
                                012.812 2.812
                                c.051.643
                                .304 1.254
                                .723 1.745
                                a3.066 3.066 0
                                010 3.976
                                3.066 3.066 0
                                00-.723 1.745
                                3.066 3.066 0
                                01-2.812 2.812
                                3.066 3.066 0
                                00-1.745.723
                                3.066 3.066 0
                                01-3.976 0
                                3.066 3.066 0
                                00-1.745-.723
                                3.066 3.066 0
                                01-2.812-2.812
                                3.066 3.066 0
                                00-.723-1.745
                                3.066 3.066 0
                                010-3.976
                                3.066 3.066 0
                                00.723-1.745
                                3.066 3.066 0
                                012.812-2.812
                                zm7.44 5.252
                                a1 1 0 00-1.414-1.414
                                L9 10.586
                                7.707 9.293
                                a1 1 0 00-1.414 1.414
                                l2 2
                                a1 1 0
                                001.414 0
                                l4-4z
                              " />

                            </svg>

                          </div>

                        )}

                      </div>

                      <span className="
                        text-gray-400
                        text-sm
                      ">
                        @{suggestedUser.username}
                      </span>

                    </div>

                  </div>

                  <Button
                    variant="outline"
                    className="
                      bg-white
                      text-black
                      hover:bg-gray-200
                      font-semibold
                      rounded-full
                      px-4
                    "
                  >
                    Follow
                  </Button>

                </div>

              )
            )}

          </div>

          <Button
            variant="ghost"
            className="
              text-blue-400
              hover:text-blue-300
              p-0
              mt-4
            "
          >
            Show more
          </Button>

        </CardContent>

      </Card>

      {/* Footer */}

      <div className="
        p-4
        text-xs
        text-gray-500
        space-y-2
      ">

        <div className="
          flex
          flex-wrap
          gap-x-3
          gap-y-1
        ">

          <a
            href="#"
            className="hover:underline"
          >
            Terms of Service
          </a>

          <a
            href="#"
            className="hover:underline"
          >
            Privacy Policy
          </a>

          <a
            href="#"
            className="hover:underline"
          >
            Cookie Policy
          </a>

          <a
            href="#"
            className="hover:underline"
          >
            Accessibility
          </a>

          <a
            href="#"
            className="hover:underline"
          >
            Ads info
          </a>

        </div>

        <div>
          © 2024 X Corp.
        </div>

      </div>

    </div>
  );
}