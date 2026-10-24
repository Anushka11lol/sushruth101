"""
Overfitting Analysis — CNN Autoencoder
Generates 4 diagnostic matrices/charts to detect overfitting:
  1. Train vs Validation MSE per sample (side-by-side bar matrix)
  2. Reconstruction error distribution (KDE + histogram)
  3. Residual heat-map matrix (mean pixel error across the 80-sample grid)
  4. Summary confusion-style table: Low / Medium / High error buckets

Run:
  python overfitting_analysis.py
Output:
  overfitting_analysis.png
"""

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import onnxruntime as ort

ENCODER_PATH = "../../artifacts/sushruth/public/models/encoder.onnx"
DECODER_PATH  = "../../artifacts/api-server/models/decoder.onnx"
N   = 80          # samples per set
H, W = 256, 256

# ── Reproducible RNGs ────────────────────────────────────────────────────────
# seed 99 → same distribution as the 50 training images used (in-distribution)
# seed  7 → never-seen-before image patterns             (out-of-distribution)
rng_train = np.random.default_rng(99)
rng_val   = np.random.default_rng(7)

def make_image(i, rng):
    """Synthetic medical-document image (same generator as training set)."""
    base = np.ones((3, H, W), dtype=np.float32) * 0.93
    for _ in range(rng.integers(4, 20)):
        y  = int(rng.integers(8, H - 8))
        lw = int(rng.integers(1, 4))
        wx = int(rng.integers(40, W - 30))
        x0 = int(rng.integers(0, W - wx))
        base[:, y:y+lw, x0:x0+wx] = rng.random(3).reshape(3,1,1) * 0.65
    if i % 7 == 0:
        for row in range(18, H-18, 14): base[:, row:row+1, 18:W-18] = 0.12
        for col in range(18, W-18, 28): base[:, 18:H-18, col:col+1] = 0.12
    if i % 11 == 0:
        base = (base + rng.random((3,H,W)).astype(np.float32)*0.28).clip(0,1)
    return base

def make_val_image(i, rng):
    """Harder validation images — rotated, contrast-shifted, denser noise."""
    base = np.ones((3, H, W), dtype=np.float32) * rng.uniform(0.80, 0.97)
    # denser random text blocks
    for _ in range(rng.integers(8, 28)):
        y  = int(rng.integers(5, H - 5))
        lw = int(rng.integers(1, 6))
        wx = int(rng.integers(20, W - 10))
        x0 = int(rng.integers(0, W - wx))
        base[:, y:y+lw, x0:x0+wx] = rng.random(3).reshape(3,1,1) * 0.50
    # circular/elliptic stamps (unseen shape type)
    cx, cy, rx, ry = (int(rng.integers(60,196)), int(rng.integers(60,196)),
                      int(rng.integers(10,40)),  int(rng.integers(10,40)))
    yy, xx = np.ogrid[:H, :W]
    mask = ((xx-cx)**2/rx**2 + (yy-cy)**2/ry**2) <= 1
    base[:, mask] = rng.random(3).reshape(3,1) * 0.4
    # uniform background noise
    base = (base + rng.random((3,H,W)).astype(np.float32)*0.18).clip(0,1)
    return base

print("Building image sets…")
train_imgs = np.stack([make_image(i,     rng_train) for i in range(N)])
val_imgs   = np.stack([make_val_image(i, rng_val)   for i in range(N)])

print("Loading ONNX models…")
enc = ort.InferenceSession(ENCODER_PATH)
dec = ort.InferenceSession(DECODER_PATH)

def run_mse(imgs):
    mses = []
    for i in range(len(imgs)):
        img   = imgs[i:i+1]
        lat   = enc.run(["output"], {"input": img})[0]
        recon = dec.run(["output"], {"input": lat})[0]
        mses.append(float(np.mean((img - recon)**2)))
    return np.array(mses)

print("Running inference on training-distribution images…")
mse_train = run_mse(train_imgs)
print("Running inference on validation (unseen-distribution) images…")
mse_val   = run_mse(val_imgs)

MSE_THRESH = 0.10
acc_train = np.clip((1 - mse_train / MSE_THRESH) * 100, 0, 100)
acc_val   = np.clip((1 - mse_val   / MSE_THRESH) * 100, 0, 100)

# Overfitting score: how much worse on validation vs train
overfit_gap = mse_val - mse_train    # positive = worse on val
overfit_pct = acc_train - acc_val    # positive = model favours train data

# Bucket classification
def bucket(arr):
    low  = np.sum(arr < 0.02)
    med  = np.sum((arr >= 0.02) & (arr < 0.05))
    high = np.sum(arr >= 0.05)
    return low, med, high

low_t, med_t, high_t = bucket(mse_train)
low_v, med_v, high_v = bucket(mse_val)

print(f"\nTrain   — mean MSE: {mse_train.mean():.5f}  acc: {acc_train.mean():.1f}%")
print(f"Val     — mean MSE: {mse_val.mean():.5f}  acc: {acc_val.mean():.1f}%")
print(f"Mean overfitting gap (MSE): {overfit_gap.mean():.5f}")
print(f"Mean accuracy drop  (acc ): {overfit_pct.mean():.2f}%")

overfit_label = (
    "No overfitting detected" if overfit_gap.mean() < 0.005 else
    "Mild overfitting"        if overfit_gap.mean() < 0.015 else
    "Moderate overfitting"    if overfit_gap.mean() < 0.030 else
    "Strong overfitting"
)
print(f"Verdict: {overfit_label}")

# ── Colours ──────────────────────────────────────────────────────────────────
BG    = "#0f172a"; PANEL = "#1e293b"; BORD  = "#334155"
BLUE  = "#38bdf8"; ORG   = "#fb923c"; GREEN = "#34d399"
AMBER = "#fbbf24"; RED   = "#f87171"; MUTED = "#64748b"; WHITE = "#f1f5f9"
VIOLET= "#a78bfa"

samples = np.arange(1, N+1)
fig = plt.figure(figsize=(18, 14), facecolor=BG)
gs  = gridspec.GridSpec(3, 2, figure=fig, hspace=0.48, wspace=0.30,
                        left=0.07, right=0.97, top=0.91, bottom=0.07)

# ════════════════════════════════════════════════════════════════════════════
# Panel 1 — MSE per sample: Train vs Validation bar matrix
# ════════════════════════════════════════════════════════════════════════════
ax1 = fig.add_subplot(gs[0, :])
ax1.set_facecolor(PANEL)
for sp in ax1.spines.values(): sp.set_edgecolor(BORD)

bw = 0.4
ax1.bar(samples - bw/2, mse_train, bw, color=BLUE,  alpha=0.85, label="Train (in-distribution)")
ax1.bar(samples + bw/2, mse_val,   bw, color=ORG,   alpha=0.85, label="Validation (unseen)")
ax1.axhline(mse_train.mean(), color=BLUE,  lw=1.5, ls="--", alpha=0.7, label=f"Train mean {mse_train.mean():.4f}")
ax1.axhline(mse_val.mean(),   color=ORG,   lw=1.5, ls="--", alpha=0.7, label=f"Val mean   {mse_val.mean():.4f}")
ax1.axhline(0.01, color=GREEN, lw=1.2, ls=":", label="90% accuracy threshold (MSE=0.01)")

# shade overfit zone
ax1.fill_between(samples, mse_train, mse_val,
                 where=mse_val > mse_train, alpha=0.12, color=RED,
                 label="Overfitting gap")

ax1.set_title("Matrix 1 — Reconstruction MSE: Train vs Validation per Sample",
              color=WHITE, fontsize=11, fontweight="bold", pad=9, family="monospace")
ax1.set_xlabel("Sample index", color=MUTED, fontsize=9)
ax1.set_ylabel("MSE (lower is better)", color=MUTED, fontsize=9)
ax1.tick_params(colors=MUTED, labelsize=8)
ax1.set_xlim(0.5, N+0.5)
ax1.grid(axis="y", color=BORD, lw=0.5, alpha=0.6)
ax1.legend(fontsize=8, facecolor=PANEL, edgecolor=BORD, labelcolor=WHITE,
           ncol=3, loc="upper right")

ax1.text(2, ax1.get_ylim()[1]*0.93,
         f"Verdict: {overfit_label}  |  Mean gap: {overfit_gap.mean():.5f} MSE  |  "
         f"Acc drop: {overfit_pct.mean():.2f}%",
         color=GREEN if "No" in overfit_label else AMBER,
         fontsize=9, family="monospace", fontweight="bold")

# ════════════════════════════════════════════════════════════════════════════
# Panel 2 — Error distribution (histogram overlay)
# ════════════════════════════════════════════════════════════════════════════
ax2 = fig.add_subplot(gs[1, 0])
ax2.set_facecolor(PANEL)
for sp in ax2.spines.values(): sp.set_edgecolor(BORD)

bins = np.linspace(0, max(mse_train.max(), mse_val.max())*1.1, 25)
ax2.hist(mse_train, bins=bins, color=BLUE, alpha=0.6, label="Train", density=True)
ax2.hist(mse_val,   bins=bins, color=ORG,  alpha=0.6, label="Validation", density=True)
ax2.axvline(mse_train.mean(), color=BLUE, lw=2, ls="--")
ax2.axvline(mse_val.mean(),   color=ORG,  lw=2, ls="--")
ax2.axvline(0.01, color=GREEN, lw=1.5, ls=":", label="90% threshold")

ax2.set_title("Matrix 2 — Error Distribution",
              color=WHITE, fontsize=10, fontweight="bold", pad=8, family="monospace")
ax2.set_xlabel("MSE", color=MUTED, fontsize=8.5)
ax2.set_ylabel("Density", color=MUTED, fontsize=8.5)
ax2.tick_params(colors=MUTED, labelsize=7.5)
ax2.legend(fontsize=8.5, facecolor=PANEL, edgecolor=BORD, labelcolor=WHITE)
ax2.grid(axis="y", color=BORD, lw=0.5, alpha=0.5)

# ════════════════════════════════════════════════════════════════════════════
# Panel 3 — Overfitting gap per sample (sorted)
# ════════════════════════════════════════════════════════════════════════════
ax3 = fig.add_subplot(gs[1, 1])
ax3.set_facecolor(PANEL)
for sp in ax3.spines.values(): sp.set_edgecolor(BORD)

sorted_gap = np.sort(overfit_gap)
colors_gap = [RED if g > 0.015 else AMBER if g > 0 else GREEN for g in sorted_gap]
ax3.bar(np.arange(N), sorted_gap, color=colors_gap, alpha=0.85, width=0.85)
ax3.axhline(0,    color=WHITE, lw=1.0, ls="-")
ax3.axhline(0.015, color=RED,  lw=1.2, ls="--", label="High overfitting line")
ax3.axhline(-0.005, color=GREEN, lw=1.2, ls="--", label="Under-fitting line")

ax3.set_title("Matrix 3 — Overfitting Gap (sorted, val−train MSE)",
              color=WHITE, fontsize=10, fontweight="bold", pad=8, family="monospace")
ax3.set_xlabel("Samples (sorted by gap)", color=MUTED, fontsize=8.5)
ax3.set_ylabel("MSE gap (val − train)", color=MUTED, fontsize=8.5)
ax3.tick_params(colors=MUTED, labelsize=7.5)
ax3.legend(fontsize=8, facecolor=PANEL, edgecolor=BORD, labelcolor=WHITE)
ax3.grid(axis="y", color=BORD, lw=0.5, alpha=0.5)

positive = np.sum(overfit_gap > 0)
ax3.text(1, sorted_gap.max()*0.88,
         f"{positive}/{N} samples overfitting\n{N-positive}/{N} generalising well",
         color=WHITE, fontsize=8, family="monospace")

# ════════════════════════════════════════════════════════════════════════════
# Panel 4 — Confusion-style error bucket matrix
# ════════════════════════════════════════════════════════════════════════════
ax4 = fig.add_subplot(gs[2, :])
ax4.set_facecolor(BG)
ax4.axis("off")

matrix_data = np.array([
    [low_t,  med_t,  high_t,  int(acc_train.mean()), int(mse_train.mean()*10000)],
    [low_v,  med_v,  high_v,  int(acc_val.mean()),   int(mse_val.mean()  *10000)],
])
col_labels = ["Low error\n(MSE<0.02)", "Medium error\n(0.02–0.05)",
              "High error\n(MSE>0.05)", "Mean accuracy\n(%)", "Mean MSE\n(×10⁻⁴)"]
row_labels  = ["Train set\n(in-distribution)", "Validation set\n(unseen patterns)"]

cell_colors = []
for row_i, row in enumerate(matrix_data):
    row_colors = []
    for col_i, val in enumerate(row):
        if col_i == 0:   row_colors.append("#14532d" if val > N*0.6 else "#713f12")
        elif col_i == 1: row_colors.append("#713f12" if val > N*0.2 else "#14532d")
        elif col_i == 2: row_colors.append("#7f1d1d" if val > N*0.1 else "#14532d")
        elif col_i == 3: row_colors.append("#14532d" if val >= 90 else "#713f12" if val >= 75 else "#7f1d1d")
        else:            row_colors.append("#1e293b")
    cell_colors.append(row_colors)

table = ax4.table(
    cellText  =[[str(v) for v in row] for row in matrix_data],
    rowLabels =row_labels,
    colLabels =col_labels,
    cellColours=cell_colors,
    rowColours =[PANEL, PANEL],
    colColours =[BORD]*5,
    loc="center",
    cellLoc="center",
)
table.auto_set_font_size(False)
table.set_fontsize(10)
table.scale(1, 2.6)

for (r, c), cell in table.get_celld().items():
    cell.set_edgecolor(BORD)
    cell.set_text_props(color=WHITE, family="monospace")

ax4.set_title("Matrix 4 — Error Bucket Confusion Table (Train vs Validation)",
              color=WHITE, fontsize=10, fontweight="bold", pad=8,
              family="monospace", loc="left", x=0.01)

# ── Super-title ──────────────────────────────────────────────────────────────
fig.text(0.5, 0.965,
    f"Sushruth CNN Autoencoder — Overfitting Analysis  ·  "
    f"Train acc {acc_train.mean():.1f}%  ·  Val acc {acc_val.mean():.1f}%  ·  "
    f"Gap {overfit_pct.mean():.1f}%  ·  {N} samples each",
    ha="center", fontsize=9, color=MUTED, family="monospace")

out = "overfitting_analysis.png"
plt.savefig(out, dpi=150, bbox_inches="tight", facecolor=BG)
plt.close()
print(f"\nChart saved → {out}")
