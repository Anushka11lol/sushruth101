import { ReactNode, useCallback, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { ModeToggle } from "../mode-toggle";
import { Button } from "@/components/ui/button";
import {
  Stethoscope,
  LogOut,
  Settings,
  HeartPulse,
} from "lucide-react";
import { useDisplayName } from "@/hooks/useDisplayName";

export function DoctorLayout({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { firstName: displayFirst, fullName: displayFull } = useDisplayName();

  const handleLogout = () => {
    signOut({ redirectUrl: import.meta.env.BASE_URL || "/" });
  };

  const NAV_ITEMS = [
    { href: "/doctor", label: "Workspace", icon: Stethoscope },
  ];

  return (
    <div className="flex min-h-screen w-full flex-col bg-slate-50/50">
      <header
        className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 shadow-sm"
        role="banner"
      >
        <div className="flex flex-1 items-center justify-between max-w-6xl mx-auto w-full">
          <div className="font-bold text-2xl text-teal-700 flex items-center gap-2" aria-label="Sushruth Doctor">
            <HeartPulse className="h-7 w-7" aria-hidden="true" />
            Sushruth
            <span className="text-xs font-semibold uppercase tracking-widest bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full ml-2">Clinician</span>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden sm:flex items-center gap-1 mr-4">
              {NAV_ITEMS.map((item) => {
                const isActive = location === item.href || location.startsWith(`${item.href}/`);
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      className={isActive ? "bg-slate-100 font-semibold" : "font-medium text-slate-600 hover:text-slate-900"}
                    >
                      <item.icon className="mr-2 h-4 w-4" aria-hidden="true" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>
            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
            <ModeToggle />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-teal-700 flex items-center justify-center text-white font-bold" aria-hidden="true">
                {displayFirst?.charAt(0)?.toUpperCase() || user?.primaryEmailAddress?.emailAddress?.charAt(0)?.toUpperCase() || "D"}
              </div>
              <div className="hidden md:block text-sm mr-2 text-slate-700">
                <span className="font-semibold block">Dr. {displayFull || user?.primaryEmailAddress?.emailAddress?.split("@")[0] || "User"}</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              onClick={handleLogout}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4 sm:mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main
        id="main-content"
        className="flex-1"
        role="main"
        aria-label="Main content"
      >
        {children}
      </main>
    </div>
  );
}
