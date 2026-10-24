"""
Generates an architecture diagram showing input/output shapes
for every layer in the CNN Encoder and Decoder.

Usage:
  python generate_chart.py
Output:
  autoencoder_architecture.png
"""

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyArrowPatch

fig, axes = plt.subplots(1, 2, figsize=(18, 10))
fig.patch.set_facecolor("#0f172a")

COLORS = {
    "input":    "#6366f1",
    "conv":     "#0ea5e9",
    "relu":     "#10b981",
    "sigmoid":  "#f59e0b",
    "deconv":   "#8b5cf6",
    "output":   "#f43f5e",
    "arrow":    "#94a3b8",
    "text":     "#f1f5f9",
    "subtext":  "#94a3b8",
    "bg":       "#1e293b",
    "border":   "#334155",
}

BOX_W = 3.2
BOX_H = 0.72
X_LEFT = 0.5
STEP = 1.35


def draw_box(ax, x, y, label, sublabel, color, text_color="#f1f5f9"):
    rect = mpatches.FancyBboxPatch(
        (x, y), BOX_W, BOX_H,
        boxstyle="round,pad=0.06",
        linewidth=1.5,
        edgecolor=color,
        facecolor=color + "22",
    )
    ax.add_patch(rect)
    ax.text(x + BOX_W / 2, y + BOX_H * 0.62, label,
            ha="center", va="center", fontsize=10.5, fontweight="bold",
            color=text_color, family="monospace")
    ax.text(x + BOX_W / 2, y + BOX_H * 0.22, sublabel,
            ha="center", va="center", fontsize=8.5,
            color=COLORS["subtext"], family="monospace")


def draw_arrow(ax, x, y_top, y_bot):
    ax.annotate("", xy=(x + BOX_W / 2, y_bot + BOX_H),
                xytext=(x + BOX_W / 2, y_top),
                arrowprops=dict(arrowstyle="-|>", color=COLORS["arrow"],
                                lw=1.6, mutation_scale=14))


# ─── ENCODER ────────────────────────────────────────────────────────────────

enc_layers = [
    ("INPUT",            "[1, 3, 256, 256]",  "input",   "RGB image, normalised to [0, 1]"),
    ("Conv2d 3→32",      "[1, 32, 128, 128]", "conv",    "kernel=3×3  stride=2  pad=1"),
    ("ReLU",             "[1, 32, 128, 128]", "relu",    "activation — keeps positive values"),
    ("Conv2d 32→64",     "[1, 64, 64, 64]",   "conv",    "kernel=3×3  stride=2  pad=1"),
    ("ReLU",             "[1, 64, 64, 64]",   "relu",    "activation — keeps positive values"),
    ("Conv2d 64→16",     "[1, 16, 32, 32]",   "conv",    "kernel=3×3  stride=2  pad=1"),
    ("Sigmoid",          "[1, 16, 32, 32]",   "sigmoid", "output in [0, 1]  — latent code"),
    ("LATENT OUTPUT",    "[1, 16, 32, 32]",   "output",  "compressed — 12× smaller (float32)"),
]

ax = axes[0]
ax.set_facecolor(COLORS["bg"])
ax.set_xlim(0, BOX_W + 1)
ax.set_ylim(-0.5, len(enc_layers) * STEP + 0.3)
ax.axis("off")
ax.set_title("ENCODER", fontsize=15, fontweight="bold",
             color=COLORS["text"], pad=12, family="monospace")

total_y = len(enc_layers) * STEP
for i, (label, shape, kind, note) in enumerate(enc_layers):
    y = total_y - (i + 1) * STEP
    draw_box(ax, X_LEFT, y, label, f"{shape}   {note}", COLORS[kind])
    if i < len(enc_layers) - 1:
        draw_arrow(ax, X_LEFT, y, y - STEP + BOX_H)

ratio_y = -0.35
ax.text(X_LEFT + BOX_W / 2, ratio_y,
        "Compression  196 608 → 16 384 floats  =  12× smaller",
        ha="center", va="center", fontsize=8.5,
        color="#fbbf24", family="monospace",
        bbox=dict(facecolor="#78350f33", edgecolor="#f59e0b", boxstyle="round,pad=0.3", lw=1))


# ─── DECODER ────────────────────────────────────────────────────────────────

dec_layers = [
    ("LATENT INPUT",         "[1, 16, 32, 32]",   "input",   "compressed representation"),
    ("ConvTranspose2d 16→64","[1, 64, 64, 64]",   "deconv",  "kernel=3×3  stride=2  out_pad=1"),
    ("ReLU",                 "[1, 64, 64, 64]",   "relu",    "activation — keeps positive values"),
    ("ConvTranspose2d 64→32","[1, 32, 128, 128]", "deconv",  "kernel=3×3  stride=2  out_pad=1"),
    ("ReLU",                 "[1, 32, 128, 128]", "relu",    "activation — keeps positive values"),
    ("ConvTranspose2d 32→3", "[1, 3, 256, 256]",  "deconv",  "kernel=3×3  stride=2  out_pad=1"),
    ("Sigmoid",              "[1, 3, 256, 256]",  "sigmoid", "output in [0, 1]"),
    ("RECONSTRUCTED IMAGE",  "[1, 3, 256, 256]",  "output",  "RGB image — ready for Claude OCR"),
]

ax2 = axes[1]
ax2.set_facecolor(COLORS["bg"])
ax2.set_xlim(0, BOX_W + 1)
ax2.set_ylim(-0.5, len(dec_layers) * STEP + 0.3)
ax2.axis("off")
ax2.set_title("DECODER", fontsize=15, fontweight="bold",
              color=COLORS["text"], pad=12, family="monospace")

total_y = len(dec_layers) * STEP
for i, (label, shape, kind, note) in enumerate(dec_layers):
    y = total_y - (i + 1) * STEP
    draw_box(ax2, X_LEFT, y, label, f"{shape}   {note}", COLORS[kind])
    if i < len(dec_layers) - 1:
        draw_arrow(ax2, X_LEFT, y, y - STEP + BOX_H)

ax2.text(X_LEFT + BOX_W / 2, -0.35,
         "Reconstruction  16 384 → 196 608 floats  =  full image restored",
         ha="center", va="center", fontsize=8.5,
         color="#6ee7b7", family="monospace",
         bbox=dict(facecolor="#06402433", edgecolor="#10b981", boxstyle="round,pad=0.3", lw=1))

# ─── Legend ─────────────────────────────────────────────────────────────────

legend_items = [
    (COLORS["input"],   "Input / Latent"),
    (COLORS["conv"],    "Conv2d (stride=2 downsamples)"),
    (COLORS["deconv"],  "ConvTranspose2d (stride=2 upsamples)"),
    (COLORS["relu"],    "ReLU activation"),
    (COLORS["sigmoid"], "Sigmoid (clamps to 0–1)"),
    (COLORS["output"],  "Output tensor"),
]
handles = [mpatches.Patch(facecolor=c + "55", edgecolor=c, label=l, linewidth=1.2)
           for c, l in legend_items]
fig.legend(handles=handles, loc="lower center", ncol=3, fontsize=8.5,
           facecolor=COLORS["bg"], edgecolor=COLORS["border"],
           labelcolor=COLORS["text"], framealpha=1,
           bbox_to_anchor=(0.5, 0.0), columnspacing=1.5, handlelength=1.5)

fig.suptitle("Sushruth CNN Autoencoder — Layer-by-layer Input / Output Shapes",
             fontsize=14, fontweight="bold", color=COLORS["text"],
             y=1.01, family="monospace")

plt.tight_layout(rect=[0, 0.07, 1, 1])
out_path = "autoencoder_architecture.png"
plt.savefig(out_path, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
plt.close()
print(f"Chart saved → {out_path}")
