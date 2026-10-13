"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

export type Language =
  | "en"
  | "es"
  | "hi"
  | "pt"
  | "zh"
  | "fr";

interface LanguageContextType {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

const translations: Record<Language, Record<string, string>> = {
  en: {
    home: "Home",
    explore: "Explore",
    notifications: "Notifications",
    messages: "Messages",
    bookmarks: "Bookmarks",
    profile: "Profile",
    more: "More",
    post: "Post",
    forYou: "For you",
    following: "Following",
    whatsHappening: "What's happening?",
    settings: "Settings",
    logout: "Log out",

    language: "Language",
    selectLanguage: "Select your preferred language.",

    browserNotifications: "Browser Notifications",
    notificationDescription:
      'Notify me when tweets contain "cricket" or "science".',

    on: "ON",
    off: "OFF",

    posts: "Posts",
    replies: "Replies",
    highlights: "Highlights",
    articles: "Articles",
    media: "Media",

    editProfile: "Edit profile",
    joined: "Joined",
  },

  es: {
    home: "Inicio",
    explore: "Explorar",
    notifications: "Notificaciones",
    messages: "Mensajes",
    bookmarks: "Marcadores",
    profile: "Perfil",
    more: "Más",
    post: "Publicar",
    forYou: "Para ti",
    following: "Siguiendo",
    whatsHappening: "¿Qué está pasando?",
    settings: "Configuración",
    logout: "Cerrar sesión",

    language: "Idioma",
    selectLanguage: "Selecciona tu idioma preferido.",

    browserNotifications: "Notificaciones del navegador",
    notificationDescription:
      'Notificarme cuando los tweets contengan "cricket" o "science".',

    on: "ACTIVADO",
    off: "DESACTIVADO",

    posts: "Publicaciones",
    replies: "Respuestas",
    highlights: "Destacados",
    articles: "Artículos",
    media: "Multimedia",

    editProfile: "Editar perfil",
    joined: "Se unió",
  },

  hi: {
    home: "होम",
    explore: "एक्सप्लोर",
    notifications: "सूचनाएं",
    messages: "संदेश",
    bookmarks: "बुकमार्क",
    profile: "प्रोफ़ाइल",
    more: "अधिक",
    post: "पोस्ट",
    forYou: "आपके लिए",
    following: "फ़ॉलो कर रहे हैं",
    whatsHappening: "क्या हो रहा है?",
    settings: "सेटिंग्स",
    logout: "लॉग आउट",

    language: "भाषा",
    selectLanguage: "अपनी पसंदीदा भाषा चुनें।",

    browserNotifications: "ब्राउज़र सूचनाएं",
    notificationDescription:
      'जब ट्वीट में "cricket" या "science" हो तो मुझे सूचित करें।',

    on: "चालू",
    off: "बंद",

    posts: "पोस्ट",
    replies: "जवाब",
    highlights: "हाइलाइट्स",
    articles: "लेख",
    media: "मीडिया",

    editProfile: "प्रोफ़ाइल संपादित करें",
    joined: "शामिल हुए",
  },

  pt: {
    home: "Início",
    explore: "Explorar",
    notifications: "Notificações",
    messages: "Mensagens",
    bookmarks: "Marcadores",
    profile: "Perfil",
    more: "Mais",
    post: "Publicar",
    forYou: "Para você",
    following: "Seguindo",
    whatsHappening: "O que está acontecendo?",
    settings: "Configurações",
    logout: "Sair",

    language: "Idioma",
    selectLanguage: "Selecione seu idioma preferido.",

    browserNotifications: "Notificações do navegador",
    notificationDescription:
      'Notifique-me quando os tweets contiverem "cricket" ou "science".',

    on: "ATIVADO",
    off: "DESATIVADO",

    posts: "Posts",
    replies: "Respostas",
    highlights: "Destaques",
    articles: "Artigos",
    media: "Mídia",

    editProfile: "Editar perfil",
    joined: "Entrou em",
  },

  zh: {
    home: "首页",
    explore: "探索",
    notifications: "通知",
    messages: "消息",
    bookmarks: "书签",
    profile: "个人资料",
    more: "更多",
    post: "发布",
    forYou: "为你推荐",
    following: "关注",
    whatsHappening: "有什么新鲜事？",
    settings: "设置",
    logout: "退出登录",

    language: "语言",
    selectLanguage: "选择您的首选语言。",

    browserNotifications: "浏览器通知",
    notificationDescription:
      '当推文包含“cricket”或“science”时通知我。',

    on: "开启",
    off: "关闭",

    posts: "帖子",
    replies: "回复",
    highlights: "精选",
    articles: "文章",
    media: "媒体",

    editProfile: "编辑个人资料",
    joined: "加入于",
  },

  fr: {
    home: "Accueil",
    explore: "Explorer",
    notifications: "Notifications",
    messages: "Messages",
    bookmarks: "Signets",
    profile: "Profil",
    more: "Plus",
    post: "Publier",
    forYou: "Pour vous",
    following: "Abonnements",
    whatsHappening: "Quoi de neuf ?",
    settings: "Paramètres",
    logout: "Se déconnecter",

    language: "Langue",
    selectLanguage: "Sélectionnez votre langue préférée.",

    browserNotifications: "Notifications du navigateur",
    notificationDescription:
      'M’avertir lorsque les tweets contiennent « cricket » ou « science ».',

    on: "ACTIVÉ",
    off: "DÉSACTIVÉ",

    posts: "Publications",
    replies: "Réponses",
    highlights: "À la une",
    articles: "Articles",
    media: "Médias",

    editProfile: "Modifier le profil",
    joined: "A rejoint",
  },
};

export const LanguageProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const savedLanguage = localStorage.getItem(
      "twiller-language"
    ) as Language | null;

    if (
      savedLanguage &&
      ["en", "es", "hi", "pt", "zh", "fr"].includes(savedLanguage)
    ) {
      setLanguageState(savedLanguage);
    }
  }, []);

  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
    localStorage.setItem("twiller-language", newLanguage);
  };

  const t = (key: string) => {
    return translations[language][key] || translations.en[key] || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider"
    );
  }

  return context;
};