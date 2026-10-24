import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useUser, useClerk } from "@clerk/react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, CheckCircle2, Search, MapPin, Hospital, User, FileText, BriefcaseMedical } from "lucide-react";
import {
  useSubmitHealthWorkerRegistration,
  useSearchPublicFacilities,
  getGetHealthWorkerRegistrationStatusQueryKey,
  getSearchPublicFacilitiesQueryKey,
} from "@workspace/api-client-react";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const workerTypes = ["ASHA", "ANM", "COMMUNITY_HEALTH_WORKER", "OTHER"] as const;

const formSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().optional(),
  workerType: z.enum(workerTypes),
  workerId: z.string().optional(),
  training: z.string().optional(),
  yearsExperience: z.coerce.number().min(0).max(100).optional(),
  languages: z.string().optional(),
  department: z.string().optional(),
  areaServed: z.string().optional(),
  facilityId: z.number().min(1, "Facility is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function HealthWorkerRegister() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const submitRegistration = useSubmitHealthWorkerRegistration();

  const [step, setStep] = useState(1);
  const totalSteps = 5;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: user?.fullName || user?.firstName || "",
      email: user?.primaryEmailAddress?.emailAddress || "",
      phone: user?.primaryPhoneNumber?.phoneNumber || "",
      workerType: "ASHA",
      languages: "",
      department: "",
      areaServed: "",
    },
  });

  const [facilitySearch, setFacilitySearch] = useState("");
  const debouncedSearch = useDebounce(facilitySearch, 500);

  const { data: facilities, isLoading: facilitiesLoading } = useSearchPublicFacilities(
    { q: debouncedSearch },
    {
      query: {
        enabled: step === 3 && debouncedSearch.length >= 3,
        queryKey: getSearchPublicFacilitiesQueryKey({ q: debouncedSearch }),
      }
    }
  );

  const handleNext = async () => {
    const fieldsByStep: Partial<Record<number, (keyof FormValues)[]>> = {
      1: ["fullName", "dateOfBirth", "gender", "phone", "email", "address"],
      2: ["workerType", "workerId", "training", "yearsExperience", "department", "areaServed", "languages"],
      3: ["facilityId"],
    };

    const fieldsToValidate = fieldsByStep[step];
    if (fieldsToValidate) {
      const isValid = await form.trigger(fieldsToValidate);
      if (!isValid) return;
    }

    if (step < totalSteps) {
      setStep((s) => s + 1);
    }
  };

  const onSubmit = (data: FormValues) => {
    const payload: any = { ...data };

    if (data.languages) {
      payload.languages = data.languages.split(",").map(l => l.trim()).filter(Boolean);
      if (payload.languages.length === 0) delete payload.languages;
    } else {
      delete payload.languages;
    }

    // Omit empty optional fields
    Object.keys(payload).forEach(key => {
      if (payload[key] === "" || payload[key] === undefined) {
        delete payload[key];
      }
    });

    submitRegistration.mutate(
      { data: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetHealthWorkerRegistrationStatusQueryKey() });
          toast({ title: "Registration submitted successfully", description: "Your facility admin will review it." });
          setLocation("/health-worker/account");
        },
        onError: (err: any) => {
          toast({ title: "Submission failed", description: err.message || String(err), variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Register as a Health Worker</h1>
        <div className="flex items-center gap-2 mb-6">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`h-2 flex-1 rounded-full ${i < step ? "bg-emerald-600" : "bg-emerald-100"}`} />
          ))}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card className="border-emerald-100 shadow-sm">
            <CardHeader className="bg-emerald-50/50 border-b border-emerald-100/50 pb-4">
              <CardTitle className="text-xl text-emerald-900">
                {step === 1 && "Personal Information"}
                {step === 2 && "Professional Details"}
                {step === 3 && "Workplace Assignment"}
                {step === 4 && "Account Security"}
                {step === 5 && "Review & Submit"}
              </CardTitle>
              <CardDescription>
                {step === 1 && "Basic contact and demographic details."}
                {step === 2 && "Your role and qualifications."}
                {step === 3 && "Select the PHC or facility you report to."}
                {step === 4 && "Your sign-in details are securely managed."}
                {step === 5 && "Verify your information before submitting."}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {step === 1 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl><Input {...field} data-testid="input-fullName" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl><Input {...field} type="tel" data-testid="input-phone" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl><Input {...field} type="email" data-testid="input-email" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-gender"><SelectValue placeholder="Select gender" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl><Input {...field} type="date" data-testid="input-dob" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Residential Address</FormLabel>
                        <FormControl><Input {...field} data-testid="input-address" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="workerType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Worker Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-workerType"><SelectValue placeholder="Select type" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {workerTypes.map((type) => (
                              <SelectItem key={type} value={type}>{type.replace(/_/g, " ")}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="workerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Official ID (Optional)</FormLabel>
                          <FormControl><Input {...field} data-testid="input-workerId" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="yearsExperience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Years of Experience</FormLabel>
                          <FormControl><Input {...field} type="number" min="0" data-testid="input-experience" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="training"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Training / Qualifications</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. Basic Healthcare Training 2021" data-testid="input-training" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <FormControl><Input {...field} data-testid="input-department" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="areaServed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Area Served</FormLabel>
                          <FormControl><Input {...field} data-testid="input-areaServed" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="languages"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Languages (comma separated)</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. English, Hindi, Tamil" data-testid="input-languages" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Search facility by name or code (min 3 chars)..."
                      className="pl-9"
                      value={facilitySearch}
                      onChange={(e) => setFacilitySearch(e.target.value)}
                      data-testid="input-facilitySearch"
                    />
                  </div>
                  {facilitiesLoading && <div className="text-sm text-slate-500 py-2">Searching facilities...</div>}

                  <div className="space-y-2 mt-4 max-h-[300px] overflow-y-auto">
                    {facilities?.map((facility) => (
                      <div
                        key={facility.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          form.watch("facilityId") === facility.id
                            ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500"
                            : "bg-white border-slate-200 hover:border-emerald-300"
                        }`}
                        onClick={() => form.setValue("facilityId", facility.id)}
                        data-testid={`card-facility-${facility.id}`}
                      >
                        <div className="font-semibold text-slate-900">{facility.name}</div>
                        <div className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                          <Hospital className="h-3 w-3" /> {facility.type}
                          {facility.city && (
                            <>
                              <MapPin className="h-3 w-3 ml-2" /> {facility.city}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {debouncedSearch.length >= 3 && facilities?.length === 0 && (
                      <div className="text-sm text-slate-600 p-4 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        No facilities found. If your facility is not listed, a facility manager must create it first.
                      </div>
                    )}
                  </div>
                  {form.formState.errors.facilityId && (
                    <div className="text-sm font-medium text-red-500 mt-2">{form.formState.errors.facilityId.message}</div>
                  )}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-lg border border-slate-200 text-center">
                    <ShieldCheck className="h-12 w-12 text-teal-600 mb-3" />
                    <h3 className="font-semibold text-lg text-slate-900">Secure Account Management</h3>
                    <p className="text-slate-600 text-sm mt-2 max-w-md">
                      Your password and sign-in details are securely managed by your identity provider. Sushruth does not store your password.
                    </p>
                  </div>
                  <div className="grid gap-4">
                    <div className="p-4 border rounded-lg flex items-center gap-4 bg-white">
                      <div className="bg-emerald-100 p-2 rounded-full text-emerald-700">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm text-slate-500">Connected Identity</div>
                        <div className="font-medium text-slate-900">{user?.primaryEmailAddress?.emailAddress || "Phone Number User"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-6">
                  <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg flex gap-3">
                    <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
                    <p className="text-sm leading-relaxed">
                      Review your details. Once submitted, a facility administrator must approve your request before you gain clinical access.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                      <div>
                        <div className="text-slate-500 mb-1 flex items-center gap-1.5"><User className="h-4 w-4" /> Name</div>
                        <div className="font-medium text-slate-900">{form.watch("fullName")}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 mb-1 flex items-center gap-1.5"><BriefcaseMedical className="h-4 w-4" /> Role</div>
                        <div className="font-medium text-slate-900">{form.watch("workerType")}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-slate-500 mb-1 flex items-center gap-1.5"><Hospital className="h-4 w-4" /> Facility</div>
                        <div className="font-medium text-slate-900">
                          {(() => {
                            const facId = form.watch("facilityId");
                            const selectedFacility = facilities?.find(f => f.id === facId);
                            if (selectedFacility) {
                              return `${selectedFacility.name} (${selectedFacility.type})${selectedFacility.city ? ` - ${selectedFacility.city}` : ''}`;
                            }
                            return facId;
                          })()}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 mb-1 flex items-center gap-1.5"><FileText className="h-4 w-4" /> Phone</div>
                        <div className="font-medium text-slate-900">{form.watch("phone") || "Not provided"}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 mb-1 flex items-center gap-1.5"><FileText className="h-4 w-4" /> Languages</div>
                        <div className="font-medium text-slate-900">{form.watch("languages") || "Not provided"}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 mb-1 flex items-center gap-1.5"><FileText className="h-4 w-4" /> Department</div>
                        <div className="font-medium text-slate-900">{form.watch("department") || "Not provided"}</div>
                      </div>
                      <div>
                        <div className="text-slate-500 mb-1 flex items-center gap-1.5"><MapPin className="h-4 w-4" /> Area Served</div>
                        <div className="font-medium text-slate-900">{form.watch("areaServed") || "Not provided"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="bg-slate-50 border-t border-slate-100 p-6 flex justify-between">
              {step > 1 ? (
                <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)}>
                  Back
                </Button>
              ) : (
                <div />
              )}

              {step < totalSteps ? (
                <Button type="button" onClick={handleNext} className="bg-emerald-600 hover:bg-emerald-700">
                  Next Step
                </Button>
              ) : (
                <Button type="submit" disabled={submitRegistration.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                  {submitRegistration.isPending ? "Submitting..." : "Submit Registration"}
                </Button>
              )}
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
