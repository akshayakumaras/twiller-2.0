"use client";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "firebase/auth";
import React, { createContext, useContext, useState, useEffect } from "react";
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
  logout: () => void;
  isLoading: boolean;
  googlesignin: () => void;
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

  useEffect(() => {
    // Check for existing session
    const unsubcribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const pendingOTP = localStorage.getItem("otp-email");

if (pendingOTP) {
  setIsLoading(false);
  return;
}
      if (firebaseUser?.email) {
        const pendingOTP = localStorage.getItem("otp-email");

if (pendingOTP) {
  console.log("OTP verification pending...");
  setIsLoading(false);
  return;
}
        try {
          const res = await axiosInstance.get("/loggedinuser", {
            params: { email: firebaseUser.email },
          });

          if (res.data) {
            setUser(res.data);
            localStorage.setItem("twitter-user", JSON.stringify(res.data));

            const parser = new UAParser(window.navigator.userAgent);
            
            const browser = parser.getBrowser().name || "Unknown";
            const operatingSystem = parser.getOS().name || "Unknown";
            const deviceType = parser.getDevice().type || "Desktop";

            const ipResponse = await fetch("https://api.ipify.org?format=json");
            const ipData = await ipResponse.json();
try {
  await axiosInstance.post("/login-history", {
    userId: res.data._id,
    browser,
    operatingSystem,
    deviceType,
    ipAddress: ipData.ip,
  });
} catch (error: any) {
  if (error.response?.status === 403) {
    alert(error.response.data.message);

    await signOut(auth);

    setUser(null);

    localStorage.removeItem("twitter-user");

    return;
  }

  console.error(error);
}
          }
        } catch (err) {
          console.log("Failed to fetch user:", err);
        }
      } else {
        setUser(null);
        localStorage.removeItem("twitter-user");
      }
      setIsLoading(false);
    });
    return () => unsubcribe();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    // Mock authentication - in real app, this would call an API
    const usercred = await signInWithEmailAndPassword(auth, email, password);
    // Detect browser
const result = UAParser();

const browser = result.browser.name || "Unknown";
const deviceType = result.device.type || "Desktop";


// Chrome → OTP Required
if (browser.includes("Chrome")) {
  await axiosInstance.post("/send-otp", {
    email,
  });

   await signOut(auth);

  localStorage.setItem("otp-email", email);
localStorage.setItem("otp-password", password);

  window.location.href = "/verify-otp";

  setIsLoading(false);

  return "otp";
}
    const firebaseuser = usercred.user;
    const res = await axiosInstance.get("/loggedinuser", {
      params: { email: firebaseuser.email },
    });
    if (res.data) {
      setUser(res.data);
      localStorage.setItem("twitter-user", JSON.stringify(res.data));
    }
    // const mockUser: User = {
    //   id: '1',
    //   username: 'johndoe',
    //   displayName: 'John Doe',
    //   avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400',
    //   bio: 'Software developer passionate about building great products',
    //   joinedDate: 'April 2024'
    // };
    setIsLoading(false);
    return "success";
  };

  const signup = async (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => {
    setIsLoading(true);
    // Mock authentication - in real app, this would call an API
    const usercred = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const user = usercred.user;
    const newuser: any = {
      username,
      displayName,
      avatar: user.photoURL || "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400",
      email: user.email,
    };
    const res = await axiosInstance.post("/register", newuser);
    if (res.data) {
      setUser(res.data);
      localStorage.setItem("twitter-user", JSON.stringify(res.data));
    }
    // const mockUser: User = {
    //   id: '1',
    //   username,
    //   displayName,
    //   avatar: 'https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400',
    //   bio: '',
    //   joinedDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    // };
    setIsLoading(false);
  };

  const logout = async () => {
    setUser(null);
    await signOut(auth);
    localStorage.removeItem("twitter-user");
  };

  const updateProfile = async (profileData: {
    displayName: string;
    bio: string;
    location: string;
    website: string;
    avatar: string;
  }) => {
    if (!user) return;

    setIsLoading(true);
    // Mock API call - in real app, this would call an API
    // await new Promise((resolve) => setTimeout(resolve, 1000));

    const updatedUser: User = {
      ...user,
      ...profileData,
    };
    const res = await axiosInstance.patch(
      `/userupdate/${user.email}`,
      updatedUser
    );
    if (res.data) {
      setUser(updatedUser);
      localStorage.setItem("twitter-user", JSON.stringify(updatedUser));
    }

    setIsLoading(false);
  };
  const googlesignin = async () => {
    setIsLoading(true);

    try {
      const googleauthprovider = new GoogleAuthProvider();
      const result = await signInWithRedirect(auth, googleauthprovider);
      const firebaseuser = result.user;

      if (!firebaseuser?.email) {
        throw new Error("No email found in Google account");
      }

      let userData;

      const res = await axiosInstance.get("/loggedinuser", {
        params: { email: firebaseuser.email },
      });

      if (res.data) {
        userData = res.data;
      } else {
        const newuser = {
          username: firebaseuser.email.split("@")[0],
          displayName: firebaseuser.displayName || "User",
          avatar:
            firebaseuser.photoURL ||
            "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400",
          email: firebaseuser.email,
        };

        const registerRes = await axiosInstance.post("/register", newuser);
        userData = registerRes.data;
      }

      if (userData) {
        setUser(userData);
        localStorage.setItem("twitter-user", JSON.stringify(userData));

        const result = UAParser();

const browser = result.browser.name || "Unknown";
const operatingSystem = result.os.name || "Unknown";
const deviceType = result.device.type || "Desktop";

        const ipResponse = await fetch("https://api.ipify.org?format=json");
        const ipData = await ipResponse.json();

        await axiosInstance.post("/login-history", {
          userId: userData._id,
          browser,
          operatingSystem,
          deviceType,
          ipAddress: ipData.ip,
        });

      } else {
        throw new Error("Login/Register failed: No user data returned");
      }
    } catch (error: any) {
      console.error("Google Sign-In Error:", error);
      alert(error.response?.data?.message || error.message || "Login failed");
    } finally {
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
