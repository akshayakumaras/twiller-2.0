
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleReset = async () => {
    setMessage("");
    setNewPassword("");

    if (!identifier.trim()) {
      setMessage("Please enter your email or phone number.");
      return;
    }

    try {
      const res = await fetch("http://localhost:5001/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          identifier,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setNewPassword(data.password);
        setMessage("Password reset successful.");
      } else {
        setMessage(data.message || "Password reset failed.");
      }
    } catch {
      setMessage("Server error.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md bg-black border-gray-700 text-white">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            Forgot Password
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div>
            <Label>Email or Phone Number</Label>
            <Input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter email or phone"
            />
          </div>

          <Button className="w-full" onClick={handleReset}>
            Reset Password
          </Button>

          {message && (
            <p className="text-center text-blue-400">{message}</p>
          )}

          {newPassword && (
            <>
              <div className="border border-green-600 rounded p-3">
                <p className="font-semibold">Your New Password</p>
                <p className="text-green-400 break-all">{newPassword}</p>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  window.location.href = "/";
                }}
              >
                Back to Login
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
