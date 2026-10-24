import { useState } from "react";
import { Link } from "wouter";
import { useUser } from "@clerk/react";
import { useScreenReader } from "@/context/ScreenReaderContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListAppointments,
  useListDoctors,
  useCreateAppointment,
  useUpdateAppointment,
  useDeleteAppointment,
  getListAppointmentsQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Plus,
  Star,
  IndianRupee,
  MapPin,
  Stethoscope,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Navigation,
  ExternalLink,
  Volume2,
} from "lucide-react";

const SPECIALTIES = [
  "General Physician", "Cardiologist", "Neurologist", "Orthopedist",
  "Dermatologist", "ENT Specialist", "Gastroenterologist", "Pulmonologist",
  "Gynecologist", "Pediatrician", "Psychiatrist", "Ophthalmologist",
  "Urologist", "Endocrinologist", "Oncologist",
];

const CITIES = [
  "Mumbai", "Delhi", "Bengaluru", "Hyderabad", "Chennai", "Kolkata",
  "Pune", "Ahmedabad", "Jaipur", "Lucknow", "Chandigarh", "Kochi",
];

const STATUS_CONFIG: Record<string, { label: string; class: string; icon: React.ElementType }> = {
  scheduled: { label: "Scheduled", class: "bg-blue-100 text-blue-800 border-blue-200", icon: Clock },
  completed: { label: "Completed", class: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", class: "bg-gray-100 text-gray-700 border-gray-200", icon: XCircle },
};

function openGoogleMaps(hospital: string, city: string) {
  const query = encodeURIComponent(`${hospital} ${city} India`);
  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, "_blank", "noopener,noreferrer");
}

function openNearbyHospitals(specialty?: string) {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const q = encodeURIComponent(specialty ? `${specialty} hospital near me` : "hospital clinic near me");
        window.open(
          `https://www.google.com/maps/search/?api=1&query=${q}&center=${latitude},${longitude}`,
          "_blank",
          "noopener,noreferrer",
        );
      },
      () => {
        const q = encodeURIComponent(specialty ? `${specialty} hospital India` : "hospital near me India");
        window.open(
          `https://www.google.com/maps/search/?api=1&query=${q}`,
          "_blank",
          "noopener,noreferrer",
        );
      },
    );
  } else {
    const q = encodeURIComponent("hospital near me India");
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, "_blank", "noopener,noreferrer");
  }
}

export default function AppointmentsPage() {
  const { user } = useUser();
  const userId = user?.id ?? "";
  const queryClient = useQueryClient();
  const { isEnabled: srEnabled, speak } = useScreenReader();

  const [showBook, setShowBook] = useState(false);
  const [specialtyFilter, setSpecialtyFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [slot, setSlot] = useState("");
  const [reason, setReason] = useState("");

  const { data: appointments, isLoading } = useListAppointments(
    { userId }, { query: { enabled: !!userId } as any },
  );
  const { data: doctors, isLoading: doctorsLoading } = useListDoctors(
    { specialty: specialtyFilter || undefined, city: cityFilter || undefined },
    { query: { enabled: showBook } as any },
  );
  const createAppointment = useCreateAppointment();
  const updateAppointment = useUpdateAppointment();
  const deleteAppointment = useDeleteAppointment();

  const upcoming = appointments?.filter(
    (a) => a.status === "scheduled" && new Date(a.scheduledAt) > new Date(),
  ) ?? [];
  const past = appointments?.filter(
    (a) => a.status !== "scheduled" || new Date(a.scheduledAt) <= new Date(),
  ) ?? [];

  const handleBook = async () => {
    if (!selectedDoc || !slot || !userId) return;
    await createAppointment.mutateAsync({
      data: { userId, doctorId: selectedDoc.id, scheduledAt: slot, reason },
    });
    queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey({ userId }) });
    setShowBook(false);
    setSelectedDoc(null);
    setSlot("");
    setReason("");
  };

  const handleCancel = async (id: number) => {
    if (!confirm("Cancel this appointment?")) return;
    await updateAppointment.mutateAsync({ id, data: { status: "cancelled" } });
    queryClient.invalidateQueries({ queryKey: getListAppointmentsQueryKey({ userId }) });
  };

  const AppointmentCard = ({ a }: { a: any }) => {
    const statusCfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.scheduled;
    const StatusIcon = statusCfg.icon;
    return (
      <Card aria-label={`Appointment with ${a.doctor?.name ?? "Doctor"} on ${new Date(a.scheduledAt).toLocaleDateString("en-IN")}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold shrink-0" aria-hidden="true">
              {a.doctor?.name?.charAt(0) ?? "D"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{a.doctor?.name ?? "Doctor"}</p>
                  <p className="text-sm text-muted-foreground">
                    {a.doctor?.specialty} &middot; {a.doctor?.hospital}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {a.doctor?.city}
                    </p>
                    {a.doctor?.hospital && a.doctor?.city && (
                      <button
                        onClick={() => openGoogleMaps(a.doctor.hospital, a.doctor.city)}
                        className="text-xs text-primary underline flex items-center gap-0.5 hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                        aria-label={`Open ${a.doctor.hospital} in Google Maps`}
                      >
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                        Map
                      </button>
                    )}
                  </div>
                </div>
                <Badge variant="outline" className={`text-xs shrink-0 ${statusCfg.class}`}>
                  <StatusIcon className="h-3 w-3 mr-1" aria-hidden="true" />
                  {statusCfg.label}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  {new Date(a.scheduledAt).toLocaleString("en-IN", {
                    dateStyle: "medium", timeStyle: "short",
                  })}
                </span>
                {a.doctor?.fees && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <IndianRupee className="h-3 w-3" aria-hidden="true" />
                    {Number(a.doctor.fees).toLocaleString("en-IN")}
                  </span>
                )}
              </div>
              {a.reason && (
                <p className="text-xs text-muted-foreground mt-1 italic">{a.reason}</p>
              )}
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              {srEnabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-teal-600 hover:text-teal-700"
                  onClick={() => {
                    const name = a.doctor?.name ?? "a doctor";
                    const specialty = a.doctor?.specialty ?? "";
                    const hospital = a.doctor?.hospital ?? "";
                    const city = a.doctor?.city ?? "";
                    const date = new Date(a.scheduledAt).toLocaleString("en-IN", {
                      dateStyle: "long",
                      timeStyle: "short",
                    });
                    const status = STATUS_CONFIG[a.status]?.label ?? a.status;
                    const fee = a.doctor?.fees
                      ? `Consultation fee: ${Number(a.doctor.fees).toLocaleString("en-IN")} rupees.`
                      : "";
                    const reason = a.reason ? `Reason for visit: ${a.reason}.` : "";
                    speak(
                      `Appointment with ${name}. ${specialty} at ${hospital}, ${city}. Scheduled for ${date}. Status: ${status}. ${fee} ${reason}`.trim(),
                    );
                  }}
                  aria-label={`Read appointment with ${a.doctor?.name ?? "Doctor"} aloud`}
                >
                  <Volume2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
              {a.status === "scheduled" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                  onClick={() => handleCancel(a.id)}
                  aria-label={`Cancel appointment with ${a.doctor?.name ?? "Doctor"}`}
                >
                  <XCircle className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Appointments</h1>
          <p className="text-muted-foreground mt-1">Book and manage your doctor appointments.</p>
        </div>
        <div className="flex items-center gap-2">
            <Link href="/pre-consultation">
              <Button variant="outline" size="sm" aria-label="Start a pre-consultation intake">
                <Stethoscope className="mr-1.5 h-4 w-4" aria-hidden="true" />
                Pre-Consultation
              </Button>
            </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => openNearbyHospitals()}
            aria-label="Find hospitals near your location on Google Maps"
            title="Find hospitals near you"
          >
            <Navigation className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Near Me
          </Button>
          <Button onClick={() => setShowBook(true)} aria-label="Book a new appointment">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Book Appointment
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3" role="status" aria-label="Loading appointments">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : !appointments || appointments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" aria-hidden="true" />
            <h3 className="font-semibold mb-2">No appointments yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Book your first appointment with a specialist.</p>
            <Button onClick={() => setShowBook(true)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Book Appointment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList aria-label="Appointment views">
            <TabsTrigger value="upcoming" data-sr-description="Upcoming appointments — shows consultations that have not happened yet.">Upcoming ({upcoming.length})</TabsTrigger>
            <TabsTrigger value="past" data-sr-description="Past appointments — shows consultations that have already happened.">Past ({past.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="upcoming" className="space-y-3 mt-4">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No upcoming appointments.</p>
            ) : (
              upcoming.map((a) => <AppointmentCard key={a.id} a={a} />)
            )}
          </TabsContent>
          <TabsContent value="past" className="space-y-3 mt-4">
            {past.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No past appointments.</p>
            ) : (
              past.map((a) => <AppointmentCard key={a.id} a={a} />)
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={showBook} onOpenChange={(open) => { if (!open) { setShowBook(false); setSelectedDoc(null); } }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-labelledby="book-appt-title">
          <DialogHeader>
            <DialogTitle id="book-appt-title">Book an Appointment</DialogTitle>
          </DialogHeader>
          {!selectedDoc ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Filter doctors by specialty and city</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openNearbyHospitals(specialtyFilter || undefined)}
                  className="text-xs gap-1"
                  aria-label="Find nearby hospitals on Google Maps"
                >
                  <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                  Find Nearby on Maps
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="filter-specialty">Specialty</Label>
                  <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                    <SelectTrigger id="filter-specialty" className="mt-1">
                      <SelectValue placeholder="All specialties" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIALTIES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="filter-city">City</Label>
                  <Select value={cityFilter} onValueChange={setCityFilter}>
                    <SelectTrigger id="filter-city" className="mt-1">
                      <SelectValue placeholder="All cities" />
                    </SelectTrigger>
                    <SelectContent>
                      {CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {doctorsLoading ? (
                <div className="space-y-2" role="status" aria-label="Loading doctors">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
                </div>
              ) : !doctors || doctors.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No doctors found. Try adjusting filters.
                </p>
              ) : (
                <div className="space-y-2 max-h-[50vh] overflow-y-auto" role="list" aria-label="Available doctors">
                  {doctors.map((doc: any) => (
                    <div
                      key={doc.id}
                      role="listitem"
                      className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/50 transition-colors focus-within:ring-2 focus-within:ring-primary"
                    >
                      <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold shrink-0" aria-hidden="true">
                        {doc.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.specialty} &middot; {doc.hospital}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" aria-hidden="true" /> {doc.city}
                          </p>
                          <button
                            onClick={(e) => { e.stopPropagation(); openGoogleMaps(doc.hospital, doc.city); }}
                            className="text-xs text-primary underline flex items-center gap-0.5 hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                            aria-label={`Open ${doc.hospital} in Google Maps`}
                          >
                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            Map
                          </button>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-0.5 text-xs text-amber-600">
                            <Star className="h-3 w-3 fill-amber-500" aria-hidden="true" />
                            {Number(doc.rating).toFixed(1)}
                          </span>
                          <span className="flex items-center gap-0.5 text-xs">
                            <IndianRupee className="h-3 w-3" aria-hidden="true" />
                            {Number(doc.fees).toLocaleString("en-IN")}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDoc(doc)}
                        aria-label={`Select ${doc.name}`}
                      >
                        Select
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold" aria-hidden="true">
                  {selectedDoc.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{selectedDoc.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedDoc.specialty} &middot; {selectedDoc.hospital}, {selectedDoc.city}</p>
                  <button
                    onClick={() => openGoogleMaps(selectedDoc.hospital, selectedDoc.city)}
                    className="text-xs text-primary underline flex items-center gap-1 mt-0.5 hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-primary rounded"
                    aria-label={`View ${selectedDoc.hospital} on Google Maps`}
                  >
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    View on Google Maps
                  </button>
                </div>
                <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSelectedDoc(null)}>
                  Change
                </Button>
              </div>
              {selectedDoc.availableSlots && selectedDoc.availableSlots.length > 0 ? (
                <div>
                  <Label htmlFor="appt-slot">Available Slots</Label>
                  <Select value={slot} onValueChange={setSlot}>
                    <SelectTrigger id="appt-slot" className="mt-1">
                      <SelectValue placeholder="Choose a slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedDoc.availableSlots.map((s: string) => (
                        <SelectItem key={s} value={s}>
                          {new Date(s).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label htmlFor="appt-datetime">Preferred Date & Time</Label>
                  <Input
                    id="appt-datetime"
                    type="datetime-local"
                    className="mt-1"
                    value={slot}
                    onChange={(e) => setSlot(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
              )}
              <div>
                <Label htmlFor="appt-reason">Reason for Visit</Label>
                <Textarea
                  id="appt-reason"
                  className="mt-1"
                  placeholder="Brief description of your health concern..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBook(false)}>Cancel</Button>
            {selectedDoc && (
              <Button onClick={handleBook} disabled={!slot || createAppointment.isPending}>
                {createAppointment.isPending ? "Booking..." : "Confirm Appointment"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
