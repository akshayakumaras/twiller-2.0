"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage, Language } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/context/firebase";
import {
    RecaptchaVerifier,
    ConfirmationResult,
    linkWithPhoneNumber,
    signInWithPhoneNumber,
} from "firebase/auth";
import axiosInstance from "@/lib/axiosInstance";

const languages: { code: Language; name: string }[] = [
    { code: "en", name: "English" },
    { code: "es", name: "Español" },
    { code: "hi", name: "हिन्दी" },
    { code: "pt", name: "Português" },
    { code: "zh", name: "中文" },
    { code: "fr", name: "Français" },
];

export default function LanguageSelector() {
    const { language, setLanguage, t } = useLanguage();
    const { user } = useAuth();

    const [selectedLanguage, setSelectedLanguage] =
        useState<Language>(language);

    const [showOTP, setShowOTP] = useState(false);
    const [otp, setOtp] = useState("");
    const [otpType, setOtpType] = useState<"email" | "mobile" | null>(
        null
    );

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const confirmationResult = useRef<ConfirmationResult | null>(null);
    const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);

    useEffect(() => {
        setSelectedLanguage(language);
    }, [language]);

    useEffect(() => {
        return () => {
            if (recaptchaVerifier.current) {
                recaptchaVerifier.current.clear();
                recaptchaVerifier.current = null;
            }
        };
    }, []);

    const closeOTP = () => {
        setShowOTP(false);
        setOtp("");
        setMessage("");
        setOtpType(null);

        if (recaptchaVerifier.current) {
            recaptchaVerifier.current.clear();
            recaptchaVerifier.current = null;
        }
    };

    // ============================
    // EMAIL OTP
    // ============================

    const sendEmailOTP = async () => {
        if (!user?.email) {
            setMessage("No registered email found.");
            return;
        }

        try {
            setLoading(true);
            setMessage("");

            await axiosInstance.post("/send-language-otp", {
                email: user.email,
            });

            setMessage("OTP sent to your registered email.");
        } catch (error: any) {
            console.error(error);

            setMessage(
                error.response?.data?.message ||
                "Failed to send email OTP."
            );
        } finally {
            setLoading(false);
        }
    };

    const verifyEmailOTP = async () => {
        if (!user?.email) return;

        if (otp.length !== 6) {
            setMessage("Please enter the 6-digit OTP.");
            return;
        }

        try {
            setLoading(true);
            setMessage("");

            await axiosInstance.post("/verify-language-otp", {
                email: user.email,
                otp,
            });

            // Only change language AFTER successful verification
            setLanguage(selectedLanguage);

            closeOTP();
        } catch (error: any) {
            console.error(error);

            setMessage(
                error.response?.data?.message ||
                "Invalid or expired OTP."
            );
        } finally {
            setLoading(false);
        }
    };

    // ============================
    // MOBILE OTP
    // ============================

    const sendMobileOTP = async () => {
        if (!user?.email) {
            setMessage("User email not found.");
            return;
        }

        try {
            setLoading(true);
            setMessage("");

            // Get current Firebase user
            const firebaseUser = auth.currentUser;

            if (!firebaseUser) {
                setMessage("Please log in again.");
                return;
            }

            // Get phone number from MongoDB user
            const response = await axiosInstance.get("/loggedinuser", {
                params: {
                    email: user.email,
                },
            });

            const userData = response.data;

            if (!userData?.phone) {
                setMessage(
                    "No registered mobile number found for this account."
                );
                return;
            }

            const phone = userData.phone;

            if (!phone.startsWith("+")) {
                setMessage(
                    "Phone number must include country code, e.g. +919876543210."
                );
                return;
            }

            // Create invisible reCAPTCHA
            if (!recaptchaVerifier.current) {
                recaptchaVerifier.current = new RecaptchaVerifier(
                    auth,
                    "language-recaptcha",
                    {
                        size: "invisible",
                    }
                );
            }

            // Use current Firebase account instead of signInWithPhoneNumber
            const confirmation = await signInWithPhoneNumber(
                auth,
                phone,
                recaptchaVerifier.current
            );

            confirmationResult.current = confirmation;

            setMessage(
                "OTP sent to your registered mobile number."
            );
        } catch (error: any) {
            console.error("Mobile OTP error:", error);

            setMessage(
                error?.message ||
                "Failed to send mobile OTP."
            );

            if (recaptchaVerifier.current) {
                recaptchaVerifier.current.clear();
                recaptchaVerifier.current = null;
            }
        } finally {
            setLoading(false);
        }
    };

    const verifyMobileOTP = async () => {
        if (!confirmationResult.current) {
            setMessage("Please request an OTP first.");
            return;
        }

        if (otp.length !== 6) {
            setMessage("Please enter the 6-digit OTP.");
            return;
        }

        try {
            setLoading(true);
            setMessage("");

            await confirmationResult.current.confirm(otp);

            // OTP verified successfully.
            // Language can now safely change.
            setLanguage(selectedLanguage);

            closeOTP();
        } catch (error: any) {
            console.error("Mobile OTP verification error:", error);

            setMessage(
                error?.message ||
                "Invalid or expired OTP."
            );
        } finally {
            setLoading(false);
        }
    };

    // ============================
    // LANGUAGE CHANGE
    // ============================

    const handleChange = async (
        e: React.ChangeEvent<HTMLSelectElement>
    ) => {
        const newLanguage = e.target.value as Language;

        // Same language - no OTP needed
        if (newLanguage === language) {
            return;
        }

        setSelectedLanguage(newLanguage);
        setMessage("");

        // French → EMAIL OTP
        if (newLanguage === "fr") {
            setOtpType("email");
            setShowOTP(true);

            await sendEmailOTP();
            return;
        }

        // All other languages → MOBILE OTP
        setOtpType("mobile");
        setShowOTP(true);

        await sendMobileOTP();
    };

    const verifyOTP = async () => {
        if (otpType === "email") {
            await verifyEmailOTP();
        } else {
            await verifyMobileOTP();
        }
    };

    return (
        <>
            <div className="flex items-center gap-3">
                <label
                    htmlFor="language"
                    className="text-sm text-gray-400"
                >
                    {t("language")}
                </label>

                <select
                    id="language"
                    value={language}
                    onChange={handleChange}
                    className="rounded-md border border-gray-700 bg-black px-3 py-2 text-white"
                >
                    {languages.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                            {lang.name}
                        </option>
                    ))}
                </select>
            </div>

            {showOTP && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
                    <div className="w-full max-w-md rounded-xl border border-gray-700 bg-black p-6">

                        <h2 className="mb-2 text-xl font-bold text-white">
                            Verify Language Change
                        </h2>

                        <p className="mb-4 text-sm text-gray-400">
                            {otpType === "email"
                                ? "An OTP has been sent to your registered email address."
                                : "An OTP has been sent to your registered mobile number."}
                        </p>

                        {otpType === "mobile" && (
                            <div id="language-recaptcha" />
                        )}

                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="Enter 6-digit OTP"
                            value={otp}
                            onChange={(e) =>
                                setOtp(
                                    e.target.value.replace(/\D/g, "")
                                )
                            }
                            className="mb-4 w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white outline-none"
                        />

                        <button
                            type="button"
                            onClick={verifyOTP}
                            disabled={loading || otp.length !== 6}
                            className="mb-3 w-full rounded-full bg-blue-500 px-4 py-3 font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
                        >
                            {loading ? "Verifying..." : "Verify OTP"}
                        </button>

                        <button
                            type="button"
                            onClick={closeOTP}
                            disabled={loading}
                            className="w-full rounded-full border border-gray-700 px-4 py-3 text-gray-300 hover:bg-gray-900"
                        >
                            Cancel
                        </button>

                        {message && (
                            <p className="mt-4 text-center text-sm text-gray-300">
                                {message}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}