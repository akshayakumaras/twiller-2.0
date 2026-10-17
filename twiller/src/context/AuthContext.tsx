"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { auth } from "./firebase";
import axiosInstance from "../lib/axiosInstance";
import { UAParser } from "ua-parser-js";

interface User {
  phone: string;
  _id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio?: string;
  joinedDate: string;
  email: string;
  website: string;
  location: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<string>;
  signup: (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => Promise<void>;
  updateProfile: (profileData: {
    displayName: string;
    bio: string;
    location: string;
    website: string;
    avatar: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  googlesignin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

// Identify Chrome without accidentally treating Edge as Chrome.
function getBrowserName(): string {
  if (typeof window === "undefined") return "Unknown";

  const parser = new UAParser(window.navigator.userAgent);
  return parser.getBrowser().name || "Unknown";
}

function requiresEmailOTP(): boolean {
  return getBrowserName() === "Chrome";
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadUser = async (firebaseUser: {
      email: string | null;
    } | null) => {
      if (cancelled) return;

      // Do not load the profile while login OTP is pending.
      const pendingOTP = localStorage.getItem("otp-email");
      const otpCheck = localStorage.getItem("auth-otp-check");

      if (pendingOTP || otpCheck) {
        setIsLoading(false);
        return;
      }

      if (!firebaseUser?.email) {
        setUser(null);
        localStorage.removeItem("twitter-user");
        setIsLoading(false);
        return;
      }

      try {
        const response = await axiosInstance.get("/loggedinuser", {
          params: { email: firebaseUser.email },
        });

        if (cancelled) return;

        if (!response.data) {
          setUser(null);
          localStorage.removeItem("twitter-user");
          setIsLoading(false);
          return;
        }

        const profile = response.data as User;

        setUser(profile);
        localStorage.setItem("twitter-user", JSON.stringify(profile));

        // Record login information. A logging failure should not prevent
        // an otherwise successful login.
        try {
          const parser = new UAParser(window.navigator.userAgent);

          const browser = parser.getBrowser().name || "Unknown";
          const operatingSystem = parser.getOS().name || "Unknown";
          const deviceType = parser.getDevice().type || "Desktop";

          let ipAddress = "Unknown";

          try {
            const ipResponse = await fetch(
              "https://api.ipify.org?format=json"
            );

            if (ipResponse.ok) {
              const ipData = await ipResponse.json();
              ipAddress = ipData.ip || "Unknown";
            }
          } catch {
            console.warn("Could not retrieve IP address.");
          }

          await axiosInstance.post("/login-history", {
            userId: profile._id,
            browser,
            operatingSystem,
            deviceType,
            ipAddress,
          });
        } catch (error: unknown) {
          const apiError = error as {
            response?: {
              status?: number;
              data?: { message?: string };
            };
          };

          if (apiError.response?.status === 403) {
            alert(
              apiError.response.data?.message ||
                "Login is not allowed at this time."
            );

            await signOut(auth);

            if (!cancelled) {
              setUser(null);
              localStorage.removeItem("twitter-user");
            }
          } else {
            console.error("Failed to record login history:", error);
          }
        }
      } catch (error) {
        console.error("Failed to load Twiller profile:", error);
        // Keep the Firebase session; a temporary API failure should not
        // automatically sign the user out.
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      void loadUser(firebaseUser);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // Email/password login.
  const login = async (
    email: string,
    password: string
  ): Promise<string> => {
    setIsLoading(true);

    try {
      localStorage.setItem("auth-otp-check", "true");

      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const authenticatedEmail = credential.user.email;

      if (!authenticatedEmail) {
        throw new Error("No email address is associated with this account.");
      }

      if (requiresEmailOTP()) {
        // Save the pending OTP state before sending the request.
        localStorage.setItem("otp-email", authenticatedEmail);
        localStorage.setItem("otp-login-method", "password");
        localStorage.setItem("otp-password", password);

        await axiosInstance.post("/send-otp", {
          email: authenticatedEmail,
        });

        // Password-login OTP flow signs out until OTP is verified.
        await signOut(auth);

        localStorage.removeItem("auth-otp-check");

        window.location.href = "/verify-otp";
        return "otp";
      }

      // Microsoft Edge and other browsers do not require this extra OTP.
      localStorage.removeItem("auth-otp-check");

      // Let onAuthStateChanged load the existing profile.
      window.location.reload();

      return "success";
    } catch (error) {
      localStorage.removeItem("auth-otp-check");
      setIsLoading(false);
      throw error;
    }
  };

  // Email/password signup.
  const signup = async (
    email: string,
    password: string,
    username: string,
    displayName: string
  ): Promise<void> => {
    setIsLoading(true);

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const newUser = {
        username,
        displayName,
        avatar:
          credential.user.photoURL ||
          "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400",
        email: credential.user.email,
      };

      const response = await axiosInstance.post("/register", newUser);

      if (response.data) {
        setUser(response.data);
        localStorage.setItem("twitter-user", JSON.stringify(response.data));
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout.
  const logout = async (): Promise<void> => {
    try {
      await signOut(auth);
      setUser(null);

      localStorage.removeItem("twitter-user");
      localStorage.removeItem("otp-email");
      localStorage.removeItem("otp-login-method");
      localStorage.removeItem("otp-password");
      localStorage.removeItem("auth-otp-check");
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  };

  // Update the Twiller profile.
  const updateProfile = async (profileData: {
    displayName: string;
    bio: string;
    location: string;
    website: string;
    avatar: string;
  }): Promise<void> => {
    if (!user) return;

    setIsLoading(true);

    try {
      const updatedUser: User = {
        ...user,
        ...profileData,
      };

      const response = await axiosInstance.patch(
        `/userupdate/${user.email}`,
        updatedUser
      );

      if (response.data) {
        setUser(response.data);
        localStorage.setItem(
          "twitter-user",
          JSON.stringify(response.data)
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Google login.
  const googlesignin = async (): Promise<void> => {
    setIsLoading(true);

    try {
      localStorage.setItem("auth-otp-check", "true");

      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      const email = credential.user.email;

      if (!email) {
        throw new Error("Google did not return an email address.");
      }

      if (requiresEmailOTP()) {
        // Chrome requires OTP for Google login too.
        localStorage.setItem("otp-email", email);
        localStorage.setItem("otp-login-method", "google");

        await axiosInstance.post("/send-otp", { email });

        // Keep the Google Firebase session active. Do not call
        // signOut here; Google login has no password to reuse.
        localStorage.removeItem("auth-otp-check");

        window.location.href = "/verify-otp";
        return;
      }

      // Edge skips additional OTP and loads the existing profile.
      localStorage.removeItem("auth-otp-check");
      window.location.reload();
    } catch (error: unknown) {
      console.error("Google Sign-In Error:", error);

      localStorage.removeItem("auth-otp-check");
      localStorage.removeItem("otp-email");
      localStorage.removeItem("otp-login-method");

      try {
        await signOut(auth);
      } catch (signOutError) {
        console.error("Could not clear failed Google session:", signOutError);
      }

      const message =
        error instanceof Error
          ? error.message
          : "Google login failed. Please try again.";

      alert(message);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        updateProfile,
        logout,
        isLoading,
        googlesignin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
