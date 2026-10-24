import { db } from "@workspace/db";
import { doctorsTable } from "@workspace/db";

const now = new Date();
function slot(daysFromNow: number, hour: number) {
  const d = new Date(now);
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const doctors = [
  {
    name: "Dr. Priya Sharma",
    specialty: "Cardiologist",
    hospital: "Apollo Hospitals",
    city: "Mumbai",
    fees: "1500",
    rating: "4.8",
    availableSlots: JSON.stringify([slot(1, 10), slot(1, 14), slot(3, 11), slot(5, 9)]),
  },
  {
    name: "Dr. Rajesh Kumar",
    specialty: "General Physician",
    hospital: "Max Healthcare",
    city: "Delhi",
    fees: "600",
    rating: "4.6",
    availableSlots: JSON.stringify([slot(1, 9), slot(1, 15), slot(2, 10), slot(4, 11)]),
  },
  {
    name: "Dr. Anjali Mehta",
    specialty: "Dermatologist",
    hospital: "Fortis Hospital",
    city: "Bengaluru",
    fees: "1200",
    rating: "4.9",
    availableSlots: JSON.stringify([slot(2, 11), slot(2, 16), slot(6, 10)]),
  },
  {
    name: "Dr. Suresh Patel",
    specialty: "Orthopedist",
    hospital: "Narayana Health",
    city: "Bengaluru",
    fees: "1000",
    rating: "4.7",
    availableSlots: JSON.stringify([slot(1, 12), slot(3, 9), slot(4, 15)]),
  },
  {
    name: "Dr. Meenakshi Iyer",
    specialty: "Neurologist",
    hospital: "MIOT International",
    city: "Chennai",
    fees: "1800",
    rating: "4.9",
    availableSlots: JSON.stringify([slot(2, 10), slot(4, 14), slot(7, 11)]),
  },
  {
    name: "Dr. Arun Nair",
    specialty: "ENT Specialist",
    hospital: "Amrita Institute",
    city: "Kochi",
    fees: "800",
    rating: "4.5",
    availableSlots: JSON.stringify([slot(1, 9), slot(2, 14), slot(5, 10)]),
  },
  {
    name: "Dr. Deepika Reddy",
    specialty: "Gynecologist",
    hospital: "Rainbow Hospitals",
    city: "Hyderabad",
    fees: "1200",
    rating: "4.8",
    availableSlots: JSON.stringify([slot(1, 11), slot(3, 15), slot(6, 9)]),
  },
  {
    name: "Dr. Vikram Singh",
    specialty: "Gastroenterologist",
    hospital: "Medanta",
    city: "Delhi",
    fees: "1500",
    rating: "4.7",
    availableSlots: JSON.stringify([slot(2, 9), slot(4, 13), slot(5, 16)]),
  },
  {
    name: "Dr. Kavitha Nambiar",
    specialty: "Endocrinologist",
    hospital: "Amrita Institute",
    city: "Kochi",
    fees: "1400",
    rating: "4.6",
    availableSlots: JSON.stringify([slot(3, 10), slot(5, 14), slot(7, 9)]),
  },
  {
    name: "Dr. Rohit Gupta",
    specialty: "Pulmonologist",
    hospital: "Fortis Hospital",
    city: "Mumbai",
    fees: "1300",
    rating: "4.7",
    availableSlots: JSON.stringify([slot(1, 16), slot(3, 10), slot(6, 11)]),
  },
  {
    name: "Dr. Sunita Rao",
    specialty: "Psychiatrist",
    hospital: "NIMHANS",
    city: "Bengaluru",
    fees: "1000",
    rating: "4.8",
    availableSlots: JSON.stringify([slot(2, 14), slot(4, 10), slot(7, 15)]),
  },
  {
    name: "Dr. Amit Joshi",
    specialty: "Ophthalmologist",
    hospital: "L V Prasad Eye Institute",
    city: "Hyderabad",
    fees: "900",
    rating: "4.9",
    availableSlots: JSON.stringify([slot(1, 10), slot(3, 14), slot(5, 11)]),
  },
  {
    name: "Dr. Nandita Bose",
    specialty: "Pediatrician",
    hospital: "Institute of Child Health",
    city: "Kolkata",
    fees: "700",
    rating: "4.8",
    availableSlots: JSON.stringify([slot(1, 9), slot(2, 15), slot(4, 10)]),
  },
  {
    name: "Dr. Sanjay Verma",
    specialty: "Urologist",
    hospital: "PGI",
    city: "Chandigarh",
    fees: "1200",
    rating: "4.6",
    availableSlots: JSON.stringify([slot(2, 11), slot(5, 9), slot(6, 14)]),
  },
  {
    name: "Dr. Leela Krishnan",
    specialty: "Oncologist",
    hospital: "Tata Memorial Hospital",
    city: "Mumbai",
    fees: "2000",
    rating: "4.9",
    availableSlots: JSON.stringify([slot(3, 10), slot(5, 14), slot(8, 11)]),
  },
  {
    name: "Dr. Harish Chandra",
    specialty: "General Physician",
    hospital: "AIIMS",
    city: "Delhi",
    fees: "500",
    rating: "4.5",
    availableSlots: JSON.stringify([slot(1, 8), slot(1, 13), slot(3, 9), slot(4, 14)]),
  },
  {
    name: "Dr. Fathima Begum",
    specialty: "Dermatologist",
    hospital: "Aster CMI Hospital",
    city: "Bengaluru",
    fees: "1100",
    rating: "4.7",
    availableSlots: JSON.stringify([slot(1, 15), slot(3, 11), slot(6, 10)]),
  },
  {
    name: "Dr. Rajan Menon",
    specialty: "Cardiologist",
    hospital: "KIMS Hospital",
    city: "Hyderabad",
    fees: "1600",
    rating: "4.8",
    availableSlots: JSON.stringify([slot(2, 9), slot(4, 14), slot(7, 10)]),
  },
  {
    name: "Dr. Smita Kulkarni",
    specialty: "Neurologist",
    hospital: "Kokilaben Hospital",
    city: "Mumbai",
    fees: "1700",
    rating: "4.7",
    availableSlots: JSON.stringify([slot(1, 11), slot(4, 15), slot(7, 9)]),
  },
  {
    name: "Dr. Pramod Tiwari",
    specialty: "Orthopedist",
    hospital: "Sanjay Gandhi PGI",
    city: "Lucknow",
    fees: "800",
    rating: "4.5",
    availableSlots: JSON.stringify([slot(2, 10), slot(4, 14), slot(6, 9)]),
  },
  {
    name: "Dr. Geeta Mathur",
    specialty: "Gynecologist",
    hospital: "SMS Hospital",
    city: "Jaipur",
    fees: "900",
    rating: "4.6",
    availableSlots: JSON.stringify([slot(1, 10), slot(3, 15), slot(5, 11)]),
  },
  {
    name: "Dr. Arjun Kapoor",
    specialty: "Gastroenterologist",
    hospital: "Breach Candy Hospital",
    city: "Mumbai",
    fees: "1400",
    rating: "4.6",
    availableSlots: JSON.stringify([slot(2, 14), slot(5, 10), slot(7, 15)]),
  },
];

async function seed() {
  console.log("Seeding doctors...");
  const existing = await db.select().from(doctorsTable);
  if (existing.length > 0) {
    console.log(`${existing.length} doctors already exist — skipping seed.`);
    process.exit(0);
  }
  await db.insert(doctorsTable).values(doctors);
  console.log(`Inserted ${doctors.length} doctors successfully.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
