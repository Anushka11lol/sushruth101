---
name: Longitudinal health observations
description: Safety and cost rules for patterns inferred from repeated patient health records.
---

Only surface a recurring health observation when substantially similar symptoms, triggers, or circumstances appear in at least two separate completed records. Phrase it as something the patient reported or that appears repeatedly; never claim a diagnosis, susceptibility, allergy, intolerance, or causal relationship.

**Why:** Patients may treat an AI pattern as a confirmed medical fact. Repeated wording can be useful context, but it is not evidence that one behavior caused a symptom or that an infection or condition is present.

**How to apply:** Analyze only when at least two records exist, return no pattern when evidence is weak, show the evidence count and disclaimer, and cache by source-history fingerprint and language so unchanged history does not trigger another AI call.