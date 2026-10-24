---
name: Accessibility speech engines
description: The boundary between browser speech and generated multilingual audio in Sushruth.
---

Use browser speech synthesis for navigation and general app read-aloud. Reserve authenticated, generated multilingual audio for interactive content inside the Pre-Consultation workflow.

**Why:** The user wants the app-wide reader restored to its earlier browser-native behavior while retaining higher-quality multilingual speech for the detailed Pre-Consultation workflow.

**How to apply:** Navigation must always use browser speech, including when focused from the Pre-Consultation page. Only elements inside Pre-Consultation's main content and its page-reading action use generated audio. Both engines must cancel stale speech.