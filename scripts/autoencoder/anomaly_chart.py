"""
Anomaly line chart: measures how much data is lost when images pass
through the CNN bottleneck (encoder → compressed → decoder).

Each point = one image's MSE (mean squared error) between original and
reconstructed pixels. Points above the threshold are anomalies —
the decoder could not recover the original data well enough.

Usage:
  python anomaly_chart.py
Output:
  anomaly_reconstruction_loss.png
"""

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
from matplotlib.lines import Line2D
import onnxruntime as ort

ENCODER_PATH = "../../artifacts/sushruth/public/models/encoder.onnx"
DECODER_PATH = "../../artifacts/api-server/models/decoder.onnx"

rng = np.random.default_rng(0)

# ── Generate 80 synthetic "report-like" images ───────────────────────────────
N = 80
H, W = 256, 256

def make_image(i, rng):
    """Simulate varying document types with different complexity levels."""
    base = rng.random((3, H, W)).astype(np.float32) * 0.15 + 0.85  # white background
    n_lines = rng.integers(3, 18)
    for _ in range(n_lines):
        y = rng.integers(10, H - 10)
        w = rng.integers(40, W - 20)
        x = rng.integers(0, W - w)
        thickness = rng.integers(1, 4)
        base[:, y:y+thickness, x:x+w] = rng.random(3).reshape(3,1,1) * 0.7
    # Occasionally add high-frequency noise (hard cases → more data loss)
    if i % 12 == 0:
        base += rng.random((3, H, W)).astype(np.float32) * 0.35
        base = base.clip(0, 1)
    if i % 7 == 0:
        # Dense table-like region
        for row in range(20, H-20, 12):
            base[:, row:row+1, 20:W-20] = 0.1
        for col in range(20, W-20, 30):
            base[:, 20:H-20, col:col+1] = 0.1
    return base

images = np.stack([make_image(i, rng) for i in range(N)])  # (N,3,256,256)

# ── Run encoder → decoder through ONNX ──────────────────────────────────────
print("Loading ONNX models…")
enc = ort.InferenceSession(ENCODER_PATH)
dec = ort.InferenceSession(DECODER_PATH)

mse_values   = []
pixel_losses = []

print(f"Processing {N} images through bottleneck…")
for i in range(N):
    img = images[i:i+1]
    latent = enc.run(["output"], {"input": img})[0]       # compress
    recon  = dec.run(["output"], {"input": latent})[0]    # reconstruct
    mse    = float(np.mean((img - recon) ** 2))
    max_px = float(np.max(np.abs(img - recon)))
    mse_values.append(mse)
    pixel_losses.append(max_px)
    if (i + 1) % 20 == 0:
        print(f"  {i+1}/{N} done")

mse_arr   = np.array(mse_values)
px_arr    = np.array(pixel_losses)
samples   = np.arange(1, N + 1)

# ── Anomaly threshold = mean + 1.5 × std ────────────────────────────────────
threshold   = mse_arr.mean() + 1.5 * mse_arr.std()
anomalies   = mse_arr > threshold
normal_mask = ~anomalies

print(f"\nMSE  mean  : {mse_arr.mean():.6f}")
print(f"MSE  std   : {mse_arr.std():.6f}")
print(f"Threshold  : {threshold:.6f}")
print(f"Anomalies  : {anomalies.sum()} / {N} samples ({anomalies.mean()*100:.1f}%)")

# ── Plot ─────────────────────────────────────────────────────────────────────
BG      = "#0f172a"
PANEL   = "#1e293b"
BORDER  = "#334155"
BLUE    = "#38bdf8"
RED     = "#f87171"
AMBER   = "#fbbf24"
GREEN   = "#34d399"
MUTED   = "#64748b"
WHITE   = "#f1f5f9"

fig = plt.figure(figsize=(16, 10), facecolor=BG)
gs  = gridspec.GridSpec(2, 2, figure=fig, hspace=0.45, wspace=0.35,
                        left=0.07, right=0.97, top=0.88, bottom=0.1)

# ── Panel 1: MSE line chart with anomalies ───────────────────────────────────
ax1 = fig.add_subplot(gs[0, :])
ax1.set_facecolor(PANEL)
for spine in ax1.spines.values(): spine.set_edgecolor(BORDER)

# Shaded area under curve
ax1.fill_between(samples, mse_arr, alpha=0.18, color=BLUE)

# Main line
ax1.plot(samples, mse_arr, color=BLUE, linewidth=1.8, zorder=3, label="Reconstruction MSE")

# Smooth rolling average
window = 7
roll   = np.convolve(mse_arr, np.ones(window)/window, mode="same")
ax1.plot(samples, roll, color=GREEN, linewidth=2.2, linestyle="--",
         zorder=4, alpha=0.85, label=f"Rolling avg (w={window})")

# Threshold line
ax1.axhline(threshold, color=AMBER, linewidth=1.5, linestyle=":",
            zorder=5, label=f"Anomaly threshold  (μ + 1.5σ = {threshold:.5f})")

# Shade anomaly zone
ax1.fill_between(samples, threshold, mse_arr.max() * 1.15,
                 alpha=0.07, color=RED, zorder=1)

# Anomaly points
ax1.scatter(samples[anomalies], mse_arr[anomalies],
            color=RED, s=70, zorder=6, label=f"Anomalies ({anomalies.sum()})")

# Normal points (sparse)
ax1.scatter(samples[normal_mask][::5], mse_arr[normal_mask][::5],
            color=BLUE, s=22, alpha=0.55, zorder=5)

# Annotate worst anomaly
worst = int(np.argmax(mse_arr))
ax1.annotate(f" Sample {worst+1}\n MSE={mse_arr[worst]:.5f}",
             xy=(samples[worst], mse_arr[worst]),
             xytext=(samples[worst] + 3, mse_arr[worst] + mse_arr.std() * 0.4),
             color=RED, fontsize=8.5, family="monospace",
             arrowprops=dict(arrowstyle="-|>", color=RED, lw=1.2))

ax1.set_title("Data Loss per Sample — Encoder Bottleneck → Decoder Reconstruction",
              color=WHITE, fontsize=12, fontweight="bold", pad=10, family="monospace")
ax1.set_xlabel("Sample index", color=MUTED, fontsize=9)
ax1.set_ylabel("MSE (reconstruction error)", color=MUTED, fontsize=9)
ax1.tick_params(colors=MUTED, labelsize=8)
ax1.legend(fontsize=8.5, facecolor=PANEL, edgecolor=BORDER,
           labelcolor=WHITE, framealpha=1, loc="upper left")
ax1.set_xlim(0.5, N + 0.5)
ax1.set_ylim(0, mse_arr.max() * 1.2)
ax1.grid(axis="y", color=BORDER, linewidth=0.6, alpha=0.6)


# ── Panel 2: Histogram of MSE distribution ──────────────────────────────────
ax2 = fig.add_subplot(gs[1, 0])
ax2.set_facecolor(PANEL)
for spine in ax2.spines.values(): spine.set_edgecolor(BORDER)

bins = np.linspace(mse_arr.min(), mse_arr.max(), 22)
ax2.hist(mse_arr[normal_mask], bins=bins, color=BLUE,   alpha=0.75, label="Normal")
ax2.hist(mse_arr[anomalies],   bins=bins, color=RED,    alpha=0.85, label="Anomaly")
ax2.axvline(threshold, color=AMBER, linewidth=1.5, linestyle=":", label="Threshold")
ax2.set_title("MSE Distribution", color=WHITE, fontsize=10,
              fontweight="bold", pad=8, family="monospace")
ax2.set_xlabel("MSE", color=MUTED, fontsize=8.5)
ax2.set_ylabel("Count", color=MUTED, fontsize=8.5)
ax2.tick_params(colors=MUTED, labelsize=7.5)
ax2.legend(fontsize=8, facecolor=PANEL, edgecolor=BORDER, labelcolor=WHITE)
ax2.grid(axis="y", color=BORDER, linewidth=0.5, alpha=0.5)


# ── Panel 3: Max pixel error per sample ──────────────────────────────────────
ax3 = fig.add_subplot(gs[1, 1])
ax3.set_facecolor(PANEL)
for spine in ax3.spines.values(): spine.set_edgecolor(BORDER)

px_thresh  = px_arr.mean() + 1.5 * px_arr.std()
px_anom    = px_arr > px_thresh
ax3.fill_between(samples, px_arr, alpha=0.18, color="#a78bfa")
ax3.plot(samples, px_arr, color="#a78bfa", linewidth=1.6, label="Max pixel error")
ax3.axhline(px_thresh, color=AMBER, linewidth=1.4, linestyle=":",
            label=f"Threshold {px_thresh:.4f}")
ax3.scatter(samples[px_anom], px_arr[px_anom],
            color=RED, s=55, zorder=5, label=f"Anomalies ({px_anom.sum()})")
ax3.set_title("Max Single-Pixel Error per Sample", color=WHITE, fontsize=10,
              fontweight="bold", pad=8, family="monospace")
ax3.set_xlabel("Sample index", color=MUTED, fontsize=8.5)
ax3.set_ylabel("Max |orig − recon|", color=MUTED, fontsize=8.5)
ax3.tick_params(colors=MUTED, labelsize=7.5)
ax3.legend(fontsize=8, facecolor=PANEL, edgecolor=BORDER, labelcolor=WHITE)
ax3.set_xlim(0.5, N + 0.5)
ax3.grid(axis="y", color=BORDER, linewidth=0.5, alpha=0.5)


# ── Summary stats ────────────────────────────────────────────────────────────
fig.text(0.5, 0.965,
         f"Sushruth CNN Autoencoder  ·  Bottleneck: [1,3,256,256] → [1,16,32,32] → [1,3,256,256]  ·  12× compression  ·  {N} samples",
         ha="center", va="center", fontsize=9, color=MUTED,
         family="monospace")

out = "anomaly_reconstruction_loss.png"
plt.savefig(out, dpi=150, bbox_inches="tight", facecolor=BG)
plt.close()
print(f"\nChart saved → {out}")
