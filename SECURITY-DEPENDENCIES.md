# Dependency remediation

## Status (2026-10-10)

The project's dependency-definition scan decreased from 158 findings
(18 critical, 79 high, 49 moderate, 12 low) to one high finding.
No advisory has been suppressed, and package versions have not been falsified.

Patched releases are required for the affected Node dependencies, including
Orval, Vite, esbuild, sharp, HTTP proxy middleware, and their transitive
dependencies. `pnpm-lock.yaml` locks the resolved versions. The one-day package
release-age policy remains enabled.

### Remaining published advisory: braces

- Advisory: `GHSA-vfj7-8cjw-p6xm`
- Affected versions: `braces@3.0.3`; the GitHub advisory currently lists no
  patched release, and npm still lists 3.0.3 as latest.
- Dependency paths include HTTP proxy middleware's micromatch, development
  filesystem globbing, and code generation.
- No upstream fixed version is available.
- `patches/braces@3.0.3.patch`, registered through pnpm's `patchedDependencies`,
  limits parser nesting and the compile/expand/stringify AST walkers to 128
  levels. Excessive nesting fails with a controlled `SyntaxError`, before
  reaching native call-stack exhaustion. Normal glob behavior is retained.
- The application's Clerk proxy does not accept user-provided glob patterns.
  Any future use accepting untrusted patterns must catch validation exceptions.
- Thirteen regression tests cover both dependency paths, valid expansion,
  escaping, balanced and unbalanced deeply nested strings within the original
  character limit, and caller-provided ASTs:
  `node --test scripts/tests/dependency-security.test.cjs`
- `pnpm audit` still reports the finding because it evaluates the published
  package version and does not account for the local patch. Replace the patch
  with an upstream fixed release when available, rerun the tests, and rerun the
  audit. Do not suppress the advisory or claim a zero finding while no upstream
  fixed release exists.

### Python training environment: upgrade not installed

`scripts/autoencoder/requirements.txt` now requires patched minimum versions of
torch, ONNX, Pillow, and tqdm. Training setup scripts consume that requirements
file instead of an independent unbounded package list. Checkpoint loaders
explicitly request `weights_only=True`; model files must still be trusted.

**The scan reads the Python requirement minimums, not the installed runtime
inventory. Its improved result does not establish that the optional Python
training environment has been upgraded.**

The managed Python installer failed while attempting to write MarkupSafe into
the read-only Nix Python system directory. Installed versions remained:

| Package | Installed | Required minimum |
| --- | --- | --- |
| torch | 2.12.0 | 2.13.0 |
| torchvision | 0.27.0 | 0.28.0 |
| onnx | 1.21.0 | 1.22.0 |
| Pillow | 12.2.0 | 12.3.0 |

Do not run training/import untrusted images or models with these old versions.
Repair the managed installer environment, install the updated requirements,
check the installed package metadata, and smoke-test model export before
resuming training. Do not work around this by modifying the Nix store or by
creating an unsupported virtual environment.

The website/API use Node sharp and onnxruntime-node, not these Python training
packages. Native PNG processing and loading the existing decoder were checked.
Existing trained models were not regenerated or replaced.

## Verification

- Main website, API, feature deck, demo video, and component sandbox builds pass.
- Main website and API TypeScript checks pass.
- Updated Orval generates a client from the project's OpenAPI specification into
  a temporary location; existing generated app contracts were not overwritten.
- All five managed workflows run after restart; API health endpoint returns 200.
- Desktop landing-page screenshot renders with no JavaScript errors.
- Full root TypeScript check remains blocked by pre-existing missing React
  module/type declarations in `lib/integrations-openai-ai-react`. This is separate
  from the dependency vulnerabilities and was not changed in this remediation.
