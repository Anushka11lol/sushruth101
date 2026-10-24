import { useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HeartPulse, Stethoscope, User, ArrowRight } from "lucide-react";
import { LanguageSelector } from "@/components/ui/language-selector";

export default function PortalPage() {
  const [, setLocation] = useLocation();

  const handleSelection = (role: "patient" | "doctor" | "frontline_worker" | "facility_admin") => {
    sessionStorage.setItem("sushruth_portal_intent", role);
    const searchParams = new URLSearchParams(window.location.search);
    const mode = searchParams.get("mode") || "signin";

    if (mode === "signup") {
      setLocation("/sign-up");
    } else {
      setLocation("/sign-in");
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-slate-50">
      <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 bg-white shadow-sm">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-teal-700">
          <HeartPulse className="h-6 w-6" />
          Sushruth
        </Link>
        <LanguageSelector buttonClassName="h-9" />
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Welcome to Sushruth</h1>
            <p className="text-lg text-slate-600">Please choose how you want to use the platform.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card
              className="group cursor-pointer hover:shadow-xl hover:border-teal-300 transition-all duration-300 overflow-hidden relative"
              onClick={() => handleSelection("patient")}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-teal-50 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-8 relative">
                <div className="w-16 h-16 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mb-6 shadow-inner">
                  <User className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">Patient & Family</h2>
                <p className="text-slate-600 mb-8 min-h-[60px]">
                  Access AI symptom triage, simplify medical reports, manage family health records, and book consultations.
                </p>
                <div className="flex items-center text-teal-700 font-semibold group-hover:gap-3 gap-2 transition-all">
                  Continue as Patient <ArrowRight className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="group cursor-pointer hover:shadow-xl hover:border-indigo-300 transition-all duration-300 overflow-hidden relative"
              onClick={() => handleSelection("doctor")}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-8 relative">
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-6 shadow-inner">
                  <Stethoscope className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">Doctor & Hospital</h2>
                <p className="text-slate-600 mb-8 min-h-[60px]">
                  Review structured patient intakes, manage your consultation queue, and verify medical summaries efficiently.
                </p>
                <div className="flex items-center text-indigo-700 font-semibold group-hover:gap-3 gap-2 transition-all">
                  Continue as Clinician <ArrowRight className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="group cursor-pointer hover:shadow-xl hover:border-emerald-300 transition-all duration-300 overflow-hidden relative"
              onClick={() => handleSelection("frontline_worker")}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-8 relative">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-6 shadow-inner">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">Frontline Health Worker</h2>
                <p className="text-slate-600 mb-8 min-h-[60px]">
                  Register patients, record vitals, manage referrals, coordinate care, and track follow-ups directly from the field.
                </p>
                <div className="flex items-center text-emerald-700 font-semibold group-hover:gap-3 gap-2 transition-all">
                  Continue as Health Worker <ArrowRight className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card
              className="group cursor-pointer hover:shadow-xl hover:border-blue-300 transition-all duration-300 overflow-hidden relative"
              onClick={() => handleSelection("facility_admin")}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
              <CardContent className="p-8 relative">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center mb-6 shadow-inner">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1v1H9V7zm5 0h1v1h-1V7zm-5 4h1v1H9v-1zm5 0h1v1h-1v-1zm-3 4H2v-1h9v1z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-3">Facility / PHC Admin</h2>
                <p className="text-slate-600 mb-8 min-h-[60px]">
                  Manage inventory, coordinate resources, and oversee operational workflow queues for your facility.
                </p>
                <div className="flex items-center text-blue-700 font-semibold group-hover:gap-3 gap-2 transition-all">
                  Continue as Facility Admin <ArrowRight className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
