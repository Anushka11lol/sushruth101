import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useUser, useClerk } from "@clerk/react";
import { ModeToggle } from "../mode-toggle";
import { Button } from "@/components/ui/button";
import {
  HeartPulse,
  LogOut,
  LayoutDashboard,
  PackageSearch,
  Building2,
  Volume2,
  VolumeX,
  Users,
} from "lucide-react";
import { useDisplayName } from "@/hooks/useDisplayName";
import { useScreenReader } from "@/context/ScreenReaderContext";
import { useSpeakOnInteraction } from "@/hooks/useSpeakOnInteraction";
import { useNavShortcuts } from "@/hooks/useNavShortcuts";

export function FacilityLayout({ children }: { children: ReactNode }) {
  const [location, navigate] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { firstName: displayFirst, fullName: displayFull } = useDisplayName();
  const { isEnabled: srEnabled, toggle: toggleSR, speak, speakAi } = useScreenReader();

  const handleLogout = () => {
    signOut({ redirectUrl: import.meta.env.BASE_URL || "/" });
  };

  const NAV_ITEMS = [
    { href: "/facility", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/facility/inventory", label: "Inventory", icon: PackageSearch },
    { href: "/facility/resources", label: "Resources", icon: Building2 },
    { href: "/facility/staff-requests", label: "Staff Requests", icon: Users },
  ];

  useSpeakOnInteraction(srEnabled, speak, speakAi);
  useNavShortcuts(NAV_ITEMS, navigate, speak, srEnabled);

  return (
    <div className="flex min-h-[100dvh] w-full bg-blue-50/30">
      <aside className="w-64 border-r border-blue-100 bg-white flex flex-col shadow-sm z-10 hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-blue-100">
          <Link href="/facility" className="font-bold text-xl text-blue-700 flex items-center gap-2">
            <HeartPulse className="h-6 w-6" />
            Sushruth
          </Link>
        </div>
        <div className="p-4">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">Facility Admin</span>
        </div>
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact ? location === item.href : location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={`w-full justify-start ${isActive ? "bg-blue-100 text-blue-900 font-semibold" : "text-slate-600 hover:text-blue-800 hover:bg-blue-50"}`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-blue-100 space-y-4 bg-blue-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-lg">
              {displayFirst?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-800 truncate">{displayFull || "Admin"}</p>
              <p className="text-xs text-slate-500 truncate">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button
              variant={srEnabled ? "default" : "outline"}
              size="icon"
              className={srEnabled ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
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
        <header className="md:hidden h-16 border-b border-blue-100 bg-white flex items-center justify-between px-4">
          <div className="font-bold text-lg text-blue-700 flex items-center gap-2">
            <HeartPulse className="h-5 w-5" />
            Sushruth Facility
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