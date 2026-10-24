"""
Type this in the Shell:   python go.py
That's it. This script does everything automatically:
  1. Installs dependencies
  2. Downloads 200 medical images
  3. Trains the CNN autoencoder
  4. Exports the trained ONNX models into the app
"""

import subprocess, sys, os

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)

def run(cmd, **kw):
    print(f"\n>>> {cmd}\n")
    subprocess.run(cmd, shell=True, check=True, **kw)

# ── Step 1: install deps ──────────────────────────────────────────────────────
print("\n" + "="*55)
print("  STEP 1 / 4 — Installing dependencies")
print("="*55)
run("pip install --quiet --break-system-packages -r requirements.txt medmnist")

# ── Step 2: download images ───────────────────────────────────────────────────
print("\n" + "="*55)
print("  STEP 2 / 4 — Downloading 200 medical images")
print("="*55)

import importlib
medmnist = importlib.import_module("medmnist")
PathMNIST = getattr(medmnist, "PathMNIST")
from PIL import Image

img_dir = os.path.join(ROOT, "medimages")
os.makedirs(img_dir, exist_ok=True)

existing = len([f for f in os.listdir(img_dir) if f.endswith(".png")])
if existing >= 200:
    print(f"  Already have {existing} images — skipping download.")
else:
    print("  Downloading from MedMNIST (pathology patches)…")
    dataset = PathMNIST(split="train", download=True, root=ROOT)
    saved = 0
    for i, (img, _) in enumerate(dataset):
        img.save(os.path.join(img_dir, f"img_{i:05d}.png"))
        saved += 1
        if saved >= 200:
            break
    print(f"  Saved {saved} images to medimages/")

# ── Step 3: train ─────────────────────────────────────────────────────────────
print("\n" + "="*55)
print("  STEP 3 / 4 — Training (20 epochs, ~5-10 min)")
print("="*55)
run(f"python train.py --data_dir {img_dir} --epochs 50 --batch_size 8")

# ── Step 4: export ────────────────────────────────────────────────────────────
print("\n" + "="*55)
print("  STEP 4 / 4 — Exporting trained models to the app")
print("="*55)
run("python export_onnx.py --checkpoint checkpoints/best.pt")

print("\n" + "="*55)
print("  ALL DONE!")
print("  Restart the Replit workflows and the app will")
print("  now use your trained model.")
print("="*55 + "\n")
