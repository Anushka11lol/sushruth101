import { ReactNode, useState, useCallback, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { ModeToggle } from "../mode-toggle";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Stethoscope,
  FileText,
  Calendar,
  HeartPulse,
  Activity,
  Users,
  Pill,
  LogOut,
  Menu,
  Keyboard,
  X,
  Volume2,
  VolumeX,
  Shield,
  Settings,
  Languages,
  ClipboardList,
  BookOpenText,
  Baby,
  ScrollText,
  BriefcaseMedical,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useKeyboardNav } from "@/hooks/useKeyboardNav";
import { useSpeakOnInteraction } from "@/hooks/useSpeakOnInteraction";
import { useNavShortcuts } from "@/hooks/useNavShortcuts";
import { useScreenReader } from "@/context/ScreenReaderContext";
import { useTranslation, useLanguage } from "@/context/LanguageContext";
import { useDisplayName } from "@/hooks/useDisplayName";
import { featureNavLabels } from "@/lib/translations";
import { translatePreConsultation } from "@/lib/preConsultationTranslations";
import { useManipuriLocalization } from "@/hooks/useManipuriLocalization";
import { NAV_TAB_ACTIONS, type NavTabKey } from "@/lib/navTabDescriptions";

const SHORTCUTS = [
  { keys: "Tab", description: "Move to next interactive element" },
  { keys: "Shift + Tab", description: "Move to previous element" },
  { keys: "Enter / Space", description: "Activate focused button or link" },
  { keys: "Ctrl + Esc", description: "Jump to navigation sidebar" },
  { keys: "Esc", description: "Close open dialogs and menus" },
  { keys: "Arrow keys", description: "Navigate within dropdowns and tabs" },
  { keys: "1 – 9", description: "Jump directly to nav tab 1 through 9" },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const { isEnabled: srEnabled, toggle: toggleSR, speak, speakAi, readPage } = useScreenReader();
  const t = useTranslation();
  const { language } = useLanguage();
  useManipuriLocalization(language.code);
  const pcTr = (source: string) => translatePreConsultation(language.code, source);
  const featureLabels = featureNavLabels[language.code] ?? featureNavLabels.en;
  const { firstName: displayFirst, fullName: displayFull } = useDisplayName();

  const navTabActions = NAV_TAB_ACTIONS[language.code] ?? NAV_TAB_ACTIONS.en;
  const tabDescription = (label: string, action: NavTabKey) => `${label}, ${navTabActions[action]}.`;

  const NAV_ITEMS = [
    { href: "/dashboard", label: t.nav_dashboard, icon: LayoutDashboard, description: tabDescription(t.nav_dashboard, "dashboard") },
    { href: "/pre-consultation", label: featureLabels.preConsultation, icon: ClipboardList, description: tabDescription(featureLabels.preConsultation, "preConsultation") },
    { href: "/prescriptions", label: featureLabels.prescriptions, icon: ScrollText, description: tabDescription(featureLabels.prescriptions, "prescriptions") },
    { href: "/child-health", label: featureLabels.childHealth, icon: Baby, description: tabDescription(featureLabels.childHealth, "childHealth") },
    { href: "/triage", label: t.nav_triage, icon: Stethoscope, description: tabDescription(t.nav_triage, "triage") },
    { href: "/appointments", label: t.nav_appointments, icon: Calendar, description: tabDescription(t.nav_appointments, "appointments") },
    { href: "/medications", label: t.nav_medications, icon: Pill, description: tabDescription(t.nav_medications, "medications") },
    { href: "/reports", label: t.nav_reports, icon: FileText, description: tabDescription(t.nav_reports, "reports") },
    { href: "/health-records", label: t.nav_health_records, icon: HeartPulse, description: tabDescription(t.nav_health_records, "healthRecords") },
    { href: "/tracker", label: t.nav_tracker, icon: Activity, description: tabDescription(t.nav_tracker, "tracker") },
    { href: "/caretakers", label: featureLabels.caretakerNurse, icon: BriefcaseMedical, description: tabDescription(featureLabels.caretakerNurse, "caretakers") },
    { href: "/care-circle", label: t.nav_care_circle, icon: Users, description: tabDescription(t.nav_care_circle, "careCircle") },
    { href: "/privacy-emergency", label: t.nav_privacy_emergency, icon: Shield, description: tabDescription(t.nav_privacy_emergency, "privacyEmergency") },
  ];

  const handleLogout = () => {
    signOut({ redirectUrl: import.meta.env.BASE_URL || "/" });
  };

  const openNav = useCallback(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    if (mq.matches) {
      const firstNavLink = document.querySelector<HTMLElement>("#main-nav a");
      if (firstNavLink) firstNavLink.focus();
    } else {
      setMobileNavOpen(true);
    }
  }, []);

  useKeyboardNav(openNav);

  // Speak the label of any element the user focuses or hovers over
  useSpeakOnInteraction(srEnabled, speak, speakAi);

  // Number keys 1–9 jump to nav tabs; announce when reader is on
  useNavShortcuts(NAV_ITEMS, navigate, speak, srEnabled);

  // Announce screen-reader toggle
  const handleToggleSR = useCallback(() => {
    toggleSR();
  }, [toggleSR]);

  const NavContent = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center px-4 font-bold text-xl text-primary gap-2">
        <HeartPulse className="h-6 w-6" aria-hidden="true" />
        <span>Sushruth</span>
      </div>
      <nav
        id="main-nav"
        role="navigation"
        aria-label="Main navigation"
        className="flex-1 overflow-y-auto p-4 space-y-1"
      >
        {NAV_ITEMS.map((item, idx) => {
          const isActive = location === item.href || location.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="block focus:outline-none focus:ring-2 focus:ring-primary rounded-lg"
              aria-label={language.code === "mni"
                ? `${item.label}, ꯃꯐꯝ ꯑꯁꯤꯗ ꯆꯠꯅꯕ ${idx + 1} ꯅꯝꯕꯤꯌꯨ`
                : `${item.label}, press ${idx + 1} to jump here`}
              data-sr-description={item.description}
            >
              <div
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon className="h-4 w-4" aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                <span className="text-[10px] font-mono opacity-40 shrink-0">{idx + 1}</span>
              </div>
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border mt-auto space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold" aria-hidden="true">
            {displayFirst?.charAt(0)?.toUpperCase() || user?.primaryEmailAddress?.emailAddress?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">{displayFull || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.primaryEmailAddress?.emailAddress}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg bg-primary/5 px-3 py-1.5">
          <Languages className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
          <span className="text-xs text-primary font-medium truncate">{language.nativeName}</span>
          <span className="text-xs text-muted-foreground ml-auto shrink-0">{language.name}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground text-xs"
          onClick={() => setShortcutsOpen(true)}
          aria-label="Show keyboard shortcuts"
        >
          <Keyboard className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
          {t.nav_keyboard_shortcuts}
        </Button>
        <Link href="/settings" className="block focus:outline-none focus:ring-2 focus:ring-primary rounded-md">
          <Button
            variant="ghost"
            size="sm"
            className={`w-full justify-start text-xs ${location === "/settings" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`}
            aria-label="Account settings"
          >
            <Settings className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
            {t.nav_account_settings}
          </Button>
        </Link>
        <Button
          variant="outline"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
          aria-label="Sign out of Sushruth"
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          {t.nav_logout}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:shadow-lg focus:outline-none"
        tabIndex={0}
      >
        Skip to main content
      </a>

      <header
        className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background px-4 sm:hidden"
        role="banner"
      >
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button
              ref={menuBtnRef}
              variant="ghost"
              size="icon"
              className="shrink-0"
              aria-label="Open navigation menu"
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-nav"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0" id="mobile-nav" aria-label="Navigation menu">
            <NavContent />
          </SheetContent>
        </Sheet>
        <div className="flex flex-1 items-center justify-between">
          <div className="font-bold text-xl text-primary flex items-center gap-2" aria-label="Sushruth home">
            <HeartPulse className="h-6 w-6" aria-hidden="true" />
            Sushruth
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={srEnabled ? "default" : "outline"}
              size="icon"
              onClick={handleToggleSR}
              aria-label={srEnabled ? "Turn off screen reader" : "Turn on screen reader"}
              aria-pressed={srEnabled}
              title={srEnabled ? "Screen reader ON — click to turn off" : "Screen reader OFF — click to turn on"}
              className={srEnabled ? "bg-teal-600 hover:bg-teal-700 text-white border-0" : ""}
            >
              {srEnabled
                ? <Volume2 className="h-4 w-4" aria-hidden="true" />
                : <VolumeX className="h-4 w-4" aria-hidden="true" />}
            </Button>
            {srEnabled && (
              <Button
                variant="outline"
                size="icon"
                onClick={readPage}
                aria-label={language.code === "hi" ? "इस पेज की मुख्य जानकारी पढ़ें" : "Read the main information on this page"}
                data-sr-description={language.code === "hi"
                  ? "यह पेज पढ़ें। स्क्रीन पर दिख रही मुख्य जानकारी को क्रम से सुनें।"
                  : "Read this page. Hear the main information currently visible on the screen in order."}
              >
                <BookOpenText className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            <ModeToggle />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className="hidden w-64 border-r border-border bg-card sm:block"
          aria-label="Sidebar navigation"
        >
          <NavContent />
        </aside>

        <main
          id="main-content"
          className="flex-1 overflow-y-auto"
          role="main"
          aria-label="Main content"
          tabIndex={-1}
        >
          <div className="container mx-auto p-4 sm:p-6 lg:p-8 max-w-6xl">
            <div className="hidden sm:flex justify-end items-center gap-2 mb-4">
              <Button
                variant={srEnabled ? "default" : "outline"}
                size="sm"
                onClick={handleToggleSR}
                aria-label={pcTr(srEnabled ? "Turn off screen reader" : "Turn on screen reader")}
                aria-pressed={srEnabled}
                title={pcTr(srEnabled ? "Turn off screen reader" : "Turn on screen reader")}
                className={`gap-2 text-xs ${srEnabled ? "bg-teal-600 hover:bg-teal-700 text-white border-0" : ""}`}
              >
                {srEnabled
                  ? <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                  : <VolumeX className="h-3.5 w-3.5" aria-hidden="true" />}
                {srEnabled ? "Reader ON" : "Reader OFF"}
              </Button>
              {srEnabled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={readPage}
                  className="gap-2 text-xs"
                  data-sr-description={pcTr("Read this page. Hear the main information currently visible on the screen in order.")}
                >
                  <BookOpenText className="h-3.5 w-3.5" aria-hidden="true" />
                  {pcTr("Read this page")}
                </Button>
              )}
              <ModeToggle />
            </div>
            {children}
          </div>
        </main>
      </div>

      {shortcutsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="shortcuts-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShortcutsOpen(false); }}
        >
          <div className="bg-background rounded-xl shadow-2xl border border-border w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 id="shortcuts-title" className="text-lg font-bold flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-primary" aria-hidden="true" />
                Keyboard Shortcuts
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShortcutsOpen(false)}
                aria-label="Close keyboard shortcuts"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
            <dl className="space-y-3">
              {SHORTCUTS.map((s) => (
                <div key={s.keys} className="flex items-center justify-between gap-4">
                  <dt>
                    <kbd className="inline-flex items-center rounded border border-border bg-muted px-2 py-0.5 text-xs font-mono font-semibold text-foreground">
                      {s.keys}
                    </kbd>
                  </dt>
                  <dd className="text-sm text-muted-foreground text-right">{s.description}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-5 border-t pt-4 space-y-2">
              <p className="text-xs text-muted-foreground">
                Press <kbd className="inline-flex items-center rounded border border-border bg-muted px-1 py-0.5 text-xs font-mono">Ctrl + Esc</kbd> at any time to jump to the navigation menu.
              </p>
              {srEnabled && (
                <p className="text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
                  Screen reader is ON — Sushruth will speak the name of every button, link, and menu item you hover over or Tab to.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
