export const requestNotificationPermission = async () => {
  if (typeof window === "undefined") return;

  if (!("Notification" in window)) {
    console.log("Notifications are not supported");
    return;
  }

  if (Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    console.log("Notification permission:", permission);
  }
};

export const showKeywordNotification = (tweet: string) => {
  if (typeof window === "undefined") return;

  const enabled =
    localStorage.getItem("notificationsEnabled") === "true";

  if (!enabled) {
    console.log("Notifications are disabled");
    return;
  }

  if (!("Notification" in window)) {
    console.log("Notifications not supported");
    return;
  }

  if (Notification.permission !== "granted") {
    console.log("Notification permission not granted");
    return;
  }

  const text = tweet.toLowerCase();

  if (text.includes("cricket") || text.includes("science")) {
    new Notification("🔔 New Tweet Alert", {
      body: tweet,
    });
  }
};