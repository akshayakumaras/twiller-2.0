import { useAuth } from "@/context/AuthContext";
import React, { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Image, Smile, Calendar, MapPin, BarChart3, Globe, Mic, Upload, X } from "lucide-react";
import { Separator } from "./ui/separator";
import axios from "axios";
import axiosInstance from "@/lib/axiosInstance";
import {
  requestNotificationPermission,
  showKeywordNotification,
} from "@/utils/notification";
const TweetComposer = ({ onTweetPosted }: any) => {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [imageurl, setimageurl] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState("");

  const [showAudioModal, setShowAudioModal] = useState(false);

  const [audioOTP, setAudioOTP] = useState("");
  const [audioOTPVerified, setAudioOTPVerified] = useState(false);

  const [audioOtpLoading, setAudioOtpLoading] = useState(false);
  const [audioMessage, setAudioMessage] = useState("");
  const maxLength = 200;
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] =
    useState<MediaRecorder | null>(null);
  const [recordedAudio, setRecordedAudio] = useState<File | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingTimer, setRecordingTimer] =
    useState<NodeJS.Timeout | null>(null);
  const handleAudioSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    // Maximum 100 MB
    const maxSize = 100 * 1024 * 1024;

    if (file.size > maxSize) {
      setAudioMessage(
        "Audio file must not exceed 100 MB."
      );
      return;
    }

    // Check that it is an audio file
    if (!file.type.startsWith("audio/")) {
      setAudioMessage(
        "Please select a valid audio file."
      );
      return;
    }

    const audio = document.createElement("audio");

    audio.preload = "metadata";

    audio.onloadedmetadata = () => {
      window.URL.revokeObjectURL(audio.src);

      const duration = audio.duration;

      // Maximum 5 minutes
      if (duration > 5 * 60) {
        setAudioMessage(
          "Audio duration cannot exceed 5 minutes."
        );

        setAudioFile(null);
        setAudioDuration(0);
        return;
      }

      setAudioFile(file);
      setAudioDuration(duration);
      setAudioMessage("");
    };

    audio.onerror = () => {
      setAudioMessage(
        "Unable to read the audio file."
      );
    };

    audio.src = URL.createObjectURL(file);
  };

  const checkAudioTime = () => {
    const now = new Date();

    const istTime = new Date(
      now.toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      })
    );

    const hours = istTime.getHours();

    return hours >= 14 && hours < 19;
  };

  const sendAudioOTP = async () => {
    if (!user?.email) {
      setAudioMessage(
        "Registered email address not found."
      );
      return;
    }

    try {
      setAudioOtpLoading(true);
      setAudioMessage("");

      await axiosInstance.post(
        "/send-audio-otp",
        {
          email: user.email,
        }
      );

      setAudioMessage(
        "OTP sent to your registered email."
      );
    } catch (error: any) {
      console.error(error);

      setAudioMessage(
        error.response?.data?.message ||
        "Failed to send OTP."
      );
    } finally {
      setAudioOtpLoading(false);
    }
  };

  const verifyAudioOTP = async () => {
    if (!user?.email) return;

    if (!audioFile) {
      setAudioMessage("Please select an audio file.");
      return;
    }

    if (audioOTP.length !== 6) {
      setAudioMessage("Please enter the 6-digit OTP.");
      return;
    }

    // Check 2 PM - 7 PM IST
    if (!checkAudioTime()) {
      setAudioMessage(
        "Audio tweets are allowed only between 2:00 PM and 7:00 PM IST."
      );
      return;
    }

    try {
      setAudioOtpLoading(true);
      setAudioMessage("");

      // Verify OTP
      await axiosInstance.post("/verify-audio-otp", {
        email: user.email,
        otp: audioOTP,
      });

      setAudioOTPVerified(true);

      // Upload audio
      const formData = new FormData();
      formData.append("audio", audioFile);

      const uploadResponse = await axiosInstance.post(
        "/upload-audio",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      const uploadedAudioUrl = uploadResponse.data.audioUrl;

      setAudioUrl(uploadedAudioUrl);

      // Create audio tweet
      const tweetData = {
        author: user._id,
        content: content.trim() || "Audio Tweet",
        audio: uploadedAudioUrl,
      };

      const tweetResponse = await axiosInstance.post(
        "/post",
        tweetData
      );

      onTweetPosted(tweetResponse.data);

      setAudioMessage("Audio tweet posted successfully.");

      // Reset
      setAudioFile(null);
      setAudioOTP("");
      setAudioDuration(0);

      setTimeout(() => {
        setShowAudioModal(false);
        setAudioOTPVerified(false);
        setAudioMessage("");
      }, 1500);

    } catch (error: any) {
      console.error("Audio tweet error:", error);

      setAudioMessage(
        error.response?.data?.message ||
        "Failed to verify or upload audio."
      );
    } finally {
      setAudioOtpLoading(false);
    }
  };


  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!user || !content.trim()) return
    try {
      const tweetdata = {
        author: user?._id,
        content,
        image: imageurl
      }
      const res = await axiosInstance.post("/post", tweetdata);


      showKeywordNotification(content);

      onTweetPosted(res.data);

      setContent("");
      setimageurl("");
    } catch (error) {
      console.log(error)
    } finally {
      setIsLoading(false)
    }
  };

  const startRecording = async () => {
    try {
      if (!checkAudioTime()) {
        setAudioMessage(
          "Audio tweets are allowed only between 2:00 PM and 7:00 PM IST."
        );
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const recorder = new MediaRecorder(stream);

      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, {
          type: "audio/webm",
        });

        const file = new File(
          [blob],
          `audio-tweet-${Date.now()}.webm`,
          {
            type: "audio/webm",
          }
        );

        setRecordedAudio(file);
        setAudioFile(file);
        setAudioMessage(
          "Recording completed. Please verify your email OTP."
        );

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();

      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);

      const timer = setInterval(() => {
        setRecordingTime((previous) => {
          if (previous >= 300) {
            recorder.stop();
            clearInterval(timer);
            setIsRecording(false);
            return 300;
          }

          return previous + 1;
        });
      }, 1000);

      setRecordingTimer(timer);

    } catch (error) {
      console.error("Recording error:", error);

      setAudioMessage(
        "Microphone permission is required to record audio."
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }

    if (recordingTimer) {
      clearInterval(recordingTimer);
      setRecordingTimer(null);
    }

    setIsRecording(false);
  };

  const characterCount = content.length;
  const isOverLimit = characterCount > maxLength;
  const isNearLimit = characterCount > maxLength * 0.8;
  if (!user) return null;
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsLoading(true);
    const image = e.target.files[0];
    const formdataimg = new FormData();
    formdataimg.set("image", image);
    try {
      const res = await axios.post(
        "https://api.imgbb.com/1/upload?key=97f3fb960c3520d6a88d7e29679cf96f",
        formdataimg
      );
      const url = res.data.data.display_url;
      if (url) {
        setimageurl(url);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Card className="bg-black border-gray-800 border-x-0 border-t-0 rounded-none">
      <CardContent className="p-4">
        <div className="flex space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar} alt={user.displayName} />
            <AvatarFallback>{user.displayName[0]}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <form onSubmit={handleSubmit}>
              <Textarea
                placeholder="What's happening?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="bg-transparent border-none text-xl text-white placeholder-gray-500 resize-none min-h-[120px] focus-visible:ring-0 focus-visible:ring-offset-0"
              />

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-4 text-blue-400">
                  <label
                    htmlFor="tweetImage"
                    className="p-2 rounded-full hover:bg-blue-900/20 cursor-pointer"
                  >
                    <Image className="h-5 w-5" />
                    <input
                      type="file"
                      accept="image/*"
                      id="tweetImage"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={isLoading}
                    />
                  </label>
                  <div className="flex items-center space-x-4 text-blue-400">
                    /</div>
                  {/* Image upload */}

                  {/* Audio Tweet */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowAudioModal(true);
                      setAudioMessage("");
                      setAudioFile(null);
                      setAudioDuration(0);
                    }}
                    className="p-2 rounded-full hover:bg-blue-900/20"
                    title="Audio Tweet"
                  >
                    <Mic className="h-5 w-5" />
                  </button>

                  {/* Other buttons */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 rounded-full hover:bg-blue-900/20"
                  >
                    <BarChart3 className="h-5 w-5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 rounded-full hover:bg-blue-900/20"
                  >
                    <BarChart3 className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 rounded-full hover:bg-blue-900/20"
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 rounded-full hover:bg-blue-900/20"
                  >
                    <Calendar className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-2 rounded-full hover:bg-blue-900/20"
                  >
                    <MapPin className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-blue-400 font-semibold">
                      Everyone can reply
                    </span>
                  </div>
                  <div className="flex items-center space-x-3">
                    {characterCount > 0 && (
                      <div className="flex items-center space-x-2">
                        <div className="relative w-8 h-8">
                          <svg className="w-8 h-8 transform -rotate-90">
                            <circle
                              cx="16"
                              cy="16"
                              r="14"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                              className="text-gray-700"
                            />
                            <circle
                              cx="16"
                              cy="16"
                              r="14"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 14}`}
                              strokeDashoffset={`${2 *
                                Math.PI *
                                14 *
                                (1 - characterCount / maxLength)
                                }`}
                              className={
                                isOverLimit
                                  ? "text-red-500"
                                  : isNearLimit
                                    ? "text-yellow-500"
                                    : "text-blue-500"
                              }
                            />
                          </svg>
                        </div>
                        {isNearLimit && (
                          <span
                            className={`text-sm ${isOverLimit ? "text-red-500" : "text-yellow-500"
                              }`}
                          >
                            {maxLength - characterCount}
                          </span>
                        )}
                      </div>
                    )}
                    <Separator
                      orientation="vertical"
                      className="h-6 bg-gray-700"
                    />

                    <Button
                      type="submit"
                      disabled={!content.trim() || isOverLimit || isLoading}
                      className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-full px-6"
                    >
                      Post
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </CardContent>
      {showAudioModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4">
          <div className="w-full max-w-md rounded-xl border border-gray-700 bg-black p-6">

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">
                Audio Tweet Verification
              </h2>

              <label
                htmlFor="audioFileUpload"
                className="mt-2 block w-full rounded-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 text-center cursor-pointer"
              >
                📁 Upload Audio File
              </label>

              <input
                id="audioFileUpload"
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  handleAudioSelect(e);
                }}
              />

              <button
                type="button"
                onClick={() => {
                  setShowAudioModal(false);
                  setAudioOTP("");
                  setAudioMessage("");
                  setAudioOTPVerified(false);
                  setAudioFile(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-400 mb-4">
              Before uploading an audio tweet, verify
              your registered email address using OTP.
            </p>

            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-full rounded-full ${isRecording
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-500 hover:bg-blue-600"
                } text-white font-semibold py-3`}
            >
              {isRecording
                ? `⏹ Stop Recording (${Math.floor(recordingTime / 60)}:${(
                  recordingTime % 60
                )
                  .toString()
                  .padStart(2, "0")})`
                : "🎙️ Record Voice"}
            </button>

            <button
              type="button"
              onClick={sendAudioOTP}
              disabled={audioOtpLoading}
              className="w-full rounded-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 disabled:opacity-50"
            >
              {audioOtpLoading
                ? "Sending OTP..."
                : "Send Email OTP"}
            </button>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              value={audioOTP}
              onChange={(e) =>
                setAudioOTP(
                  e.target.value.replace(/\D/g, "")
                )
              }
              className="mt-4 w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-white"
            />

            <button
              type="button"
              onClick={verifyAudioOTP}
              disabled={
                audioOtpLoading ||
                audioOTP.length !== 6 ||
                audioOTPVerified

              }
              className="mt-3 w-full rounded-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 disabled:opacity-50"
            >
              {audioOtpLoading
                ? "Verifying..."
                : "Verify OTP"}
            </button>

            {audioFile && (
              <div className="mt-4 rounded-lg border border-gray-700 p-3">
                <p className="text-white font-medium">
                  {audioFile.name}
                </p>

                <p className="text-sm text-gray-400">
                  Size:{" "}
                  {(audioFile.size / (1024 * 1024)).toFixed(2)}
                  {" MB"}
                </p>

                <p className="text-sm text-gray-400">
                  Duration:{" "}
                  {Math.floor(audioDuration / 60)}:
                  {Math.floor(audioDuration % 60)
                    .toString()
                    .padStart(2, "0")}
                </p>
              </div>
            )}

            {audioOTPVerified && (
              <p className="mt-4 text-sm text-green-400">
                ✓ Email OTP verified successfully.
              </p>
            )}

            {audioMessage && (
              <p className="mt-4 text-center text-sm text-gray-300">
                {audioMessage}
              </p>
            )}
          </div>
        </div>
      )
      }
    </Card >
  );
};

export default TweetComposer;
