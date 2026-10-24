"""
Full end-to-end example of the CNN autoencoder pipeline.
Runs with synthetic data — no real dataset needed.

Usage:
  cd scripts/autoencoder
  pip install -r requirements.txt
  python full_example.py

After this runs, copy the .onnx files to deploy:
  onnx_export/encoder.onnx → artifacts/sushruth/public/models/encoder.onnx
  onnx_export/decoder.onnx → artifacts/api-server/models/decoder.onnx
"""

import os
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, TensorDataset
from PIL import Image
import onnx
import onnxruntime as ort


# ─────────────────────────────────────────────
# STEP 1 — Define the CNN Autoencoder
# ─────────────────────────────────────────────

class Encoder(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(3, 32, 3, stride=2, padding=1),   # 256 → 128
            nn.ReLU(),
            nn.Conv2d(32, 64, 3, stride=2, padding=1),  # 128 → 64
            nn.ReLU(),
            nn.Conv2d(64, 16, 3, stride=2, padding=1),  # 64  → 32
            nn.Sigmoid(),                                # values in [0, 1]
        )
    def forward(self, x): return self.net(x)


class Decoder(nn.Module):
    def __init__(self):
        super().__init__()
        self.net = nn.Sequential(
            nn.ConvTranspose2d(16, 64, 3, stride=2, padding=1, output_padding=1),  # 32  → 64
            nn.ReLU(),
            nn.ConvTranspose2d(64, 32, 3, stride=2, padding=1, output_padding=1),  # 64  → 128
            nn.ReLU(),
            nn.ConvTranspose2d(32,  3, 3, stride=2, padding=1, output_padding=1),  # 128 → 256
            nn.Sigmoid(),
        )
    def forward(self, x): return self.net(x)


class Autoencoder(nn.Module):
    def __init__(self):
        super().__init__()
        self.encoder = Encoder()
        self.decoder = Decoder()
    def forward(self, x):
        z = self.encoder(x)
        return self.decoder(z), z


# ─────────────────────────────────────────────
# STEP 2 — Create synthetic training data
#           (replace with real medical images in production)
# ─────────────────────────────────────────────

print("Generating synthetic training images...")
N = 64
H, W = 256, 256
rng = np.random.default_rng(0)
images = rng.random((N, 3, H, W)).astype(np.float32)

for i in range(N):
    cx, cy = rng.integers(50, 200, size=2)
    images[i, :, cy - 20:cy + 20, cx - 20:cx + 20] = 0.9

dataset = TensorDataset(torch.from_numpy(images))
loader = DataLoader(dataset, batch_size=8, shuffle=True)
print(f"  {N} synthetic images created\n")


# ─────────────────────────────────────────────
# STEP 3 — Train
# ─────────────────────────────────────────────

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = Autoencoder().to(device)
optimizer = optim.Adam(model.parameters(), lr=1e-3)
criterion = nn.MSELoss()
EPOCHS = 10  # use 50+ epochs on real medical data

print(f"Training on {device} for {EPOCHS} epochs...")
for epoch in range(1, EPOCHS + 1):
    total = 0.0
    for (batch,) in loader:
        batch = batch.to(device)
        optimizer.zero_grad()
        reconstructed, _ = model(batch)
        loss = criterion(reconstructed, batch)
        loss.backward()
        optimizer.step()
        total += loss.item() * len(batch)
    print(f"  Epoch {epoch:02d}/{EPOCHS} — loss: {total / N:.6f}")

os.makedirs("checkpoints", exist_ok=True)
torch.save(model.state_dict(), "checkpoints/trained.pt")
print("  Saved → checkpoints/trained.pt\n")


# ─────────────────────────────────────────────
# STEP 4 — Validate: measure compression ratio
# ─────────────────────────────────────────────

model.eval()
with torch.no_grad():
    sample = torch.from_numpy(images[:1]).to(device)
    recon, latent = model(sample)
    mse = criterion(recon, sample).item()

print(f"Reconstruction MSE: {mse:.6f}")
print(f"  Input  shape : {tuple(sample.shape)}")    # (1, 3, 256, 256)
print(f"  Latent shape : {tuple(latent.shape)}")    # (1, 16, 32, 32) ← compressed
print(f"  Output shape : {tuple(recon.shape)}\n")   # (1, 3, 256, 256)

original_floats   = 3 * 256 * 256   # 196,608
compressed_floats = 16 * 32 * 32    #  16,384
print(f"Compression ratio (float32): {original_floats / compressed_floats:.1f}x")
print(f"Compression ratio (uint8)  : {original_floats * 4 / compressed_floats:.1f}x\n")


# ─────────────────────────────────────────────
# STEP 5 — Export to ONNX
# ─────────────────────────────────────────────

model.cpu().eval()
os.makedirs("onnx_export", exist_ok=True)

enc_path = "onnx_export/encoder.onnx"
torch.onnx.export(
    model.encoder,
    torch.zeros(1, 3, 256, 256),
    enc_path,
    input_names=["input"],
    output_names=["output"],
    opset_version=17,
)
print(f"Encoder exported → {enc_path}  ({os.path.getsize(enc_path) / 1024:.1f} KB)")

dec_path = "onnx_export/decoder.onnx"
torch.onnx.export(
    model.decoder,
    torch.zeros(1, 16, 32, 32),
    dec_path,
    input_names=["input"],
    output_names=["output"],
    opset_version=17,
)
print(f"Decoder exported → {dec_path}  ({os.path.getsize(dec_path) / 1024:.1f} KB)\n")


# ─────────────────────────────────────────────
# STEP 6 — Verify ONNX with onnxruntime
# ─────────────────────────────────────────────

print("Verifying ONNX models...")

enc_sess  = ort.InferenceSession(enc_path)
latent_np = enc_sess.run(["output"], {"input": images[:1]})[0]
print(f"  Encoder output: {latent_np.shape}")       # (1, 16, 32, 32)

dec_sess  = ort.InferenceSession(dec_path)
recon_np  = dec_sess.run(["output"], {"input": latent_np})[0]
print(f"  Decoder output: {recon_np.shape}")        # (1, 3, 256, 256)
print(f"  Pixel range   : {recon_np.min():.3f} – {recon_np.max():.3f}\n")


# ─────────────────────────────────────────────
# STEP 7 — Save visual comparison
# ─────────────────────────────────────────────

orig_img  = (images[0].transpose(1, 2, 0) * 255).astype(np.uint8)
recon_img = (recon_np[0].transpose(1, 2, 0) * 255).clip(0, 255).astype(np.uint8)

Image.fromarray(orig_img).save("onnx_export/original.png")
Image.fromarray(recon_img).save("onnx_export/reconstructed.png")
print("Saved visual comparison:")
print("  onnx_export/original.png       ← input image")
print("  onnx_export/reconstructed.png  ← after encode → decode")

print("\n── Deploy ──────────────────────────────────────────────")
print(f"  cp {enc_path} ../../artifacts/sushruth/public/models/encoder.onnx")
print(f"  cp {dec_path} ../../artifacts/api-server/models/decoder.onnx")
print("Then restart both workflows in Replit.")
