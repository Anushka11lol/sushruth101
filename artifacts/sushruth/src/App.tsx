import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from "@clerk/react";
import { shadcn } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ScreenReaderProvider } from "@/context/ScreenReaderContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { VirtualKeyboard } from "@/components/accessibility/VirtualKeyboard";
import { LanguageSelector } from "@/components/ui/language-selector";
import { ArrowLeft, Building2, ShieldAlert } from "lucide-react";

import { Link } from "wouter";
import NotFound from "@/pages/not-found";
import { AppLayout } from "@/components/layout/AppLayout";
import { DoctorLayout } from "@/components/layout/DoctorLayout";
import { HealthWorkerLayout } from "@/components/layout/HealthWorkerLayout";
import { FacilityLayout } from "@/components/layout/FacilityLayout";
import PortalPage from "@/pages/portal";
import LandingPage from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import TriagePage from "@/pages/triage";
import ReportsPage from "@/pages/reports";
import AppointmentsPage from "@/pages/appointments";
import HealthRecordsPage from "@/pages/health-records";
import TrackerPage from "@/pages/tracker";
import CareCirclePage from "@/pages/care-circle";
import MedicationsPage from "@/pages/medications";
import SettingsPage from "@/pages/settings";
import PrivacyEmergencyPage from "@/pages/privacy-emergency";
import HealthQuestionsPage from "@/pages/onboarding/health-questions";
import LanguageSelectPage from "@/pages/onboarding/language-select";
import PreConsultationPage from "@/pages/pre-consultation";
import DoctorReviewPage from "@/pages/doctor-review";
import DoctorDashboardPage from "@/pages/doctor-dashboard";
import ChildHealthPage from "@/pages/child-health";
import PrescriptionsPage from "@/pages/prescriptions";
import CaretakersPage from "@/pages/caretakers";

import HealthWorkerDashboard from "@/pages/health-worker/dashboard";
import HealthWorkerPatients from "@/pages/health-worker/patients";
import HealthWorkerVitals from "@/pages/health-worker/vitals";
import HealthWorkerReferrals from "@/pages/health-worker/referrals";
import HealthWorkerFollowUps from "@/pages/health-worker/follow-ups";
import HealthWorkerMaternal from "@/pages/health-worker/maternal";
import HealthWorkerChronicCare from "@/pages/health-worker/chronic-care";
import HealthWorkerInvestigations from "@/pages/health-worker/investigations";

import HealthWorkerAccount from "@/pages/health-worker/account";
import HealthWorkerRegister from "@/pages/health-worker/register";

import FacilityDashboard from "@/pages/facility/dashboard";
import FacilityInventory from "@/pages/facility/inventory";
import FacilityResources from "@/pages/facility/resources";
import FacilityStaffRequests from "@/pages/facility/staff-requests";

import {
  useGetHealthWorkerProfile,
  useGetPortalProfile,
  useUpsertPortalProfile,
  useGetHealthWorkerRegistrationStatus,
  getGetHealthWorkerProfileQueryKey,
  getGetPortalProfileQueryKey,
  getGetHealthWorkerRegistrationStatusQueryKey,
} from "@workspace/api-client-react";

const queryClient = new QueryClient();

function resolveClerkPublishableKey(): string {
  const envKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
  if (envKey && (envKey.startsWith("pk_test_") || envKey.startsWith("pk_live_"))) {
    return envKey;
  }
  const hostname = window.location.hostname.toLowerCase().replace(/:\d+$/, "");
  const b64 = btoa(`clerk.${hostname}$`).replace(/=+$/, "");
  return `pk_live_${b64}`;
}

const clerkPubKey = resolveClerkPublishableKey();

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "none" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.jpeg`,
  },
  variables: {
    colorPrimary: "hsl(172 76% 26%)",
    colorForeground: "hsl(180 20% 20%)",
    colorMutedForeground: "hsl(180 15% 45%)",
    colorDanger: "hsl(0 84% 60%)",
    colorBackground: "hsl(0 0% 100%)",
    colorInput: "hsl(40 20% 90%)",
    colorInputForeground: "hsl(180 20% 20%)",
    colorNeutral: "hsl(40 20% 90%)",
    fontFamily: "'Outfit', 'Inter', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full max-w-full flex justify-center",
    cardBox: "bg-white dark:bg-slate-900 rounded-2xl w-full sm:w-[440px] max-w-full overflow-hidden shadow-xl border border-border",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-2xl font-bold text-foreground",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground font-medium",
    formFieldLabel: "text-foreground font-medium",
    footerActionLink: "text-primary hover:text-primary/80 font-medium",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground",
  },
};

function AuthBrandPanel() {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center bg-gradient-to-br from-teal-700 via-teal-600 to-emerald-500 px-12 py-16 text-white min-h-full rounded-2xl">
      <img
        src={`${basePath}/logo.jpeg`}
        alt="Sushruth logo"
        className="w-52 mb-8 rounded-2xl shadow-xl"
      />
      <p className="text-teal-100 text-center text-base leading-relaxed max-w-xs">
        Your personal AI health companion — triage symptoms, simplify reports, and manage your care in one secure place.
      </p>
      <div className="mt-8 flex flex-col gap-2 text-sm text-teal-200 w-full max-w-xs">
        {["AI Symptom Triage", "Medical Report Simplification", "Doctor Appointment Booking", "23 Languages Supported"].map((f) => (
          <div key={f} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-300 shrink-0" />
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50 px-4 py-8">
      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 items-stretch">
        <AuthBrandPanel />
        <div className="w-full min-w-0 flex flex-col items-center justify-center gap-6 relative">
          <img
            src={`${basePath}/logo.jpeg`}
            alt="Sushruth"
            className="w-28 rounded-xl shadow-md lg:hidden"
          />
          <div className="w-full max-w-[440px] flex flex-col items-center lg:items-end gap-1">
            <LanguageSelector className="w-full sm:w-auto" buttonClassName="w-full sm:w-[220px]" />
            <span className="text-[11px] text-slate-500 font-medium text-center lg:text-right">Your language will continue after sign in.</span>
          </div>
          <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
        </div>
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-teal-50 to-emerald-50 px-4 py-8">
      <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-8 items-stretch">
        <AuthBrandPanel />
        <div className="w-full min-w-0 flex flex-col items-center justify-center gap-6 relative">
          <img
            src={`${basePath}/logo.jpeg`}
            alt="Sushruth"
            className="w-28 rounded-xl shadow-md lg:hidden"
          />
          <div className="w-full max-w-[440px] flex flex-col items-center lg:items-end gap-1">
            <LanguageSelector className="w-full sm:w-auto" buttonClassName="w-full sm:w-[220px]" />
            <span className="text-[11px] text-slate-500 font-medium text-center lg:text-right">Your language will continue after sign in.</span>
          </div>
          <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
        </div>
      </div>
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function HomeRedirect() {
  const { user, isLoaded } = useUser();
  const [, setLocation] = useLocation();

  const userId = user?.id;

  const { data: portalProfile, isLoading: profileLoading } = useGetPortalProfile(
    { userId: userId! },
    { query: { enabled: !!userId, retry: false, queryKey: getGetPortalProfileQueryKey({ userId: userId! }) } }
  );

  const upsertProfile = useUpsertPortalProfile();

  useEffect(() => {
    if (!isLoaded || !userId) return;

    const intent = sessionStorage.getItem("sushruth_portal_intent");
    if (intent && !profileLoading) {
      // Create or update role based on intent
      if (!portalProfile || portalProfile.portalRole !== intent) {
        upsertProfile.mutate(
          { data: { userId, portalRole: intent as any } },
          {
            onSuccess: () => {
              sessionStorage.removeItem("sushruth_portal_intent");
              navigateBasedOnRole(intent);
            }
          }
        );
      } else {
        sessionStorage.removeItem("sushruth_portal_intent");
        navigateBasedOnRole(portalProfile.portalRole);
      }
    } else if (portalProfile && !profileLoading) {
      navigateBasedOnRole(portalProfile.portalRole);
    } else if (!portalProfile && !profileLoading && !upsertProfile.isPending) {
      // Existing users created before portal profiles were introduced should
      // still be able to enter the app. Default them to the patient portal.
      upsertProfile.mutate(
        { data: { userId, portalRole: "patient" } },
        {
          onSuccess: () => navigateBasedOnRole("patient"),
        },
      );
    }
  }, [isLoaded, userId, profileLoading, portalProfile, upsertProfile.isPending]);

  const navigateBasedOnRole = (role: string) => {
    if (role === "doctor") {
      setLocation("/doctor");
    } else if (role === "frontline_worker") {
      setLocation("/health-worker");
    } else if (role === "facility_admin") {
      setLocation("/facility");
    } else {
      const hqDone = localStorage.getItem(`sushruth_hq_done_${userId}`);
      const onboardingDone = localStorage.getItem(`sushruth_onboarding_done_${userId}`);
      if (!hqDone) setLocation("/onboarding/health");
      else if (!onboardingDone) setLocation("/onboarding/language");
      else setLocation("/dashboard");
    }
  };

  if (!isLoaded) return null;
  if (!user) return <LandingPage />;

  // Loading state while checking/creating profile
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-slate-600 font-medium">Setting up your workspace...</p>
    </div>
  );
}

function OnboardingRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <Component />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function DoctorProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoaded } = useUser();
  const userId = user?.id;
  const [, setLocation] = useLocation();

  const { data: portalProfile, isLoading } = useGetPortalProfile(
    { userId: userId! },
    { query: { enabled: !!userId, retry: false, queryKey: getGetPortalProfileQueryKey({ userId: userId! }) } }
  );

  useEffect(() => {
    if (isLoaded && user && !isLoading && portalProfile?.portalRole !== "doctor") {
      setLocation("/");
    }
  }, [isLoaded, user, isLoading, portalProfile, setLocation]);

  if (!isLoaded || isLoading) return null;

  return (
    <>
      <Show when="signed-in">
        {portalProfile?.portalRole === "doctor" && (
          <DoctorLayout>
            <Component />
          </DoctorLayout>
        )}
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function HealthWorkerProtectedRoute({
  component: Component,
  requireClinicalAccess = true,
}: {
  component: React.ComponentType;
  requireClinicalAccess?: boolean;
}) {
  const { user, isLoaded } = useUser();
  const userId = user?.id;
  const [locationPath, setLocation] = useLocation();

  const { data: portalProfile, isLoading: profileLoading } = useGetPortalProfile(
    { userId: userId! },
    { query: { enabled: !!userId, retry: false, queryKey: getGetPortalProfileQueryKey({ userId: userId! }) } }
  );
  const isFrontlineWorker = portalProfile?.portalRole === "frontline_worker";

  const {
    data: workerProfile,
    isLoading: workerProfileLoading,
    error: workerProfileError,
  } = useGetHealthWorkerProfile({
    query: {
      enabled: isFrontlineWorker,
      retry: false,
      queryKey: getGetHealthWorkerProfileQueryKey(),
    },
  });

  const {
    data: regStatus,
    isLoading: regLoading,
    error: regError,
  } = useGetHealthWorkerRegistrationStatus({
    query: {
      enabled: isFrontlineWorker,
      retry: false,
      retryOnMount: false,
      refetchOnMount: false,
      queryKey: getGetHealthWorkerRegistrationStatusQueryKey(),
    }
  });

  const workerProfileErrorStatus =
    workerProfileError &&
    typeof workerProfileError === "object" &&
    "status" in workerProfileError &&
    typeof workerProfileError.status === "number"
      ? workerProfileError.status
      : undefined;

  const regErrorStatus =
    regError &&
    typeof regError === "object" &&
    "status" in regError &&
    typeof regError.status === "number"
      ? regError.status
      : undefined;

  const hasLegacyProfile = !!workerProfile;
  const registration = regStatus?.registration as any;
  const associations = (regStatus?.associations as any[]) || [];
  const noRegistration = !regStatus && regErrorStatus === 404;

  const isVerifiedRegistration = registration?.professionalStatus === "VERIFIED";
  const latestAssoc = associations[0];
  const isAssocApproved = latestAssoc?.status === "APPROVED";

  const hasClinicalAccess = hasLegacyProfile && (noRegistration || (isVerifiedRegistration && isAssocApproved));

  const statusUnavailable = isFrontlineWorker && (
    (workerProfileError && workerProfileErrorStatus !== 404) ||
    (regError && regErrorStatus !== 404)
  );

  useEffect(() => {
    if (isLoaded && user && !profileLoading && !workerProfileLoading && !regLoading && !statusUnavailable) {
      if (!isFrontlineWorker) {
        setLocation("/");
        return;
      }

      const isRegisterPage = locationPath === "/health-worker/register";
      const isAccountPage = locationPath === "/health-worker/account";

      if (requireClinicalAccess && !hasClinicalAccess) {
        if (noRegistration && !isRegisterPage) {
          setLocation("/health-worker/register");
        } else if (!noRegistration && !isAccountPage) {
          setLocation("/health-worker/account");
        }
      } else if (!requireClinicalAccess) {
        if (isRegisterPage && registration) {
          setLocation("/health-worker/account");
        }
      }
    }
  }, [
    isLoaded, user, profileLoading, workerProfileLoading, regLoading,
    isFrontlineWorker, requireClinicalAccess, hasClinicalAccess,
    noRegistration, registration, locationPath, setLocation, statusUnavailable
  ]);

  if (!isLoaded || profileLoading || (isFrontlineWorker && (workerProfileLoading || regLoading))) {
    return <div className="min-h-screen flex items-center justify-center text-slate-600">Loading your health worker account…</div>;
  }

  if (statusUnavailable) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-semibold">We couldn't load your worker account</h1>
        <p className="text-slate-600">Please check your connection and try again. Your account data has not been changed.</p>
        <button className="rounded-lg bg-emerald-700 px-5 py-2 text-white" onClick={() => window.location.reload()}>Try again</button>
      </main>
    );
  }

  if (requireClinicalAccess && !hasClinicalAccess) return null;

  return (
    <>
      <Show when="signed-in">
        {isFrontlineWorker ? (
          <HealthWorkerLayout hasClinicalAccess={hasClinicalAccess} noRegistration={noRegistration}>
            <Component />
          </HealthWorkerLayout>
        ) : null}
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function FacilityProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoaded } = useUser();
  const userId = user?.id;
  const [, setLocation] = useLocation();

  const { data: portalProfile, isLoading } = useGetPortalProfile(
    { userId: userId! },
    { query: { enabled: !!userId, retry: false, queryKey: getGetPortalProfileQueryKey({ userId: userId! }) } }
  );

  useEffect(() => {
    if (isLoaded && user && !isLoading && (portalProfile?.portalRole as any) !== "facility_admin") {
      setLocation("/");
    }
  }, [isLoaded, user, isLoading, portalProfile, setLocation]);

  if (!isLoaded || isLoading) return null;

  return (
    <>
      <Show when="signed-in">
        {(portalProfile?.portalRole as any) === "facility_admin" && (
          <FacilityLayout>
            <Component />
          </FacilityLayout>
        )}
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoaded } = useUser();
  const userId = user?.id;
  const [, setLocation] = useLocation();

  const { data: portalProfile, isLoading } = useGetPortalProfile(
    { userId: userId! },
    { query: { enabled: !!userId, retry: false, queryKey: getGetPortalProfileQueryKey({ userId: userId! }) } }
  );

  useEffect(() => {
    if (isLoaded && user && !isLoading) {
      if (portalProfile?.portalRole === "doctor") {
        setLocation("/doctor");
        return;
      }
      if ((portalProfile?.portalRole as any) === "frontline_worker") {
        setLocation("/health-worker");
        return;
      }
      if ((portalProfile?.portalRole as any) === "facility_admin") {
        setLocation("/facility");
        return;
      }

      const hqDone = localStorage.getItem(`sushruth_hq_done_${userId}`);
      const onboardingDone = localStorage.getItem(`sushruth_onboarding_done_${userId}`);

      // Don't redirect if we are already on the onboarding routes
      const path = window.location.pathname;
      if (!hqDone && !path.includes("/onboarding/health")) {
        setLocation("/onboarding/health");
      } else if (hqDone && !onboardingDone && !path.includes("/onboarding/language")) {
        setLocation("/onboarding/language");
      }
    }
  }, [isLoaded, user, isLoading, portalProfile, setLocation, userId]);

  if (!isLoaded || isLoading) return null;

  return (
    <>
      <Show when="signed-in">
        {(portalProfile?.portalRole === "patient" || !(portalProfile?.portalRole as any)) && (
          <AppLayout>
            <Component />
          </AppLayout>
        )}
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to: string) => setLocation(stripBase(to))}
      routerReplace={(to: string) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <ScreenReaderProvider>
            <ClerkQueryClientCacheInvalidator />
            <Switch>
              <Route path="/" component={HomeRedirect} />
              <Route path="/portal" component={PortalPage} />
              <Route path="/sign-in/*?" component={SignInPage} />
              <Route path="/sign-up/*?" component={SignUpPage} />

              <Route path="/onboarding/health"><OnboardingRoute component={HealthQuestionsPage} /></Route>
              <Route path="/onboarding/language"><OnboardingRoute component={LanguageSelectPage} /></Route>

              <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
              <Route path="/triage"><ProtectedRoute component={TriagePage} /></Route>
              <Route path="/reports"><ProtectedRoute component={ReportsPage} /></Route>
              <Route path="/appointments"><ProtectedRoute component={AppointmentsPage} /></Route>
              <Route path="/health-records"><ProtectedRoute component={HealthRecordsPage} /></Route>
              <Route path="/tracker"><ProtectedRoute component={TrackerPage} /></Route>
              <Route path="/caretakers"><ProtectedRoute component={CaretakersPage} /></Route>
              <Route path="/care-circle"><ProtectedRoute component={CareCirclePage} /></Route>
              <Route path="/medications"><ProtectedRoute component={MedicationsPage} /></Route>
              <Route path="/settings"><ProtectedRoute component={SettingsPage} /></Route>
              <Route path="/privacy-emergency"><ProtectedRoute component={PrivacyEmergencyPage} /></Route>
              <Route path="/pre-consultation"><ProtectedRoute component={PreConsultationPage} /></Route>
              <Route path="/prescriptions"><ProtectedRoute component={PrescriptionsPage} /></Route>
              <Route path="/child-health"><ProtectedRoute component={ChildHealthPage} /></Route>

              <Route path="/doctor"><DoctorProtectedRoute component={DoctorDashboardPage} /></Route>
              <Route path="/doctor-review/:id"><DoctorProtectedRoute component={DoctorReviewPage} /></Route>

              <Route path="/health-worker"><HealthWorkerProtectedRoute component={HealthWorkerDashboard} /></Route>
              <Route path="/health-worker/register"><HealthWorkerProtectedRoute requireClinicalAccess={false} component={HealthWorkerRegister} /></Route>
              <Route path="/health-worker/account"><HealthWorkerProtectedRoute requireClinicalAccess={false} component={HealthWorkerAccount} /></Route>
              <Route path="/health-worker/patients"><HealthWorkerProtectedRoute component={HealthWorkerPatients} /></Route>
              <Route path="/health-worker/vitals"><HealthWorkerProtectedRoute component={HealthWorkerVitals} /></Route>
              <Route path="/health-worker/referrals"><HealthWorkerProtectedRoute component={HealthWorkerReferrals} /></Route>
              <Route path="/health-worker/follow-ups"><HealthWorkerProtectedRoute component={HealthWorkerFollowUps} /></Route>
              <Route path="/health-worker/maternal"><HealthWorkerProtectedRoute component={HealthWorkerMaternal} /></Route>
              <Route path="/health-worker/chronic-care"><HealthWorkerProtectedRoute component={HealthWorkerChronicCare} /></Route>
              <Route path="/health-worker/investigations"><HealthWorkerProtectedRoute component={HealthWorkerInvestigations} /></Route>

              <Route path="/facility"><FacilityProtectedRoute component={FacilityDashboard} /></Route>
              <Route path="/facility/inventory"><FacilityProtectedRoute component={FacilityInventory} /></Route>
              <Route path="/facility/resources"><FacilityProtectedRoute component={FacilityResources} /></Route>
              <Route path="/facility/staff-requests"><FacilityProtectedRoute component={FacilityStaffRequests} /></Route>

              <Route component={NotFound} />
            </Switch>
            <VirtualKeyboard />
          </ScreenReaderProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="sushruth-theme">
      <TooltipProvider>
        <WouterRouter base={basePath}>
          <ClerkProviderWithRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;
