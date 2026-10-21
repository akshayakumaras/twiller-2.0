const KEYWORD_PATTERN = /\b(cricket|science)\b/i;

export const requestNotificationPermission = async () => {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
};

export const areNotificationsEnabled = () =>
  typeof window !== "undefined" &&
  localStorage.getItem("notificationsEnabled") === "true";

export const setNotificationsEnabled = async (enabled: boolean) => {
  if (typeof window === "undefined") return false;
  if (enabled) {
    const permission = await requestNotificationPermission();
    if (permission !== "granted") return false;
    localStorage.setItem("notificationsEnabled", "true");
    return true;
  }
  localStorage.setItem("notificationsEnabled", "false");
  return true;
};

export const showKeywordNotification = (
  tweetText: string,
  options: { author?: string; tweetId?: string } = {}
) => {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (!areNotificationsEnabled() || Notification.permission !== "granted") return;
  if (!KEYWORD_PATTERN.test(tweetText || "")) return;

  const notification = new Notification(
    options.author ? `New tweet from ${options.author}` : "New Tweet Alert",
    {
      body: tweetText,
      tag: options.tweetId ? `twiller-tweet-${options.tweetId}` : undefined,
    }
  );
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
};
