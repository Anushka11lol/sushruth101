import { useState } from "react";
import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { HeartPulse, CheckCircle2 } from "lucide-react";
import { INDIAN_LANGUAGES } from "@/context/LanguageContext";
import { useLanguage } from "@/context/LanguageContext";

const LANG_COLORS = [
  "from-teal-50 to-teal-100 border-teal-200 hover:border-teal-400",
  "from-blue-50 to-blue-100 border-blue-200 hover:border-blue-400",
  "from-purple-50 to-purple-100 border-purple-200 hover:border-purple-400",
  "from-amber-50 to-amber-100 border-amber-200 hover:border-amber-400",
  "from-rose-50 to-rose-100 border-rose-200 hover:border-rose-400",
  "from-emerald-50 to-emerald-100 border-emerald-200 hover:border-emerald-400",
  "from-indigo-50 to-indigo-100 border-indigo-200 hover:border-indigo-400",
  "from-orange-50 to-orange-100 border-orange-200 hover:border-orange-400",
];

export default function LanguageSelectPage() {
  const { user } = useUser();
  const [, navigate] = useLocation();
  const { setLanguageCode } = useLanguage();
  const userId = user?.id ?? "";

  const [selected, setSelected] = useState<string>("en");

  const handleContinue = () => {
    if (!userId) return;
    setLanguageCode(selected);
    localStorage.setItem(`sushruth_lang_${userId}`, selected);
    localStorage.setItem(`sushruth_onboarding_done_${userId}`, "1");
    navigate("/dashboard");
  };

  const selectedLang = INDIAN_LANGUAGES.find((l) => l.code === selected);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50 flex flex-col items-center justify-start px-4 py-10 overflow-y-auto">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-2 justify-center mb-2">
          <HeartPulse className="h-7 w-7 text-teal-600" aria-hidden="true" />
          <span className="text-xl font-bold text-teal-700">Sushruth</span>
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-foreground">Choose your language</h1>
          <p className="text-muted-foreground text-sm">
            Sushruth will communicate with you in your preferred language. You can change this anytime in settings.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {INDIAN_LANGUAGES.map((lang, i) => {
            const isSelected = selected === lang.code;
            const colorClass = LANG_COLORS[i % LANG_COLORS.length];
            return (
              <button
                key={lang.code}
                onClick={() => setSelected(lang.code)}
                className={`relative rounded-xl border-2 p-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 bg-gradient-to-br ${colorClass} ${
                  isSelected
                    ? "border-teal-500 ring-2 ring-teal-500/20 shadow-md"
                    : ""
                }`}
                aria-pressed={isSelected}
              >
                {isSelected && (
                  <CheckCircle2
                    className="absolute top-2 right-2 h-4 w-4 text-teal-600"
                    aria-hidden="true"
                  />
                )}
                <p className="text-base font-bold text-foreground leading-tight">{lang.nativeName}</p>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">{lang.name}</p>
              </button>
            );
          })}
        </div>

        <div className="sticky bottom-4 pt-2">
          <Button
            className="w-full text-base py-6 shadow-lg"
            onClick={handleContinue}
            disabled={!selected}
          >
            {selectedLang ? `Continue in ${selectedLang.name}` : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
