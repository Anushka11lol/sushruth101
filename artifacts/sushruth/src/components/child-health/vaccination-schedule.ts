import { addWeeks, addMonths, addYears, addDays, parseISO } from "date-fns";
import { VaccinationScheduleInputRecordsItem } from "@workspace/api-client-react";

export type ScheduleType = "UIP" | "IAP";

export interface ScheduleDefinition {
  vaccineName: string;
  doseLabel: string;
  recommendedAge: string;
  recommendedWindow: string; // e.g. "Birth to 2 weeks"
  windowEndOffset: { type: "weeks" | "months" | "years" | "days"; value: number };
  purpose: string;
  offset: { type: "weeks" | "months" | "years" | "days"; value: number };
  isSupplement?: boolean;
}

const uipSchedule: ScheduleDefinition[] = [
  { vaccineName: "BCG", doseLabel: "Dose 1", recommendedAge: "Birth", recommendedWindow: "Birth to 1 year", windowEndOffset: { type: "years", value: 1 }, purpose: "Protects against Tuberculosis", offset: { type: "days", value: 0 } },
  { vaccineName: "OPV", doseLabel: "Zero Dose", recommendedAge: "Birth", recommendedWindow: "Birth to 15 days", windowEndOffset: { type: "days", value: 15 }, purpose: "Protects against Polio", offset: { type: "days", value: 0 } },
  { vaccineName: "Hepatitis B", doseLabel: "Birth Dose", recommendedAge: "Birth", recommendedWindow: "Within 24 hours of birth", windowEndOffset: { type: "days", value: 1 }, purpose: "Protects against Hepatitis B", offset: { type: "days", value: 0 } },
  
  { vaccineName: "OPV", doseLabel: "Dose 1", recommendedAge: "6 weeks", recommendedWindow: "6 weeks to 5 years", windowEndOffset: { type: "years", value: 5 }, purpose: "Protects against Polio", offset: { type: "weeks", value: 6 } },
  { vaccineName: "Pentavalent", doseLabel: "Dose 1", recommendedAge: "6 weeks", recommendedWindow: "6 weeks to 1 year", windowEndOffset: { type: "years", value: 1 }, purpose: "Protects against Diphtheria, Pertussis, Tetanus, Hep B, Hib", offset: { type: "weeks", value: 6 } },
  { vaccineName: "Rotavirus", doseLabel: "Dose 1", recommendedAge: "6 weeks", recommendedWindow: "6 weeks to 1 year", windowEndOffset: { type: "years", value: 1 }, purpose: "Protects against Rotavirus Diarrhea", offset: { type: "weeks", value: 6 } },
  { vaccineName: "fIPV", doseLabel: "Dose 1", recommendedAge: "6 weeks", recommendedWindow: "6 weeks to 1 year", windowEndOffset: { type: "years", value: 1 }, purpose: "Protects against Polio", offset: { type: "weeks", value: 6 } },
  { vaccineName: "PCV", doseLabel: "Dose 1", recommendedAge: "6 weeks", recommendedWindow: "6 weeks to 1 year", windowEndOffset: { type: "years", value: 1 }, purpose: "Protects against Pneumococcal disease", offset: { type: "weeks", value: 6 } },
  
  { vaccineName: "OPV", doseLabel: "Dose 2", recommendedAge: "10 weeks", recommendedWindow: "10 weeks to 5 years", windowEndOffset: { type: "years", value: 5 }, purpose: "Protects against Polio", offset: { type: "weeks", value: 10 } },
  { vaccineName: "Pentavalent", doseLabel: "Dose 2", recommendedAge: "10 weeks", recommendedWindow: "10 weeks to 1 year", windowEndOffset: { type: "years", value: 1 }, purpose: "Protects against Diphtheria, Pertussis, Tetanus, Hep B, Hib", offset: { type: "weeks", value: 10 } },
  { vaccineName: "Rotavirus", doseLabel: "Dose 2", recommendedAge: "10 weeks", recommendedWindow: "10 weeks to 1 year", windowEndOffset: { type: "years", value: 1 }, purpose: "Protects against Rotavirus Diarrhea", offset: { type: "weeks", value: 10 } },
  
  { vaccineName: "OPV", doseLabel: "Dose 3", recommendedAge: "14 weeks", recommendedWindow: "14 weeks to 5 years", windowEndOffset: { type: "years", value: 5 }, purpose: "Protects against Polio", offset: { type: "weeks", value: 14 } },
  { vaccineName: "Pentavalent", doseLabel: "Dose 3", recommendedAge: "14 weeks", recommendedWindow: "14 weeks to 1 year", windowEndOffset: { type: "years", value: 1 }, purpose: "Protects against Diphtheria, Pertussis, Tetanus, Hep B, Hib", offset: { type: "weeks", value: 14 } },
  { vaccineName: "Rotavirus", doseLabel: "Dose 3", recommendedAge: "14 weeks", recommendedWindow: "14 weeks to 1 year", windowEndOffset: { type: "years", value: 1 }, purpose: "Protects against Rotavirus Diarrhea", offset: { type: "weeks", value: 14 } },
  { vaccineName: "fIPV", doseLabel: "Dose 2", recommendedAge: "14 weeks", recommendedWindow: "14 weeks to 1 year", windowEndOffset: { type: "years", value: 1 }, purpose: "Protects against Polio", offset: { type: "weeks", value: 14 } },
  { vaccineName: "PCV", doseLabel: "Dose 2", recommendedAge: "14 weeks", recommendedWindow: "14 weeks to 1 year", windowEndOffset: { type: "years", value: 1 }, purpose: "Protects against Pneumococcal disease", offset: { type: "weeks", value: 14 } },
  
  { vaccineName: "MR", doseLabel: "Dose 1", recommendedAge: "9 months", recommendedWindow: "9 months to 5 years", windowEndOffset: { type: "years", value: 5 }, purpose: "Protects against Measles, Rubella", offset: { type: "months", value: 9 } },
  { vaccineName: "JE (where applicable)", doseLabel: "Dose 1", recommendedAge: "9 months", recommendedWindow: "9 months to 15 years", windowEndOffset: { type: "years", value: 15 }, purpose: "Protects against Japanese Encephalitis", offset: { type: "months", value: 9 } },
  { vaccineName: "PCV", doseLabel: "Booster", recommendedAge: "9 months", recommendedWindow: "9 months to 1 year", windowEndOffset: { type: "years", value: 1 }, purpose: "Protects against Pneumococcal disease", offset: { type: "months", value: 9 } },
  { vaccineName: "Vitamin A", doseLabel: "Dose 1", recommendedAge: "9 months", recommendedWindow: "9 months to 5 years", windowEndOffset: { type: "years", value: 5 }, purpose: "Preventive supplementation for eye health and immunity", offset: { type: "months", value: 9 }, isSupplement: true },
  
  { vaccineName: "MR", doseLabel: "Dose 2", recommendedAge: "16 months", recommendedWindow: "16 months to 5 years", windowEndOffset: { type: "years", value: 5 }, purpose: "Protects against Measles, Rubella", offset: { type: "months", value: 16 } },
  { vaccineName: "JE (where applicable)", doseLabel: "Dose 2", recommendedAge: "16 months", recommendedWindow: "16 months to 15 years", windowEndOffset: { type: "years", value: 15 }, purpose: "Protects against Japanese Encephalitis", offset: { type: "months", value: 16 } },
  { vaccineName: "DPT", doseLabel: "Booster 1", recommendedAge: "16 months", recommendedWindow: "16 months to 5 years", windowEndOffset: { type: "years", value: 5 }, purpose: "Protects against Diphtheria, Pertussis, Tetanus", offset: { type: "months", value: 16 } },
  { vaccineName: "OPV", doseLabel: "Booster", recommendedAge: "16 months", recommendedWindow: "16 months to 5 years", windowEndOffset: { type: "years", value: 5 }, purpose: "Protects against Polio", offset: { type: "months", value: 16 } },
  { vaccineName: "Vitamin A", doseLabel: "Dose 2", recommendedAge: "16 months", recommendedWindow: "16 months to 5 years", windowEndOffset: { type: "years", value: 5 }, purpose: "Preventive supplementation", offset: { type: "months", value: 16 }, isSupplement: true },
  
  { vaccineName: "DPT", doseLabel: "Booster 2", recommendedAge: "5 years", recommendedWindow: "5 to 6 years", windowEndOffset: { type: "years", value: 6 }, purpose: "Protects against Diphtheria, Pertussis, Tetanus", offset: { type: "years", value: 5 } },
  { vaccineName: "Td", doseLabel: "Dose 1", recommendedAge: "10 years", recommendedWindow: "At 10 years", windowEndOffset: { type: "years", value: 11 }, purpose: "Protects against Tetanus, Diphtheria", offset: { type: "years", value: 10 } },
  { vaccineName: "Td", doseLabel: "Dose 2", recommendedAge: "16 years", recommendedWindow: "At 16 years", windowEndOffset: { type: "years", value: 17 }, purpose: "Protects against Tetanus, Diphtheria", offset: { type: "years", value: 16 } },
];

const iapSchedule: ScheduleDefinition[] = [
  { vaccineName: "BCG", doseLabel: "Dose 1", recommendedAge: "Birth", recommendedWindow: "Birth to 1 year", windowEndOffset: { type: "years", value: 1 }, purpose: "Protects against Tuberculosis", offset: { type: "days", value: 0 } },
  { vaccineName: "OPV", doseLabel: "Zero Dose", recommendedAge: "Birth", recommendedWindow: "Birth to 15 days", windowEndOffset: { type: "days", value: 15 }, purpose: "Protects against Polio", offset: { type: "days", value: 0 } },
  { vaccineName: "Hepatitis B", doseLabel: "Dose 1", recommendedAge: "Birth", recommendedWindow: "Within 24 hours of birth", windowEndOffset: { type: "days", value: 1 }, purpose: "Protects against Hepatitis B", offset: { type: "days", value: 0 } },
  
  { vaccineName: "DTaP", doseLabel: "Dose 1", recommendedAge: "6 weeks", recommendedWindow: "6 to 8 weeks", windowEndOffset: { type: "weeks", value: 8 }, purpose: "Protects against Diphtheria, Tetanus, Pertussis", offset: { type: "weeks", value: 6 } },
  { vaccineName: "IPV", doseLabel: "Dose 1", recommendedAge: "6 weeks", recommendedWindow: "6 to 8 weeks", windowEndOffset: { type: "weeks", value: 8 }, purpose: "Protects against Polio", offset: { type: "weeks", value: 6 } },
  { vaccineName: "Hepatitis B", doseLabel: "Dose 2", recommendedAge: "6 weeks", recommendedWindow: "6 to 8 weeks", windowEndOffset: { type: "weeks", value: 8 }, purpose: "Protects against Hepatitis B", offset: { type: "weeks", value: 6 } },
  { vaccineName: "Hib", doseLabel: "Dose 1", recommendedAge: "6 weeks", recommendedWindow: "6 to 8 weeks", windowEndOffset: { type: "weeks", value: 8 }, purpose: "Protects against Haemophilus influenzae type b", offset: { type: "weeks", value: 6 } },
  { vaccineName: "Rotavirus", doseLabel: "Dose 1", recommendedAge: "6 weeks", recommendedWindow: "6 to 8 weeks", windowEndOffset: { type: "weeks", value: 8 }, purpose: "Protects against Rotavirus Diarrhea", offset: { type: "weeks", value: 6 } },
  { vaccineName: "PCV", doseLabel: "Dose 1", recommendedAge: "6 weeks", recommendedWindow: "6 to 8 weeks", windowEndOffset: { type: "weeks", value: 8 }, purpose: "Protects against Pneumococcal disease", offset: { type: "weeks", value: 6 } },
  
  { vaccineName: "DTaP", doseLabel: "Dose 2", recommendedAge: "10 weeks", recommendedWindow: "10 to 12 weeks", windowEndOffset: { type: "weeks", value: 12 }, purpose: "Protects against Diphtheria, Tetanus, Pertussis", offset: { type: "weeks", value: 10 } },
  { vaccineName: "IPV", doseLabel: "Dose 2", recommendedAge: "10 weeks", recommendedWindow: "10 to 12 weeks", windowEndOffset: { type: "weeks", value: 12 }, purpose: "Protects against Polio", offset: { type: "weeks", value: 10 } },
  { vaccineName: "Hib", doseLabel: "Dose 2", recommendedAge: "10 weeks", recommendedWindow: "10 to 12 weeks", windowEndOffset: { type: "weeks", value: 12 }, purpose: "Protects against Haemophilus influenzae type b", offset: { type: "weeks", value: 10 } },
  { vaccineName: "Rotavirus", doseLabel: "Dose 2", recommendedAge: "10 weeks", recommendedWindow: "10 to 12 weeks", windowEndOffset: { type: "weeks", value: 12 }, purpose: "Protects against Rotavirus Diarrhea", offset: { type: "weeks", value: 10 } },
  { vaccineName: "PCV", doseLabel: "Dose 2", recommendedAge: "10 weeks", recommendedWindow: "10 to 12 weeks", windowEndOffset: { type: "weeks", value: 12 }, purpose: "Protects against Pneumococcal disease", offset: { type: "weeks", value: 10 } },

  { vaccineName: "DTaP", doseLabel: "Dose 3", recommendedAge: "14 weeks", recommendedWindow: "14 to 16 weeks", windowEndOffset: { type: "weeks", value: 16 }, purpose: "Protects against Diphtheria, Tetanus, Pertussis", offset: { type: "weeks", value: 14 } },
  { vaccineName: "IPV", doseLabel: "Dose 3", recommendedAge: "14 weeks", recommendedWindow: "14 to 16 weeks", windowEndOffset: { type: "weeks", value: 16 }, purpose: "Protects against Polio", offset: { type: "weeks", value: 14 } },
  { vaccineName: "Hib", doseLabel: "Dose 3", recommendedAge: "14 weeks", recommendedWindow: "14 to 16 weeks", windowEndOffset: { type: "weeks", value: 16 }, purpose: "Protects against Haemophilus influenzae type b", offset: { type: "weeks", value: 14 } },
  { vaccineName: "Rotavirus", doseLabel: "Dose 3", recommendedAge: "14 weeks", recommendedWindow: "14 to 16 weeks", windowEndOffset: { type: "weeks", value: 16 }, purpose: "Protects against Rotavirus Diarrhea", offset: { type: "weeks", value: 14 } },
  { vaccineName: "PCV", doseLabel: "Dose 3", recommendedAge: "14 weeks", recommendedWindow: "14 to 16 weeks", windowEndOffset: { type: "weeks", value: 16 }, purpose: "Protects against Pneumococcal disease", offset: { type: "weeks", value: 14 } },
  { vaccineName: "Hepatitis B", doseLabel: "Dose 4", recommendedAge: "14 weeks", recommendedWindow: "14 to 16 weeks", windowEndOffset: { type: "weeks", value: 16 }, purpose: "Protects against Hepatitis B", offset: { type: "weeks", value: 14 } },

  { vaccineName: "Influenza", doseLabel: "Dose 1", recommendedAge: "6 months", recommendedWindow: "6 to 9 months", windowEndOffset: { type: "months", value: 9 }, purpose: "Protects against Influenza", offset: { type: "months", value: 6 } },
  { vaccineName: "Influenza", doseLabel: "Dose 2", recommendedAge: "7 months", recommendedWindow: "At 7 months", windowEndOffset: { type: "months", value: 8 }, purpose: "Protects against Influenza", offset: { type: "months", value: 7 } },
  { vaccineName: "Typhoid Conjugate Vaccine", doseLabel: "Dose 1", recommendedAge: "6 months", recommendedWindow: "6 to 9 months", windowEndOffset: { type: "months", value: 9 }, purpose: "Protects against Typhoid", offset: { type: "months", value: 6 } },

  { vaccineName: "MMR", doseLabel: "Dose 1", recommendedAge: "9 months", recommendedWindow: "9 to 12 months", windowEndOffset: { type: "months", value: 12 }, purpose: "Protects against Measles, Mumps, Rubella", offset: { type: "months", value: 9 } },
  { vaccineName: "Hepatitis A", doseLabel: "Dose 1", recommendedAge: "12 months", recommendedWindow: "12 to 15 months", windowEndOffset: { type: "months", value: 15 }, purpose: "Protects against Hepatitis A", offset: { type: "months", value: 12 } },
  
  { vaccineName: "MMR", doseLabel: "Dose 2", recommendedAge: "15 months", recommendedWindow: "15 to 18 months", windowEndOffset: { type: "months", value: 18 }, purpose: "Protects against Measles, Mumps, Rubella", offset: { type: "months", value: 15 } },
  { vaccineName: "Varicella", doseLabel: "Dose 1", recommendedAge: "15 months", recommendedWindow: "15 to 18 months", windowEndOffset: { type: "months", value: 18 }, purpose: "Protects against Chickenpox", offset: { type: "months", value: 15 } },
  { vaccineName: "PCV", doseLabel: "Booster", recommendedAge: "15 months", recommendedWindow: "15 to 18 months", windowEndOffset: { type: "months", value: 18 }, purpose: "Protects against Pneumococcal disease", offset: { type: "months", value: 15 } },

  { vaccineName: "DTaP", doseLabel: "Booster 1", recommendedAge: "16 months", recommendedWindow: "16 to 18 months", windowEndOffset: { type: "months", value: 18 }, purpose: "Protects against Diphtheria, Tetanus, Pertussis", offset: { type: "months", value: 16 } },
  { vaccineName: "IPV", doseLabel: "Booster 1", recommendedAge: "16 months", recommendedWindow: "16 to 18 months", windowEndOffset: { type: "months", value: 18 }, purpose: "Protects against Polio", offset: { type: "months", value: 16 } },
  { vaccineName: "Hib", doseLabel: "Booster 1", recommendedAge: "16 months", recommendedWindow: "16 to 18 months", windowEndOffset: { type: "months", value: 18 }, purpose: "Protects against Haemophilus influenzae type b", offset: { type: "months", value: 16 } },

  { vaccineName: "Hepatitis A", doseLabel: "Dose 2", recommendedAge: "18 months", recommendedWindow: "18 to 19 months", windowEndOffset: { type: "months", value: 19 }, purpose: "Protects against Hepatitis A", offset: { type: "months", value: 18 } },
  { vaccineName: "Varicella", doseLabel: "Dose 2", recommendedAge: "18 months", recommendedWindow: "18 to 19 months", windowEndOffset: { type: "months", value: 19 }, purpose: "Protects against Chickenpox", offset: { type: "months", value: 18 } },

  { vaccineName: "Typhoid", doseLabel: "Booster", recommendedAge: "2 years", recommendedWindow: "2 to 3 years", windowEndOffset: { type: "years", value: 3 }, purpose: "Protects against Typhoid", offset: { type: "years", value: 2 } },
  { vaccineName: "DTaP", doseLabel: "Booster 2", recommendedAge: "4 years", recommendedWindow: "4 to 6 years", windowEndOffset: { type: "years", value: 6 }, purpose: "Protects against Diphtheria, Tetanus, Pertussis", offset: { type: "years", value: 4 } },
  { vaccineName: "IPV", doseLabel: "Booster 2", recommendedAge: "4 years", recommendedWindow: "4 to 6 years", windowEndOffset: { type: "years", value: 6 }, purpose: "Protects against Polio", offset: { type: "years", value: 4 } },
  { vaccineName: "MMR", doseLabel: "Dose 3", recommendedAge: "4 years", recommendedWindow: "4 to 6 years", windowEndOffset: { type: "years", value: 6 }, purpose: "Protects against Measles, Mumps, Rubella", offset: { type: "years", value: 4 } },

  { vaccineName: "HPV", doseLabel: "Dose 1", recommendedAge: "9 years", recommendedWindow: "9 to 14 years", windowEndOffset: { type: "years", value: 14 }, purpose: "Protects against HPV", offset: { type: "years", value: 9 } },
  { vaccineName: "Tdap", doseLabel: "Dose 1", recommendedAge: "10 years", recommendedWindow: "10 to 12 years", windowEndOffset: { type: "years", value: 12 }, purpose: "Protects against Tetanus, Diphtheria, Pertussis", offset: { type: "years", value: 10 } },
  { vaccineName: "HPV", doseLabel: "Age-based course", recommendedAge: "15 years", recommendedWindow: "15 to 18 years; based on age, sex and immunization status", windowEndOffset: { type: "years", value: 18 }, purpose: "Protects against HPV; follow the current pediatrician recommendation", offset: { type: "years", value: 15 } },
  { vaccineName: "Td/Tdap", doseLabel: "Adolescent dose", recommendedAge: "16 years", recommendedWindow: "16 to 18 years", windowEndOffset: { type: "years", value: 18 }, purpose: "Protects against Tetanus and Diphtheria, with Pertussis coverage when Tdap is used", offset: { type: "years", value: 16 } },
];

export function generateScheduleItems(dob: Date | string, type: ScheduleType): VaccinationScheduleInputRecordsItem[] {
  const birthDate = typeof dob === "string" ? parseISO(dob) : dob;
  const defs = type === "UIP" ? uipSchedule : iapSchedule;

  return defs.map(def => {
    let scheduledDate = birthDate;
    if (def.offset.type === "days") {
      // Days is 0, so keep it birthDate
    } else if (def.offset.type === "weeks") {
      scheduledDate = addWeeks(birthDate, def.offset.value);
    } else if (def.offset.type === "months") {
      scheduledDate = addMonths(birthDate, def.offset.value);
    } else if (def.offset.type === "years") {
      scheduledDate = addYears(birthDate, def.offset.value);
    }

    return {
      vaccineName: def.vaccineName,
      doseLabel: def.doseLabel,
      recommendedAge: def.recommendedAge,
      recommendedWindow: def.recommendedWindow,
      scheduledDate: scheduledDate.toISOString().slice(0, 10),
      purpose: def.purpose,
    };
  });
}

export function isSupplement(vaccineName: string): boolean {
  return uipSchedule.concat(iapSchedule).some(v => v.vaccineName === vaccineName && v.isSupplement);
}

export function getWindowEndDate(vaccineName: string, doseLabel: string, type: ScheduleType, dob: Date | string): Date | null {
  const birthDate = typeof dob === "string" ? parseISO(dob) : dob;
  const defs = type === "UIP" ? uipSchedule : iapSchedule;
  const def = defs.find(d => d.vaccineName === vaccineName && d.doseLabel === doseLabel);
  if (!def) return null;
  
  let end = birthDate;
  if (def.windowEndOffset.type === "days") {
    end = addDays(birthDate, def.windowEndOffset.value);
  } else if (def.windowEndOffset.type === "weeks") {
    end = addWeeks(birthDate, def.windowEndOffset.value);
  } else if (def.windowEndOffset.type === "months") {
    end = addMonths(birthDate, def.windowEndOffset.value);
  } else if (def.windowEndOffset.type === "years") {
    end = addYears(birthDate, def.windowEndOffset.value);
  }
  return end;
}
