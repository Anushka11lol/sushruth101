import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { ModeToggle } from "../mode-toggle";
import { Button } from "@/components/ui/button";
import {
  HeartPulse,
  LogOut,
  Users,
  Activity,
  Send,
  CalendarCheck,
  Baby,
  ActivitySquare,
  Microscope,
  LayoutDashboard,
  Volume2,
  VolumeX,
  UserCircle,
  ClipboardList,
} from "lucide-react";
import { useDisplayName } from "@/hooks/useDisplayName";
import { useScreenReader } from "@/context/ScreenReaderContext";
import { useSpeakOnInteraction } from "@/hooks/useSpeakOnInteraction";
import { useNavShortcuts } from "@/hooks/useNavShortcuts";
export function HealthWorkerLayout({
  children,
  hasClinicalAccess,
  noRegistration,
}: {
  children: ReactNode;
  hasClinicalAccess: boolean;
  noRegistration: boolean;
}) {
  const [location, navigate] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { firstName: displayFirst, fullName: displayFull } = useDisplayName();
  const { isEnabled: srEnabled, toggle: toggleSR, speak, speakAi } = useScreenReader();

  const handleLogout = () => {
    signOut({ redirectUrl: import.meta.env.BASE_URL || "/" });
  };

  const ALL_NAV_ITEMS = [
    { href: "/health-worker", label: "Dashboard", icon: LayoutDashboard, exact: true, clinical: true },
    { href: "/health-worker/patients", label: "Patients", icon: Users, clinical: true },
    { href: "/health-worker/vitals", label: "Vitals", icon: Activity, clinical: true },
    { href: "/health-worker/referrals", label: "Referrals", icon: Send, clinical: true },
    { href: "/health-worker/follow-ups", label: "Follow-ups", icon: CalendarCheck, clinical: true },
    { href: "/health-worker/maternal", label: "Maternal", icon: Baby, clinical: true },
    { href: "/health-worker/chronic-care", label: "Chronic Care", icon: ActivitySquare, clinical: true },
    { href: "/health-worker/investigations", label: "Investigations", icon: Microscope, clinical: true },
    { href: "/health-worker/register", label: "Registration", icon: ClipboardList, exact: true, clinical: false, hideWhenRegistered: true },
    { href: "/health-worker/account", label: "Account & Status", icon: UserCircle, exact: true, clinical: false },
  ];

  const NAV_ITEMS = ALL_NAV_ITEMS.filter((item) => {
    if (item.clinical && !hasClinicalAccess) return false;
    if (item.hideWhenRegistered && !noRegistration) return false;
    // Don't show account if not registered yet, they should register first
    if (item.href === "/health-worker/account" && noRegistration) return false;
    return true;
  });

  useSpeakOnInteraction(srEnabled, speak, speakAi);
  useNavShortcuts(NAV_ITEMS, navigate, speak, srEnabled);

  return (
    <div className="flex min-h-[100dvh] w-full bg-emerald-50/30">
      <aside className="w-64 border-r border-emerald-100 bg-white flex flex-col shadow-sm z-10 hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-emerald-100">
          <Link href="/health-worker" className="font-bold text-xl text-emerald-700 flex items-center gap-2">
            <HeartPulse className="h-6 w-6" />
            Sushruth
          </Link>
        </div>
        <div className="p-4">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full">Frontline Worker</span>
        </div>
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact ? location === item.href : location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={`w-full justify-start ${isActive ? "bg-emerald-100 text-emerald-900 font-semibold" : "text-slate-600 hover:text-emerald-800 hover:bg-emerald-50"}`}
                  data-testid={`nav-link-${item.label.replace(/\s+/g, '-').toLowerCase()}`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-emerald-100 space-y-4 bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-lg">
              {displayFirst?.charAt(0)?.toUpperCase() || "W"}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-800 truncate">{displayFull || "Worker"}</p>
              <p className="text-xs text-slate-500 truncate">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant={srEnabled ? "default" : "outline"}
              size="icon"
              className={srEnabled ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
              onClick={toggleSR}
              title="Toggle Screen Reader"
            >
              {srEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <ModeToggle />
            <Button
              variant="outline"
              size="sm"
              className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-16 border-b border-emerald-100 bg-white flex items-center justify-between px-4">
          <div className="font-bold text-lg text-emerald-700 flex items-center gap-2">
            <HeartPulse className="h-5 w-5" />
            Sushruth Worker
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}><LogOut className="h-5 w-5 text-red-600" /></Button>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}