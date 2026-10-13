"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/lib/axiosInstance";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/context/firebase";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function VerifyOTPPage() {
  const router = useRouter();

  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const verifyOTP = async () => {
    setLoading(true);
    setMessage("");

    try {
      const email = localStorage.getItem("otp-email");
      const password = localStorage.getItem("otp-password");

      if (!email || !password) {
        setMessage("Session expired. Please login again.");
        setLoading(false);
        return;
      }

      // Verify OTP
      const otpResponse = await axiosInstance.post("/verify-otp", {
        email,
        otp,
      });

      if (otpResponse.status === 200) {
        // Login again to Firebase
        await signInWithEmailAndPassword(auth, email, password);

        // Get user details
        const userResponse = await axiosInstance.get("/loggedinuser", {
          params: {
            email,
          },
        });

        // Save logged in user
        localStorage.setItem(
          "twitter-user",
          JSON.stringify(userResponse.data)
        );

        // Clear temporary values
        localStorage.removeItem("otp-email");
        localStorage.removeItem("otp-password");

        alert("OTP Verified Successfully");

        router.push("/");
      }
    } catch (error: any) {
      setMessage(
        error.response?.data?.message ||
          "OTP verification failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <Card className="w-full max-w-md bg-black border-gray-700 text-white">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Verify OTP
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">

          <Input
            type="text"
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />

          <Button
            className="w-full"
            onClick={verifyOTP}
            disabled={loading}
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </Button>

          {message && (
            <p className="text-center text-red-500">
              {message}
            </p>
          )}

        </CardContent>
      </Card>
    </div>
  );
}