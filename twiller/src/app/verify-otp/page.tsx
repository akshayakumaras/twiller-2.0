
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axiosInstance";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/context/firebase";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function VerifyOTPPage() {
  const router = useRouter();

  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const verifyOTP = async () => {
    setMessage("");

    const cleanOTP = otp.trim();

    if (!/^\d{6}$/.test(cleanOTP)) {
      setMessage("Enter a valid 6-digit OTP.");
      return;
    }

    setLoading(true);

    try {
      const email = localStorage.getItem("otp-email");
      const password = localStorage.getItem("otp-password");
      const loginMethod =
        localStorage.getItem("otp-login-method") || "password";

      if (!email) {
        setMessage("Your verification session expired. Please log in again.");
        return;
      }

      // Step 1: Verify OTP on the backend.
      await axiosInstance.post("/verify-otp", {
        email: email.trim().toLowerCase(),
        otp: cleanOTP,
      });

      // Step 2: Restore Firebase authentication when necessary.
      // Google login already has an active Firebase session.
      if (loginMethod !== "google") {
        if (!password) {
          setMessage("Your login session expired. Please log in again.");
          return;
        }

        await signInWithEmailAndPassword(auth, email, password);
      }

      // Step 3: Load the existing Twiller profile.
      const userResponse = await axiosInstance.get("/loggedinuser", {
        params: { email: email.trim().toLowerCase() },
      });

      if (!userResponse.data) {
        setMessage("Your Twiller profile could not be found.");
        return;
      }

      localStorage.setItem(
        "twitter-user",
        JSON.stringify(userResponse.data)
      );

      // Step 4: Clear OTP-related temporary data only after success.
      localStorage.removeItem("otp-email");
      localStorage.removeItem("otp-password");
      localStorage.removeItem("otp-login-method");
      localStorage.removeItem("auth-otp-check");

      router.replace("/");
    } catch (error: unknown) {
      const apiError = error as {
        response?: { data?: { message?: string } };
        message?: string;
      };

      setMessage(
        apiError.response?.data?.message ||
          apiError.message ||
          "OTP verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md bg-black border-gray-700 text-white">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Verify OTP
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-center text-gray-400">
            Enter the 6-digit code sent to your registered email address.
          </p>

          <Input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(event) =>
              setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            disabled={loading}
          />

          <Button
            className="w-full"
            onClick={verifyOTP}
            disabled={loading || otp.length !== 6}
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </Button>

          {message && (
            <p role="alert" className="text-center text-red-500">
              {message}
            </p>
          )}

          <Button
            variant="outline"
            className="w-full"
            disabled={loading}
            onClick={() => {
              localStorage.removeItem("otp-email");
              localStorage.removeItem("otp-password");
              localStorage.removeItem("otp-login-method");
              localStorage.removeItem("auth-otp-check");
              router.replace("/login");
            }}
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
