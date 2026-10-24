import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useUser } from "@clerk/react";
import { translations, AppTranslations } from "@/lib/translations";
import { readLocalStorage, writeLocalStorage } from "@/lib/browser-storage";

export interface IndianLanguage {
  code: string;
  name: string;
  nativeName: string;
  sttCode: string;
  aiName: string;
}

export const INDIAN_LANGUAGES: IndianLanguage[] = [
  { code: "en",  name: "English",   nativeName: "English",          sttCode: "en-IN",  aiName: "English" },
  { code: "hi",  name: "Hindi",     nativeName: "हिंदी",             sttCode: "hi-IN",  aiName: "Hindi" },
  { code: "bn",  name: "Bengali",   nativeName: "বাংলা",              sttCode: "bn-IN",  aiName: "Bengali" },
  { code: "as",  name: "Assamese",  nativeName: "অসমীয়া",            sttCode: "as-IN",  aiName: "Assamese" },
  { code: "gu",  name: "Gujarati",  nativeName: "ગુજરાતી",           sttCode: "gu-IN",  aiName: "Gujarati" },
  { code: "kn",  name: "Kannada",   nativeName: "ಕನ್ನಡ",              sttCode: "kn-IN",  aiName: "Kannada" },
  { code: "ml",  name: "Malayalam", nativeName: "മലയാളം",             sttCode: "ml-IN",  aiName: "Malayalam" },
  { code: "mr",  name: "Marathi",   nativeName: "मराठी",              sttCode: "mr-IN",  aiName: "Marathi" },
  { code: "ne",  name: "Nepali",    nativeName: "नेपाली",             sttCode: "ne-IN",  aiName: "Nepali" },
  { code: "or",  name: "Odia",      nativeName: "ଓଡ଼ିଆ",              sttCode: "or-IN",  aiName: "Odia" },
  { code: "pa",  name: "Punjabi",   nativeName: "ਪੰਜਾਬੀ",             sttCode: "pa-IN",  aiName: "Punjabi" },
  { code: "ta",  name: "Tamil",     nativeName: "தமிழ்",               sttCode: "ta-IN",  aiName: "Tamil" },
  { code: "te",  name: "Telugu",    nativeName: "తెలుగు",              sttCode: "te-IN",  aiName: "Telugu" },
  { code: "ur",  name: "Urdu",      nativeName: "اُردُو",              sttCode: "ur-IN",  aiName: "Urdu" },
  { code: "mni", name: "Manipuri",  nativeName: "ꯃꯤꯇꯩ ꯂꯣꯟ",           sttCode: "mni-IN", aiName: "Meitei (Manipuri)" },
  { code: "ks",  name: "Kashmiri",  nativeName: "کٲشُر",              sttCode: "ks-IN",  aiName: "Kashmiri" },
  { code: "mai", name: "Maithili",  nativeName: "मैथिली",             sttCode: "hi-IN",  aiName: "Maithili" },
  { code: "kok", name: "Konkani",   nativeName: "कोंकणी",             sttCode: "mr-IN",  aiName: "Konkani" },
  { code: "doi", name: "Dogri",     nativeName: "डोगरी",              sttCode: "hi-IN",  aiName: "Dogri" },
  { code: "brx", name: "Bodo",      nativeName: "बड़ो",               sttCode: "brx-IN", aiName: "Bodo" },
  { code: "sat", name: "Santali",   nativeName: "ᱥᱟᱱᱛᱟᱲᱤ",           sttCode: "sat-IN", aiName: "Santali" },
  { code: "sd",  name: "Sindhi",    nativeName: "سنڌي",               sttCode: "ur-IN",  aiName: "Sindhi" },
  { code: "sa",  name: "Sanskrit",  nativeName: "संस्कृतम्",           sttCode: "hi-IN",  aiName: "Sanskrit" },
];

const getValidCode = (code: string | null | undefined): string | null => {
  if (!code) return null;
  return INDIAN_LANGUAGES.some((l) => l.code === code) ? code : null;
};

interface LanguageContextValue {
  language: IndianLanguage;
  setLanguageCode: (code: string) => void;
  languages: IndianLanguage[];
}

const LanguageContext = createContext<LanguageContextValue>({
  language: INDIAN_LANGUAGES[0],
  setLanguageCode: () => {},
  languages: INDIAN_LANGUAGES,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const userId = user?.id;

  const [langCode, setLangCode] = useState<string>(() => {
    const defaultCode = getValidCode(readLocalStorage("sushruth_lang_default")) ?? "en";
    if (userId) {
      const userCode = getValidCode(readLocalStorage(`sushruth_lang_${userId}`));
      if (userCode) return userCode;

      writeLocalStorage(`sushruth_lang_${userId}`, defaultCode);
      return defaultCode;
    }
    return defaultCode;
  });

  useEffect(() => {
    if (userId) {
      const defaultCode = getValidCode(readLocalStorage("sushruth_lang_default")) ?? "en";
      const userCode = getValidCode(readLocalStorage(`sushruth_lang_${userId}`));

      if (!userCode) {
        writeLocalStorage(`sushruth_lang_${userId}`, defaultCode);
        setLangCode(defaultCode);
      } else {
        setLangCode(userCode);
      }
    } else {
      const defaultCode = getValidCode(readLocalStorage("sushruth_lang_default")) ?? "en";
      setLangCode(defaultCode);
    }
  }, [userId]);

  useEffect(() => {
    document.documentElement.lang = langCode;
    document.documentElement.dir = ["ur", "ks", "sd"].includes(langCode) ? "rtl" : "ltr";
  }, [langCode]);

  const setLanguageCode = useCallback((code: string) => {
    const validCode = getValidCode(code) ?? "en";
    setLangCode(validCode);

    if (userId) {
      writeLocalStorage(`sushruth_lang_${userId}`, validCode);
    }
    // Always keep default updated so it carries over if user logs out
    writeLocalStorage("sushruth_lang_default", validCode);
  }, [userId]);

  const language = INDIAN_LANGUAGES.find((l) => l.code === langCode) ?? INDIAN_LANGUAGES[0];

  return (
    <LanguageContext.Provider value={{ language, setLanguageCode, languages: INDIAN_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useTranslation(): AppTranslations {
  const { language } = useLanguage();
  return translations[language.code] ?? translations.en;
}
