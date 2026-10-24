import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, CheckCircle2, Clock, XCircle, AlertTriangle, UserCircle, Search } from "lucide-react";
import {
  useGetHealthWorkerRegistrationStatus,
  useUpdateHealthWorkerRegistrationProfile,
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
  languages: z.string().optional(),
  yearsExperience: z.coerce.number().min(0).max(100).optional(),
  department: z.string().optional(),
  areaServed: z.string().optional(),
  facilityId: z.number().optional(),
});

type FormValues = z.infer<typeof formSchema>;

import { Link } from "wouter";

export default function HealthWorkerAccount() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const { data: statusData, isLoading } = useGetHealthWorkerRegistrationStatus({
    query: { queryKey: getGetHealthWorkerRegistrationStatusQueryKey(), retry: false, retryOnMount: false, refetchOnMount: false }
  });

  const updateProfile = useUpdateHealthWorkerRegistrationProfile();

  const reg = statusData?.registration as any;
  const associations = (statusData?.associations as any[]) || [];
  const latestAssoc = associations[0];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      workerType: "ASHA",
    },
  });

  const [facilitySearch, setFacilitySearch] = useState("");
  const debouncedSearch = useDebounce(facilitySearch, 500);

  const { data: facilities, isLoading: facilitiesLoading } = useSearchPublicFacilities(
    { q: debouncedSearch },
    {
      query: {
        enabled: isEditing && debouncedSearch.length >= 3,
        queryKey: getSearchPublicFacilitiesQueryKey({ q: debouncedSearch })
      }
    }
  );

  const { data: initialFacilities } = useSearchPublicFacilities(
    { q: "" },
    {
      query: {
        enabled: !isEditing && !!reg?.facilityId,
        queryKey: getSearchPublicFacilitiesQueryKey({ q: "" })
      }
    }
  );

  const currentFacility = initialFacilities?.find((f) => f.id === reg?.facilityId);

  const [initialValues, setInitialValues] = useState<any>({});

  useEffect(() => {
    if (reg) {
      const vals = {
        fullName: reg.fullName || "",
        dateOfBirth: reg.dateOfBirth || "",
        gender: reg.gender || "",
        phone: reg.phone || "",
        email: reg.email || "",
        address: reg.address || "",
        workerType: reg.workerType || "ASHA",
        workerId: reg.workerId || "",
        training: reg.training || "",
        languages: (reg.languages || []).join(", "),
        yearsExperience: reg.yearsExperience || 0,
        department: reg.department || "",
        areaServed: reg.areaServed || "",
        facilityId: reg.facilityId || undefined,
      };
      form.reset(vals);
      setInitialValues(vals);
    }
  }, [reg, form]);

  const onSubmit = (data: FormValues) => {
    const payload: any = {};
    Object.keys(data).forEach(key => {
      const val = data[key as keyof FormValues];
      if (val !== initialValues[key]) {
        if (key === "languages") {
          const arr = (val as string).split(",").map(l => l.trim()).filter(Boolean);
          payload[key] = arr;
        } else if (val === "") {
          payload[key] = undefined;
        } else {
          payload[key] = val;
        }
      }
    });

    if (Object.keys(payload).length === 0) {
      setIsEditing(false);
      return;
    }

    updateProfile.mutate(
      { data: payload },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetHealthWorkerRegistrationStatusQueryKey() });
          toast({ title: "Profile updated", description: "Your details have been saved." });
          setIsEditing(false);
        },
        onError: (err: any) => {
          toast({ title: "Update failed", description: err.message || String(err), variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading account status...</div>;
  }

  if (!reg) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p className="mb-4">No registration found. Please register first.</p>
        <Link href="/health-worker/register">
          <Button data-testid="link-register">
            Complete Professional Profile
          </Button>
        </Link>
      </div>
    );
  }

  const profStatus = reg.professionalStatus;

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Account & Status</h1>
          <p className="text-slate-600 mt-1">Manage your professional profile and facility association.</p>
        </div>
      </div>

      {profStatus === "PENDING" && (
        <Alert className="bg-amber-50 border-amber-200">
          <Clock className="h-5 w-5 text-amber-600" />
          <AlertTitle className="text-amber-800">Pending Verification</AlertTitle>
          <AlertDescription className="text-amber-700 mt-1">
            Your facility association is currently pending review by a facility administrator. You will gain clinical access once approved.
          </AlertDescription>
        </Alert>
      )}

      {profStatus === "REJECTED" && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <XCircle className="h-5 w-5 text-red-600" />
          <AlertTitle className="text-red-800">Association Rejected</AlertTitle>
          <AlertDescription className="text-red-700 mt-1">
            Your request was rejected. Reason: <strong>{reg.rejectionReason || "No reason provided"}</strong>
            <br />Please update your details or contact your facility administrator.
          </AlertDescription>
        </Alert>
      )}

      {profStatus === "UPDATE_REQUIRED" && (
        <Alert className="bg-blue-50 border-blue-200">
          <AlertTriangle className="h-5 w-5 text-blue-600" />
          <AlertTitle className="text-blue-800">Update Required</AlertTitle>
          <AlertDescription className="text-blue-700 mt-1">
            Your profile requires updates before your association can be verified. Please edit your information below.
          </AlertDescription>
        </Alert>
      )}

      {profStatus === "VERIFIED" && (
        <Alert className="bg-emerald-50 border-emerald-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <AlertTitle className="text-emerald-800">Verified & Active</AlertTitle>
          <AlertDescription className="text-emerald-700 mt-1">
            You have active clinical access at your designated facility.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Professional Profile</CardTitle>
                <CardDescription>Your personal and professional information</CardDescription>
              </div>
              {!isEditing && (
                <Button variant="outline" onClick={() => setIsEditing(true)}>Edit Profile</Button>
              )}
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <Form {...form}>
                  <form id="profile-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="bg-amber-50 text-amber-800 p-3 rounded-md text-sm mb-4 border border-amber-200 flex gap-2">
                      <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                      Warning: Changing your worker type, worker ID, training, or facility will require re-verification by your facility admin.
                    </div>

                    <FormField control={form.control} name="fullName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl><Input {...field} data-testid="input-edit-fullName" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="phone" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl><Input {...field} type="tel" data-testid="input-edit-phone" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl><Input {...field} type="email" data-testid="input-edit-email" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="workerType" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Worker Type *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-edit-workerType"><SelectValue placeholder="Select type" /></SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {workerTypes.map((type) => (
                                <SelectItem key={type} value={type}>{type.replace(/_/g, " ")}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="yearsExperience" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Years of Experience</FormLabel>
                          <FormControl><Input {...field} type="number" min="0" data-testid="input-edit-experience" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="department" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <FormControl><Input {...field} data-testid="input-edit-department" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="areaServed" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Area Served</FormLabel>
                          <FormControl><Input {...field} data-testid="input-edit-areaServed" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={form.control} name="languages" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Languages (comma separated)</FormLabel>
                        <FormControl><Input {...field} data-testid="input-edit-languages" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="space-y-4 pt-4 border-t">
                      <FormField control={form.control} name="facilityId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Facility Assignment</FormLabel>
                          <div className="relative mb-2">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                              placeholder="Search new facility to change..."
                              className="pl-9"
                              value={facilitySearch}
                              onChange={(e) => setFacilitySearch(e.target.value)}
                              data-testid="input-edit-facilitySearch"
                            />
                          </div>
                          {facilitiesLoading && <div className="text-sm text-slate-500 py-1">Searching...</div>}
                          <div className="max-h-[200px] overflow-y-auto space-y-2">
                            {facilities?.map((facility) => (
                              <div
                                key={facility.id}
                                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                  field.value === facility.id
                                    ? "bg-emerald-50 border-emerald-500 ring-1 ring-emerald-500"
                                    : "bg-white border-slate-200 hover:border-emerald-300"
                                }`}
                                onClick={() => field.onChange(facility.id)}
                                data-testid={`card-edit-facility-${facility.id}`}
                              >
                                <div className="font-semibold text-slate-900">{facility.name}</div>
                                <div className="text-sm text-slate-500">{facility.type} {facility.city && `- ${facility.city}`}</div>
                              </div>
                            ))}
                          </div>
                          {field.value && !facilities?.find(f => f.id === field.value) && (
                            <div className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded border border-slate-200">
                              Current Facility ID: {field.value}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </form>
                </Form>
              ) : (
                <div className="grid grid-cols-2 gap-y-6 gap-x-4 text-sm">
                  <div>
                    <div className="text-slate-500 mb-1">Full Name</div>
                    <div className="font-medium text-slate-900">{reg.fullName}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 mb-1">Worker Type</div>
                    <div className="font-medium text-slate-900">{reg.workerType?.replace(/_/g, " ")}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 mb-1">Phone</div>
                    <div className="font-medium text-slate-900">{reg.phone || "Not provided"}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 mb-1">Email</div>
                    <div className="font-medium text-slate-900">{reg.email || "Not provided"}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 mb-1">Years of Experience</div>
                    <div className="font-medium text-slate-900">{reg.yearsExperience || 0} years</div>
                  </div>
                </div>
              )}
            </CardContent>
            {isEditing && (
              <CardFooter className="bg-slate-50 border-t border-slate-100 p-6 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => {
                  form.reset();
                  setIsEditing(false);
                }}>Cancel</Button>
                <Button type="submit" form="profile-form" disabled={updateProfile.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                  {updateProfile.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Security & Sign-in</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-full">
                    <UserCircle className="h-6 w-6 text-slate-600" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">Managed Account</div>
                    <div className="text-xs text-slate-500">Your auth provider secures your sign-in details.</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Facility Connection</CardTitle>
            </CardHeader>
            <CardContent>
              {latestAssoc ? (
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="text-slate-500">Facility</div>
                    <div className="font-medium text-slate-900">
                      {currentFacility
                        ? `${currentFacility.name} (${currentFacility.type})${currentFacility.city ? ` - ${currentFacility.city}` : ''}`
                        : `ID: ${latestAssoc.facilityId}`}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Status</div>
                    <div className="font-medium capitalize">{latestAssoc.status?.toLowerCase()}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Requested On</div>
                    <div className="font-medium">{new Date(latestAssoc.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-slate-500">No facility associations found.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
