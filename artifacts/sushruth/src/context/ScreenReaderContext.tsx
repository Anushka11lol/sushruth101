import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { translatePreConsultation } from "@/lib/preConsultationTranslations";

interface ScreenReaderContextValue {
  isEnabled: boolean;
  toggle: () => void;
  speak: (text: string) => void;
  speakAi: (text: string) => void;
  readPage: () => void;
  stop: () => void;
  languageCode: string;
}

const ScreenReaderContext = createContext<ScreenReaderContextValue | null>(null);

const STORAGE_KEY = "sushruth-screen-reader";

export function ScreenReaderProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const audioCacheRef = useRef(new Map<string, string>());
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  const stop = useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const speak = useCallback(
    (text: string) => {
      const normalized = text.replace(/\s+/g, " ").trim().slice(0, 500);
      if (!isEnabled || !normalized) return;
      stop();
      if (!("speechSynthesis" in window)) return;
      const utterance = new SpeechSynthesisUtterance(normalized);
      utterance.lang = language.sttCode;
      const languagePrefix = language.sttCode.toLowerCase().split("-")[0];
      const voices = window.speechSynthesis.getVoices();
      utterance.voice =
        voices.find((voice) => voice.lang.toLowerCase() === language.sttCode.toLowerCase()) ??
        voices.find((voice) => voice.lang.toLowerCase().split("-")[0] === languagePrefix) ??
        null;
      window.speechSynthesis.speak(utterance);
    },
    [isEnabled, language.sttCode, stop],
  );

  const speakAi = useCallback(
    (text: string) => {
      const normalized = text.replace(/\s+/g, " ").trim().slice(0, 500);
      if (!isEnabled || !normalized) return;
      stop();
      const cacheKey = `${language.code}:${normalized}`;
      const play = (source: string) => {
        const audio = new Audio(source);
        audioRef.current = audio;
        void audio.play().catch(() => {});
      };
      const cached = audioCacheRef.current.get(cacheKey);
      if (cached) {
        play(cached);
        return;
      }
      const controller = new AbortController();
      requestRef.current = controller;
      void fetch("/api/screen-reader/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: normalized, language: language.code }),
        signal: controller.signal,
      })
        .then((response) => {
          if (!response.ok) throw new Error("Speech generation failed");
          return response.blob();
        })
        .then((blob) => {
          if (controller.signal.aborted) return;
          const source = URL.createObjectURL(blob);
          const cache = audioCacheRef.current;
          cache.set(cacheKey, source);
          if (cache.size > 40) {
            const oldest = cache.entries().next().value as [string, string] | undefined;
            if (oldest) {
              URL.revokeObjectURL(oldest[1]);
              cache.delete(oldest[0]);
            }
          }
          play(source);
        })
        .catch((error: unknown) => {
          if (!(error instanceof DOMException && error.name === "AbortError")) {
            // The visual interface remains usable if audio generation is unavailable.
          }
        });
    },
    [isEnabled, language.code, stop],
  );

  const readPage = useCallback(() => {
    if (!isEnabled) return;
    const main = document.getElementById("main-content");
    if (!main) return;
    const selectors = "h1, h2, h3, [data-sr-description], main p, [role='alert']";
    const seen = new Set<string>();
    const sections = Array.from(main.querySelectorAll<HTMLElement>(selectors))
      .filter((element) => element.offsetParent !== null)
      .map((element) => element.dataset.srDescription?.trim() || element.innerText.replace(/\s+/g, " ").trim())
      .filter((text) => text && text.length <= 500 && !seen.has(text) && seen.add(text))
      .slice(0, 30);
    const text = sections.join(". ");
    if (/\/pre-consultation(?:\/|$)/.test(window.location.pathname)) speakAi(text);
    else speak(text);
  }, [isEnabled, speak, speakAi]);

  useEffect(() => {
    if (!isEnabled) return;
    const announcement = translatePreConsultation(
      language.code,
      "Screen reader enabled. I will now read the name of every button, link, and menu item you hover over or focus with the Tab key.",
    );
    if (/\/pre-consultation(?:\/|$)/.test(window.location.pathname)) speakAi(announcement);
    else speak(announcement);
    return stop;
  }, [isEnabled, language.code, speak, speakAi, stop]);

  const toggle = useCallback(() => {
    setIsEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {}
      if (!next) stop();
      return next;
    });
  }, [stop]);

  useEffect(() => {
    return () => {
      stop();
      for (const source of audioCacheRef.current.values()) URL.revokeObjectURL(source);
      audioCacheRef.current.clear();
    };
  }, [stop]);

  return (
    <ScreenReaderContext.Provider value={{ isEnabled, toggle, speak, speakAi, readPage, stop, languageCode: language.code }}>
      {children}
    </ScreenReaderContext.Provider>
  );
}

export function useScreenReader() {
  const ctx = useContext(ScreenReaderContext);
  if (!ctx) throw new Error("useScreenReader must be used within ScreenReaderProvider");
  return ctx;
}
