import { setNotificationsEnabled as saveNotificationPreference } from "@/utils/notification";
"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Link as LinkIcon,
  MoreHorizontal,
  Camera,
  Settings,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import TweetCard from "./TweetCard";
import { Card, CardContent } from "./ui/card";
import Editprofile from "./Editprofile";
import axiosInstance from "@/lib/axiosInstance";
import LanguageSelector from "./LanguageSelector";
import { useLanguage } from "@/context/LanguageContext";

export default function ProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("posts");
  const [showEditModal, setShowEditModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
const [preferenceLoaded, setPreferenceLoaded] = useState(false);
    const { t } = useLanguage();

  const [loginHistory, setLoginHistory] = useState<any[]>([]);

  if (!user) return null;
  const [tweets, setTweets] = useState<any>([]);
  const [loading, setloading] = useState(false);
  const fetchTweets = async () => {
    try {
      setloading(true);
      const res = await axiosInstance.get("/post");
      setTweets(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setloading(false);
    }
  };
  const toggleNotifications = async () => {
  const newValue = !notificationsEnabled;

  // Update the UI and save the preference
  setNotificationsEnabled(newValue);
  localStorage.setItem("notificationsEnabled", String(newValue));

  // Ask permission only when the user turns notifications ON
  if (
    newValue &&
    "Notification" in window &&
    Notification.permission === "default"
  ) {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("Browser notification permission was not granted.");
    }
  }
};
 // Load the saved notification preference once
useEffect(() => {
  const savedPreference =
    localStorage.getItem("notificationsEnabled") === "true";

  setNotificationsEnabled(savedPreference);
  setPreferenceLoaded(true);
}, []);

// Fetch tweets and login history when the user changes
useEffect(() => {
  if (!user) return;

  fetchTweets();

  if (user._id) {
    axiosInstance
      .get(`/login-history/${user._id}`)
      .then((res) => {
        setLoginHistory(res.data);
      })
      .catch((err) => {
        console.error("Failed to fetch login history:", err);
      });
  }
}, [user]);
  // Filter tweets by current user
  const userTweets = tweets.filter((tweet: any) => tweet.author._id === user._id);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="sticky top-0 bg-black/90 backdrop-blur-md border-b border-gray-800 z-10">
        <div className="flex items-center px-4 py-3 space-x-8">
          <Button
            variant="ghost"
            size="sm"
            className="p-2 rounded-full hover:bg-gray-900"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">{user.displayName}</h1>
            <p className="text-sm text-gray-400">{userTweets.length} posts</p>
          </div>
        </div>
      </div>

      {/* Cover Photo */}
      <div className="relative">
        <div className="h-48 bg-gradient-to-r from-blue-600 to-purple-600 relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70"
          >
            <Camera className="h-5 w-5 text-white" />
          </Button>
        </div>

        {/* Profile Picture */}
        <div className="absolute -bottom-16 left-4">
          <div className="relative">
            <Avatar className="h-32 w-32 border-4 border-black">
              <AvatarImage src={user.avatar} alt={user.displayName} />
              <AvatarFallback className="text-2xl">
                {user.displayName[0]}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="sm"
              className="absolute bottom-2 right-2 p-2 rounded-full bg-black/70 hover:bg-black/90"
            >
              <Camera className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>

        {/* Edit Profile Button */}
        <div className="flex justify-end p-4">
          <Button
            variant="outline"
            className="border-gray-600 text-white bg-gray-950 font-semibold rounded-full px-6"
            onClick={() => setShowEditModal(true)}
          >
            Edit profile
          </Button>
        </div>
      </div>

      {/* Profile Info */}
      <div className="px-4 pb-4 mt-12">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {user.displayName}
            </h1>
            <p className="text-gray-400">@{user.username}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 rounded-full hover:bg-gray-900"
          >
            <MoreHorizontal className="h-5 w-5 text-gray-400" />
          </Button>
        </div>

        {user.bio && (
          <p className="text-white mb-3 leading-relaxed">{user.bio}</p>
        )}

        <div className="flex items-center space-x-4 text-gray-400 text-sm mb-3">
          <div className="flex items-center space-x-1">
            <MapPin className="h-4 w-4" />
            <span>{user.location ? user.location : "Earth"}</span>
          </div>
          <div className="flex items-center space-x-1">
            <LinkIcon className="h-4 w-4" />
            <span className="text-blue-400">
              {user.website ? user.website : "example.com"}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>
              Joined{" "}
              {user.joinedDate &&
                new Date(user.joinedDate).toLocaleDateString("en-us", {
                  month: "long",
                  year: "numeric",
                })}
            </span>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border border-gray-700 rounded-lg p-4">
  <div>
    <h3 className="text-white font-semibold">
  {t("browserNotifications")}
</h3>

<p className="text-sm text-gray-400">
  {t("notificationDescription")}
</p>
  </div>

  <Button
    onClick={toggleNotifications}
    disabled={!preferenceLoaded}
    className={
      notificationsEnabled
        ? "bg-green-600 hover:bg-green-700"
        : "bg-gray-600 hover:bg-gray-700"
    }
  >
    {notificationsEnabled ? t("on") : t("off")}

  </Button>
</div>
      </div>

      <div className="mt-4 flex items-center justify-between border border-gray-700 rounded-lg p-4">
  <div>
    <h3 className="text-white font-semibold">
  {t("language")}
</h3>

<p className="text-sm text-gray-400">
  {t("selectLanguage")}
</p>
  </div>

  <LanguageSelector />
</div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-transparent border-b border-gray-800 rounded-none h-auto">
          <TabsTrigger
            value="posts"
            className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold"
          >
            {t("posts")}
          </TabsTrigger>
          <TabsTrigger
            value="replies"
            className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold"
          >
            {t("replies")}
          </TabsTrigger>
          <TabsTrigger
            value="highlights"
            className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold"
          >
            {t("highlights")}
          </TabsTrigger>
          <TabsTrigger
            value="articles"
            className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold"
          >
            {t("articles")}
          </TabsTrigger>
          <TabsTrigger
            value="media"
            className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold"
          >
            {t("media")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-0">
          <div className="divide-y divide-gray-800">
            { loading ? (
              <Card className="bg-black border-none">
                <CardContent className="py-12 text-center">
                  <div className="text-gray-400">
                    <h3 className="text-2xl font-bold mb-2">
                      {t("youHaventPostedYet")}
                    </h3>
                    <p>When you post, it will show up here.</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              userTweets.map((tweet:any) => (
                <TweetCard key={tweet._id} tweet={tweet} />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="replies" className="mt-0">
          <Card className="bg-black border-none">
            <CardContent className="py-12 text-center">
              <div className="text-gray-400">
                <h3 className="text-2xl font-bold mb-2">
                  You haven't replied yet
                </h3>
                <p>When you reply to a post, it will show up here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="highlights" className="mt-0">
          <Card className="bg-black border-none">
            <CardContent className="py-12 text-center">
              <div className="text-gray-400">
                <h3 className="text-2xl font-bold mb-2">
                  Lights, camera … attachments!
                </h3>
                <p>When you post photos or videos, they will show up here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="articles" className="mt-0">
          <Card className="bg-black border-none">
            <CardContent className="py-12 text-center">
              <div className="text-gray-400">
                <h3 className="text-2xl font-bold mb-2">
                  You haven't written any articles
                </h3>
                <p>When you write articles, they will show up here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="media" className="mt-0">
          <Card className="bg-black border-none">
            <CardContent className="py-12 text-center">
              <div className="text-gray-400">
                <h3 className="text-2xl font-bold mb-2">
                  Lights, camera … attachments!
                </h3>
                <p>When you post photos or videos, they will show up here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <div className="mt-8 px-4">
  <h2 className="text-xl font-bold text-white mb-4">
    Login History
  </h2>

  {loginHistory.length === 0 ? (
    <p className="text-gray-400">
      No login history available.
    </p>
  ) : (
    <div className="space-y-3">
      {loginHistory.map((item: any) => (
        <Card
          key={item._id}
          className="bg-black border-gray-700"
        >
          <CardContent className="p-4 text-white">
            <p><strong>Browser:</strong> {item.browser}</p>

            <p><strong>Operating System:</strong> {item.operatingSystem}</p>

            <p><strong>Device:</strong> {item.deviceType}</p>

            <p><strong>IP Address:</strong> {item.ipAddress}</p>

            <p>
              <strong>Login Time:</strong>{" "}
              {new Date(item.loginTime).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )}
</div>
      <Editprofile
        isopen={showEditModal}
        onclose={() => setShowEditModal(false)}
      />
    </div>
  );
}