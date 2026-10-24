export type ClinicalQuestionCategory =
  | "general"
  | "pain"
  | "cardiovascular"
  | "respiratory"
  | "gastrointestinal"
  | "neurological"
  | "fever"
  | "musculoskeletal"
  | "urinary"
  | "skin"
  | "mental-wellbeing";

export type ClinicalQuestion = {
  id: string;
  category: ClinicalQuestionCategory;
  text: string;
  clinicalField: string;
  inputType: "text" | "choice";
  options?: string[];
  required: boolean;
};

export type ClinicalQuestionContext = {
  complaint: string;
  severity: string;
  medicalHistory: string;
  answers: Record<string, string>;
};

const includesAny = (value: string, words: string[]) =>
  words.some((word) => value.toLowerCase().includes(word));

export function classifyComplaint(complaint: string): ClinicalQuestionCategory {
  if (includesAny(complaint, ["chest", "heart", "palpitation", "pressure"])) return "cardiovascular";
  if (includesAny(complaint, ["breath", "cough", "wheez", "asthma"])) return "respiratory";
  if (includesAny(complaint, ["stomach", "abdom", "belly", "vomit", "diarr", "constipat"])) return "gastrointestinal";
  if (includesAny(complaint, ["headache", "migraine", "dizzy", "numb", "weakness", "seizure"])) return "neurological";
  if (includesAny(complaint, ["fever", "chill", "infection"])) return "fever";
  if (includesAny(complaint, ["joint", "back", "muscle", "sprain", "knee", "shoulder"])) return "musculoskeletal";
  if (includesAny(complaint, ["urine", "urinary", "burning urination", "kidney"])) return "urinary";
  if (includesAny(complaint, ["rash", "itch", "skin", "swelling"])) return "skin";
  if (includesAny(complaint, ["anxiety", "panic", "sad", "depress", "sleep", "stress"])) return "mental-wellbeing";
  if (includesAny(complaint, ["pain", "ache", "hurt", "burning", "stabbing"])) return "pain";
  return "general";
}

const BASE_QUESTIONS: ClinicalQuestion[] = [
  {
    id: "symptom-description",
    category: "general",
    text: "Please describe exactly what the symptom feels like.",
    clinicalField: "hpi.character",
    inputType: "text",
    required: true,
  },
  {
    id: "symptom-pattern",
    category: "general",
    text: "Is the symptom constant, or does it come and go?",
    clinicalField: "hpi.pattern",
    inputType: "choice",
    options: ["Constant", "Comes and goes", "Not sure"],
    required: true,
  },
  {
    id: "better-worse",
    category: "general",
    text: "What makes it better or worse?",
    clinicalField: "hpi.modifyingFactors",
    inputType: "text",
    required: false,
  },
  {
    id: "symptom-progression",
    category: "general",
    text: "Since it began, is the symptom improving, worsening, or staying the same?",
    clinicalField: "hpi.progression",
    inputType: "choice",
    options: ["Improving", "Worsening", "No change", "Not sure"],
    required: true,
  },
  {
    id: "daily-impact",
    category: "general",
    text: "How is this symptom affecting your usual daily activities?",
    clinicalField: "hpi.functionalImpact",
    inputType: "text",
    required: true,
  },
  {
    id: "previous-episodes",
    category: "general",
    text: "Have you had the same or a similar symptom before?",
    clinicalField: "hpi.previousEpisodes",
    inputType: "choice",
    options: ["Yes", "No", "Not sure"],
    required: true,
  },
  {
    id: "treatment-tried",
    category: "general",
    text: "Have you tried any medicine, home remedy, or other treatment for it?",
    clinicalField: "hpi.treatmentTried",
    inputType: "text",
    required: false,
  },
  {
    id: "recent-change",
    category: "general",
    text: "Did this begin after an injury, illness, new medicine, food, travel, or other change?",
    clinicalField: "hpi.precipitatingEvent",
    inputType: "text",
    required: false,
  },
  {
    id: "patient-concern",
    category: "general",
    text: "Is there anything about this symptom that especially worries you?",
    clinicalField: "hpi.patientConcern",
    inputType: "text",
    required: false,
  },
];

const CATEGORY_QUESTIONS: Record<ClinicalQuestionCategory, ClinicalQuestion[]> = {
  general: [
    { id: "other-symptoms", category: "general", text: "Have you noticed any other new symptoms?", clinicalField: "hpi.associatedSymptoms", inputType: "text", required: false },
  ],
  pain: [
    { id: "pain-location", category: "pain", text: "Where exactly do you feel the pain?", clinicalField: "hpi.location", inputType: "text", required: true },
    { id: "pain-radiation", category: "pain", text: "Does the pain move to another part of your body?", clinicalField: "hpi.radiation", inputType: "choice", options: ["Yes", "No", "Not sure"], required: true },
  ],
  cardiovascular: [
    { id: "chest-character", category: "cardiovascular", text: "Is it pressure, burning, stabbing, or squeezing?", clinicalField: "hpi.character", inputType: "choice", options: ["Pressure", "Burning", "Stabbing", "Squeezing", "Other"], required: true },
    { id: "chest-radiation", category: "cardiovascular", text: "Does it move to your arm, jaw, back, or shoulder?", clinicalField: "hpi.radiation", inputType: "choice", options: ["Yes", "No", "Not sure"], required: true },
    { id: "chest-exertion", category: "cardiovascular", text: "Does it happen or worsen during physical activity?", clinicalField: "hpi.exertional", inputType: "choice", options: ["Yes", "No", "Not sure"], required: true },
    { id: "chest-associated", category: "cardiovascular", text: "Do you also have breathlessness, sweating, dizziness, or nausea?", clinicalField: "hpi.associatedSymptoms", inputType: "text", required: true },
  ],
  respiratory: [
    { id: "breathing-rest", category: "respiratory", text: "Are you short of breath while resting?", clinicalField: "hpi.dyspneaAtRest", inputType: "choice", options: ["Yes", "No", "Not sure"], required: true },
    { id: "cough-sputum", category: "respiratory", text: "Are you coughing up phlegm or blood?", clinicalField: "hpi.sputum", inputType: "choice", options: ["No", "Phlegm", "Blood", "Not sure"], required: true },
    { id: "breathing-position", category: "respiratory", text: "Is it harder to breathe when lying flat?", clinicalField: "hpi.orthopnea", inputType: "choice", options: ["Yes", "No", "Not sure"], required: false },
  ],
  gastrointestinal: [
    { id: "abdomen-location", category: "gastrointestinal", text: "Where in your abdomen do you feel the problem?", clinicalField: "hpi.location", inputType: "text", required: true },
    { id: "food-effect", category: "gastrointestinal", text: "Does eating make it better or worse?", clinicalField: "hpi.foodRelationship", inputType: "choice", options: ["Better", "Worse", "No change", "Not sure"], required: false },
    { id: "bowel-vomiting", category: "gastrointestinal", text: "Have you had vomiting or a change in your stools?", clinicalField: "hpi.associatedSymptoms", inputType: "text", required: true },
  ],
  neurological: [
    { id: "neuro-sudden", category: "neurological", text: "Did the symptom start suddenly?", clinicalField: "hpi.suddenOnset", inputType: "choice", options: ["Yes", "No", "Not sure"], required: true },
    { id: "neuro-deficit", category: "neurological", text: "Do you have weakness, numbness, vision change, confusion, or trouble speaking?", clinicalField: "hpi.neurologicalDeficit", inputType: "text", required: true },
    { id: "headache-features", category: "neurological", text: "Does light or sound bother you, or do you feel nauseated?", clinicalField: "hpi.associatedSymptoms", inputType: "text", required: false },
  ],
  fever: [
    { id: "fever-measured", category: "fever", text: "Was your temperature measured? If known, enter the reading.", clinicalField: "hpi.temperature", inputType: "text", required: false },
    { id: "fever-pattern", category: "fever", text: "Is the fever constant, or does it come and go?", clinicalField: "hpi.pattern", inputType: "choice", options: ["Constant", "Comes and goes", "Not sure"], required: true },
    { id: "infection-symptoms", category: "fever", text: "Do you also have cough, rash, pain while urinating, vomiting, or diarrhea?", clinicalField: "hpi.associatedSymptoms", inputType: "text", required: true },
  ],
  musculoskeletal: [
    { id: "movement-effect", category: "musculoskeletal", text: "Does movement make it worse?", clinicalField: "hpi.movementRelationship", inputType: "choice", options: ["Yes", "No", "Not sure"], required: true },
    { id: "injury", category: "musculoskeletal", text: "Was there a recent injury or unusual physical activity?", clinicalField: "hpi.precipitatingEvent", inputType: "text", required: false },
    { id: "joint-signs", category: "musculoskeletal", text: "Is there swelling, redness, warmth, or reduced movement?", clinicalField: "hpi.associatedSymptoms", inputType: "text", required: false },
  ],
  urinary: [
    { id: "urinary-features", category: "urinary", text: "Do you have burning, urgency, frequent urination, or blood in urine?", clinicalField: "hpi.urinarySymptoms", inputType: "text", required: true },
    { id: "urinary-fever", category: "urinary", text: "Do you also have fever or pain in your side or back?", clinicalField: "hpi.associatedSymptoms", inputType: "text", required: true },
  ],
  skin: [
    { id: "skin-location", category: "skin", text: "Where on your body is the skin problem?", clinicalField: "hpi.location", inputType: "text", required: true },
    { id: "skin-spread", category: "skin", text: "Is it spreading quickly?", clinicalField: "hpi.progression", inputType: "choice", options: ["Yes", "No", "Not sure"], required: true },
    { id: "skin-associated", category: "skin", text: "Is there pain, itching, fever, swelling, or discharge?", clinicalField: "hpi.associatedSymptoms", inputType: "text", required: false },
  ],
  "mental-wellbeing": [
    { id: "wellbeing-impact", category: "mental-wellbeing", text: "How is this affecting sleep, appetite, work, or daily activities?", clinicalField: "hpi.functionalImpact", inputType: "text", required: true },
    { id: "wellbeing-safety", category: "mental-wellbeing", text: "Have you had thoughts of harming yourself or someone else?", clinicalField: "safety.selfHarm", inputType: "choice", options: ["Yes", "No", "Prefer not to say"], required: true },
  ],
};

export function getAdaptiveQuestions(context: ClinicalQuestionContext): ClinicalQuestion[] {
  const category = classifyComplaint(context.complaint);
  const questions = [...BASE_QUESTIONS, ...CATEGORY_QUESTIONS[category]];

  if (["Severe", "Unbearable"].includes(context.severity)) {
    questions.push({
      id: "severe-function",
      category,
      text: "What are you unable to do because of this symptom?",
      clinicalField: "hpi.functionalImpact",
      inputType: "text",
      required: true,
    });
  }

  if (context.medicalHistory.trim()) {
    questions.push({
      id: "history-relationship",
      category,
      text: "Have you had this problem before, and was it related to any known condition?",
      clinicalField: "hpi.previousEpisodes",
      inputType: "text",
      required: false,
    });
  }

  const radiation = context.answers["chest-radiation"] ?? context.answers["pain-radiation"];
  if (radiation === "Yes") {
    questions.push({
      id: "radiation-location",
      category,
      text: "Where does the symptom move to?",
      clinicalField: "hpi.radiationLocation",
      inputType: "text",
      required: true,
    });
  }

  return questions;
}

export function derivePotentialRedFlags(
  safety: Record<string, string>,
  hpiAnswers: Record<string, string>,
): string[] {
  const flags = Object.entries(safety)
    .filter(([, value]) => value === "Yes")
    .map(([id]) => id);
  if (hpiAnswers["wellbeing-safety"] === "Yes") flags.push("self_harm");
  return Array.from(new Set(flags));
}