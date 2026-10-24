import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSearchHealthWorkerPatients, useRegisterHealthWorkerPatient } from "@workspace/api-client-react";
import { Search, UserPlus, FileWarning, AlertCircle, Link2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { getSearchHealthWorkerPatientsQueryKey } from "@workspace/api-client-react";

type Candidate = {
  patientUserId?: string;
  name?: string;
  phone?: string;
  sushruthId?: string;
  matchType?: "registered" | "portal_account";
  registrationStatus?: string;
  linkedToPortal?: boolean;
  id?: string | number;
};

const emptyForm = { name: "", phone: "", sex: "M", dateOfBirth: "" };

export default function HealthWorkerPatients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [linkedCandidate, setLinkedCandidate] = useState<Candidate | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const queryClient = useQueryClient();
  const canSearch = searchQuery.trim().length >= 2;

  const { data: searchResults, isLoading: isSearching } = useSearchHealthWorkerPatients(
    { q: searchQuery },
    { query: { enabled: searchTriggered && canSearch, queryKey: getSearchHealthWorkerPatientsQueryKey({ q: searchQuery }) } }
  );
  const registerPatient = useRegisterHealthWorkerPatient();

  const openBlankRegistration = () => {
    registerPatient.reset();
    setFormData(emptyForm);
    setLinkedCandidate(null);
    setShowRegisterForm(true);
  };

  const openRegistration = (candidate?: Candidate) => {
    registerPatient.reset();
    setLinkedCandidate(candidate || null);
    setFormData({
      ...emptyForm,
      name: candidate?.name || (candidate ? "" : searchQuery),
      phone: candidate?.phone || "",
    });
    setShowRegisterForm(true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSearch) {
      setSearchTriggered(true);
      setShowRegisterForm(false);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const data: {
      name: string;
      phone?: string;
      sex?: string;
      dateOfBirth?: string;
      patientUserId?: string;
    } = { name: formData.name, sex: formData.sex };
    if (formData.phone.trim()) data.phone = formData.phone.trim();
    if (formData.dateOfBirth) data.dateOfBirth = formData.dateOfBirth;
    if (linkedCandidate?.patientUserId) data.patientUserId = linkedCandidate.patientUserId;

    registerPatient.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getSearchHealthWorkerPatientsQueryKey({ q: searchQuery }) });
        setShowRegisterForm(false);
        setLinkedCandidate(null);
        setFormData(emptyForm);
        if (formData.name.trim().length >= 2) {
          setSearchQuery(formData.name);
          setSearchTriggered(true);
        }
      },
    });
  };

  const results = (searchResults || []) as Candidate[];
  const errorMessage = registerPatient.error
    ? (() => {
      const error = registerPatient.error as {
        message?: string;
        response?: { data?: { message?: string; error?: string } };
      };
      return error.response?.data?.message || error.response?.data?.error || error.message ||
        "Registration could not be completed. Please check the details and try again.";
    })()
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Patient Registry</h1>
          <p className="text-slate-600 mt-2">Find existing patients or register new ones with duplicate checking.</p>
        </div>
        <Button onClick={openBlankRegistration} className="w-full shrink-0 bg-emerald-600 hover:bg-emerald-700 sm:w-auto">
          <UserPlus className="h-4 w-4 mr-2" /> Register New Patient
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Patients</CardTitle>
          <CardDescription>Search by name, phone number, or Sushruth ID. Results include registered patients and matching Patient Portal accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input placeholder="Enter name, phone, or ID..." className="pl-9 bg-slate-50" value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setSearchTriggered(false); }} />
            </div>
            <Button type="submit" disabled={!canSearch || isSearching} className="bg-emerald-600 hover:bg-emerald-700">
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </form>
          {searchQuery.length > 0 && !canSearch && <p className="mt-2 text-sm text-slate-500">Enter at least 2 characters to search.</p>}
        </CardContent>
      </Card>

      {searchTriggered && !isSearching && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold text-slate-800">Search Results</h2>
            <Button variant="outline" className="w-full text-emerald-700 border-emerald-200 hover:bg-emerald-50 sm:w-auto" onClick={() => openRegistration()}>
              <UserPlus className="h-4 w-4 mr-2" /> Register from search
            </Button>
          </div>
          {results.length === 0 ? (
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <FileWarning className="h-10 w-10 text-orange-500 mb-3" />
                <h3 className="font-bold text-orange-900">No matching patients found</h3>
                <p className="text-orange-700 mt-1">Please double-check the details or register them as a new patient.</p>
                <Button className="mt-4 bg-orange-600 hover:bg-orange-700 text-white" onClick={() => openRegistration()}>
                  <UserPlus className="h-4 w-4 mr-2" /> Proceed to Registration
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {results.map((patient, i) => {
                const portal = patient.matchType === "portal_account";
                return (
                  <Card key={`${patient.patientUserId || patient.id || patient.sushruthId || i}`} className={`border-l-4 ${portal ? "border-l-sky-500" : "border-l-emerald-500"}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-bold text-lg text-slate-800">{patient.name || "Unknown"}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${portal ? "bg-sky-100 text-sky-800" : "bg-emerald-100 text-emerald-800"}`}>
                          {portal ? "Patient Portal Account" : "Registered"}
                        </span>
                        {!portal && patient.linkedToPortal && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">Linked to Patient Portal</span>}
                      </div>
                      <p className="text-sm text-slate-600">ID: {patient.sushruthId || (patient.id ? `PAT-${patient.id}` : "Not assigned")}</p>
                      <p className="text-sm text-slate-600">Phone: {patient.phone || "Not provided"}</p>
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" variant={portal ? "default" : "secondary"} className="flex-1" onClick={() => portal ? openRegistration(patient) : undefined}>
                          {portal ? <><Link2 className="mr-2 h-4 w-4" /> Link &amp; Register</> : "Select Patient"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showRegisterForm && (
        <Card className="border-emerald-200 shadow-md">
          <CardHeader className="bg-emerald-50 border-b border-emerald-100 pb-4">
            <CardTitle className="text-emerald-800">Register New Patient</CardTitle>
            <CardDescription className="text-emerald-600"><AlertCircle className="inline h-4 w-4 mr-1 relative -top-0.5" />Ensure you have checked for duplicates before proceeding.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {linkedCandidate && (
              <div className="mb-5 flex items-start justify-between gap-3 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                <span><Link2 className="mr-2 inline h-4 w-4" />This registration will link to the existing Sushruth account for <strong>{linkedCandidate.name}</strong>.</span>
                <Button type="button" variant="ghost" size="sm" className="shrink-0 text-sky-800" onClick={() => { registerPatient.reset(); setLinkedCandidate(null); }}><X className="mr-1 h-4 w-4" />Clear link</Button>
              </div>
            )}
            {errorMessage && <div role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMessage}</div>}
            <form onSubmit={handleRegister} className="space-y-4 max-w-xl">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Full Name</Label><Input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Phone Number</Label><Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} /></div>
                <div className="space-y-2"><Label>Date of Birth</Label><Input type="date" value={formData.dateOfBirth} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} /></div>
                <div className="space-y-2"><Label>Gender</Label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={formData.sex} onChange={e => setFormData({ ...formData, sex: e.target.value })}><option value="M">Male</option><option value="F">Female</option><option value="O">Other</option></select></div>
              </div>
              <div className="pt-4 flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => { registerPatient.reset(); setShowRegisterForm(false); }}>Cancel</Button><Button type="submit" disabled={registerPatient.isPending} className="bg-emerald-600 hover:bg-emerald-700">{registerPatient.isPending ? "Registering..." : "Complete Registration"}</Button></div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}