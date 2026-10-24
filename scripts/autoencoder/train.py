"""
Training script for the Sushruth CNN Autoencoder.

Usage:
  python train.py --data_dir /path/to/images --epochs 50 --output ./checkpoints

The data_dir should contain medical image files (JPEG/PNG).
After training, run export_onnx.py to export to ONNX for the app.
"""

import argparse
import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms
from PIL import Image
from tqdm import tqdm

from model import Autoencoder


INPUT_SIZE = 256


class ImageDataset(Dataset):
    EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

    def __init__(self, root: str):
        self.paths = [
            os.path.join(root, f)
            for f in os.listdir(root)
            if os.path.splitext(f)[1].lower() in self.EXTENSIONS
        ]
        if not self.paths:
            raise ValueError(f"No image files found in {root}")
        self.transform = transforms.Compose([
            transforms.Resize((INPUT_SIZE, INPUT_SIZE)),
            transforms.ToTensor(),
        ])

    def __len__(self) -> int:
        return len(self.paths)

    def __getitem__(self, idx: int) -> torch.Tensor:
        img = Image.open(self.paths[idx]).convert("RGB")
        return self.transform(img)


def train(args):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on: {device}")

    dataset = ImageDataset(args.data_dir)
    loader = DataLoader(dataset, batch_size=args.batch_size, shuffle=True, num_workers=0)

    model = Autoencoder(latent_channels=64).to(device)
    optimizer = optim.Adam(model.parameters(), lr=args.lr)
    mse_loss = nn.MSELoss()
    l1_loss  = nn.L1Loss()

    def criterion(pred, target):
        return 0.7 * mse_loss(pred, target) + 0.3 * l1_loss(pred, target)

    os.makedirs(args.output, exist_ok=True)
    best_loss = float("inf")

    resume_path = os.path.join(args.output, "best.pt")
    if args.resume and os.path.exists(resume_path):
        model.load_state_dict(torch.load(resume_path, map_location=device, weights_only=True))
        print(f"  Resumed from {resume_path}")

    for epoch in range(1, args.epochs + 1):
        model.train()
        total_loss = 0.0
        for batch in tqdm(loader, desc=f"Epoch {epoch}/{args.epochs}"):
            batch = batch.to(device)
            optimizer.zero_grad()
            reconstructed, _ = model(batch)
            loss = criterion(reconstructed, batch)
            loss.backward()
            optimizer.step()
            total_loss += loss.item() * batch.size(0)

        avg_loss = total_loss / len(dataset)
        print(f"  Loss: {avg_loss:.6f}")

        if avg_loss < best_loss:
            best_loss = avg_loss
            ckpt_path = os.path.join(args.output, "best.pt")
            torch.save(model.state_dict(), ckpt_path)
            print(f"  Saved best checkpoint → {ckpt_path}")

    final_path = os.path.join(args.output, "final.pt")
    torch.save(model.state_dict(), final_path)
    print(f"\nTraining complete. Final checkpoint: {final_path}")
    print(f"Best loss: {best_loss:.6f}")
    print("\nNext step: run export_onnx.py to export to ONNX format.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--data_dir", required=True, help="Directory of training images")
    parser.add_argument("--epochs", type=int, default=50)
    parser.add_argument("--batch_size", type=int, default=16)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--output", default="./checkpoints")
    parser.add_argument("--resume", action="store_true", help="Resume from best.pt checkpoint")
    train(parser.parse_args())
