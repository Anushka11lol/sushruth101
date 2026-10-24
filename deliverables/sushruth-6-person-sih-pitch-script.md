# Sushruth — Six-Person SIH Pitch Script

**Target speaking time:** 4 minutes 30 seconds  
**Maximum:** 5 minutes  
**Format:** One speaker per slide, with one continuous patient story  
**Replace:** Speaker 1–6 with team members’ names

---

## Speaker 1 — Opening and Problem
**Slide 1 · 0:00–0:35 · 35 seconds**

“Good morning, respected judges. We are Team Invalid Syntax, presenting **Sushruth** for SIH26047’s patient case-taking requirement.

Many consultations begin with a blank page. Doctors rebuild patient histories while language barriers, incomplete answers, and scattered reports hide important details.

Our goal is to help patients explain their condition clearly before consultation—without allowing AI to replace clinical judgement.”

**Handoff:** “To explain how Sushruth solves this, I hand over to Speaker 2.”

---

## Speaker 2 — Proposed Solution and Differentiation
**Slide 2 · 0:35–1:20 · 45 seconds**

“Sushruth is a multilingual, accessibility-first healthcare companion. Patients complete an adaptive pre-consultation using **voice, text, or tap**.

Starting with the chief complaint, it asks relevant follow-ups and captures symptoms, medical history, medications, allergies, and **all twelve AYUSH Dashavidha parameters**.

Patients can upload reports for AI-assisted fact extraction. The result is not a diagnosis; it is a structured summary for the doctor’s review queue.

Our differentiation is one connected workflow: accessible case-taking, AYUSH structure, document extraction, safety screening, and human verification.”

**Handoff:** “Speaker 3 will now take you through the actual patient journey.”

---

## Speaker 3 — Patient Workflow and Demo
**Slide 3 · 1:20–2:15 · 55 seconds**

“Consider a patient with chest pain.

After sign-in and language selection, the patient speaks or types the complaint. Sushruth asks about onset, duration, severity, radiation, breathlessness, exertion, sweating, dizziness, and other associated symptoms.

Dangerous responses trigger immediate guidance to call 108 or seek emergency care—not automated ambulance dispatch.

Stable patients continue through history, medications, allergies, lifestyle, systems review, AYUSH assessment, and optional report upload.

The patient reviews the summary and confirms consent. The doctor receives the case, checks the reported history and extracted facts, adds notes, and marks it reviewed or incomplete.

This creates a clear clinical handoff from an otherwise unstructured conversation.”

**Handoff:** “Speaker 4 will explain what powers this workflow and how we keep it safe.”

---

## Speaker 4 — Architecture, AI, Privacy, and Safety
**Slide 3 · 2:15–3:05 · 50 seconds**

“Sushruth uses **React and Vite**, an **Express and Node.js** API, **PostgreSQL with Drizzle**, typed OpenAPI contracts, and **Clerk authentication**.

Server-side ownership checks protect patient records, while uploaded files remain private.

For safety, we separate explicit rules from generative AI. Complaint follow-ups and critical red-flag checks are deterministic. AI assists with urgency classification, summaries, and document extraction, but cannot prescribe, diagnose, or take autonomous clinical action.

The clinician remains responsible for verification.

ABHA, ABDM, and FHIR are **future scope**, not current integrations.”

**Handoff:** “Speaker 5 will cover feasibility and implementation readiness.”

---

## Speaker 5 — Feasibility and Evidence
**Slides 4 and 5 · 3:05–3:50 · 45 seconds**

“Sushruth is feasible because its core workflow already runs in a browser without specialised hardware.

The prototype includes multilingual accessibility, adaptive pre-consultation, AYUSH fields, AI-assisted triage, report analysis, health records, medication tools, Care Circle connections, and clinician review.

We are transparent about boundaries: no live hospital inventory, payments, ABDM/FHIR connection, offline-first mode, automated dispatch, or production clinical validation.

Before rollout, we would conduct clinician-led case review, red-flag testing, extraction-accuracy measurement, security assessment, and a supervised OPD pilot.”

**Handoff:** “Finally, Speaker 6 will present the impact and our roadmap.”

---

## Speaker 6 — Impact, Scalability, and Closing
**Slide 6 · 3:50–4:30 · 40 seconds**

“Sushruth helps patients facing language, literacy, accessibility, or record-management barriers. Doctors receive an organised history, while families gain consent-based continuity of care.

For scale, web and API services can run horizontally, long AI tasks can move to queues, and PostgreSQL can use managed backups and read scaling. Hospital and standards-based integrations can follow through controlled partnerships.

Our vision is not an AI doctor. It is to ensure that when a real doctor meets a patient, the right information is structured and ready for review.

**Sushruth turns time spent collecting information into time focused on care. Thank you. We are ready for your questions.**”

---

# Demo Coordination

- Speaker 1 controls Slide 1.
- Speaker 2 advances to Slide 2.
- Speaker 3 demonstrates the patient workflow while Slide 3 is visible.
- Speaker 4 points to the architecture and safety flow on Slide 3.
- Speaker 5 advances through Slides 4 and 5.
- Speaker 6 closes on Slide 6 and leaves it displayed during Q&A.

# Timing Buffer

- Scripted speech: approximately **4:30** at a clear SIH presentation pace.
- Transition buffer: approximately **20–25 seconds**.
- Hard-stop cue at **4:40**: Speaker 6 should immediately begin with “Our vision is not to create an AI doctor…”

# Accuracy Guardrails for the Team

Do not say that Sushruth currently provides:

- Live ABHA, ABDM, or FHIR integration
- Hospital/EHR integration
- Automated ambulance dispatch or Care Circle emergency alerts
- Offline-first operation
- A verified diagnosis or autonomous prescription
- Production clinical validation or measured time savings

If asked, say these are either future scope or require controlled clinical validation.