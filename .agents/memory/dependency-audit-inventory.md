---
name: Dependency audit inventory
description: Python requirements findings are not proof of the installed training environment's versions.
---

Check dependency definitions and the actual installed Python inventory separately.
The dependency scanner reports minimum versions from Python requirements, even
when the installed packages are newer. Raising minimums can remove findings
without upgrading the installed packages.

**Why:** The managed Python installer failed against an immutable Nix directory
while the dependency scan improved from requirement-file changes alone.
Treating the scan as an installation check would falsely certify the training
environment.

**How to apply:** For Python security changes, inspect package metadata after
installation and report any installation blocker independently of scan counts.
The optional training environment is not the Node website's runtime. Do not
modify the Nix store or create an unsupported virtual environment to bypass a
managed installer failure.
