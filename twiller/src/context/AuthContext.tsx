
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
  signInWithRedirect,
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

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Listen for Firebase authentication changes.
  // This also handles the user after Google redirects back to Twiller.
  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (cancelled) return;

      const pendingOTP = localStorage.getItem("otp-email");

      if (pendingOTP) {
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

        if (response.data) {
          setUser(response.data);
          localStorage.setItem(
            "twitter-user",
            JSON.stringify(response.data)
          );

          // Record login details.
          const parser = new UAParser(window.navigator.userAgent);

          const browser = parser.getBrowser().name || "Unknown";
          const operatingSystem = parser.getOS().name || "Unknown";
          const deviceType = parser.getDevice().type || "Desktop";

          try {
            const ipResponse = await fetch(
              "https://api.ipify.org?format=json"
            );
            const ipData = await ipResponse.json();

            await axiosInstance.post("/login-history", {
              userId: response.data._id,
              browser,
              operatingSystem,
              deviceType,
              ipAddress: ipData.ip,
            });
          } catch (error: any) {
            if (error.response?.status === 403) {
              alert(error.response.data.message);

              await signOut(auth);

              if (!cancelled) {
                setUser(null);
                localStorage.removeItem("twitter-user");
              }

              return;
            }

            console.error("Failed to record login history:", error);
          }
        } else {
          setUser(null);
          localStorage.removeItem("twitter-user");
        }
      } catch (error) {
        console.error("Failed to fetch Twiller user:", error);

        // Do not automatically sign out of Firebase because a
        // temporary backend/network error may have caused this.
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  // Email and password login.
  const login = async (
    email: string,
    password: string
  ): Promise<string> => {
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const parser = new UAParser();
      const browser = parser.getBrowser().name || "Unknown";

      // Chrome requires email OTP.
      if (browser.includes("Chrome")) {
        await axiosInstance.post("/send-otp", { email });

        await signOut(auth);

        localStorage.setItem("otp-email", email);
        localStorage.setItem("otp-password", password);

        window.location.href = "/verify-otp";

        return "otp";
      }

      const firebaseUser = userCredential.user;

      if (firebaseUser.email) {
        const response = await axiosInstance.get("/loggedinuser", {
          params: { email: firebaseUser.email },
        });

        if (response.data) {
          setUser(response.data);
          localStorage.setItem(
            "twitter-user",
            JSON.stringify(response.data)
          );
        }
      }

      return "success";
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  // Email and password signup.
  const signup = async (
    email: string,
    password: string,
    username: string,
    displayName: string
  ): Promise<void> => {
    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const firebaseUser = userCredential.user;

      const newUser = {
        username,
        displayName,
        avatar:
          firebaseUser.photoURL ||
          "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400",
        email: firebaseUser.email,
      };

      const response = await axiosInstance.post("/register", newUser);

      if (response.data) {
        setUser(response.data);
        localStorage.setItem(
          "twitter-user",
          JSON.stringify(response.data)
        );
      }
    } catch (error) {
      setIsLoading(false);
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

  // Google login using redirect instead of popup.
  const googlesignin = async (): Promise<void> => {
    setIsLoading(true);

    try {
      const googleAuthProvider = new GoogleAuthProvider();

      await signInWithRedirect(auth, googleAuthProvider);

      // The browser leaves this page for Google.
      // onAuthStateChanged handles Firebase auth after the redirect.
    } catch (error: unknown) {
      console.error("Google Sign-In Error:", error);

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
