#!/usr/bin/env bash
# Usage:  bash scripts/autoencoder/start_training.sh /path/to/images
# If no path is given it trains on the 80 built-in synthetic images.

DATA_DIR="${1:-synthetic}"
EPOCHS="${2:-50}"

cd "$(dirname "$0")"

echo ""
echo "=================================================="
echo "  Sushruth — CNN Autoencoder Training"
echo "  Data dir : $DATA_DIR"
echo "  Epochs   : $EPOCHS"
echo "=================================================="
echo ""

echo "Installing Python deps…"
pip install --quiet -r requirements.txt onnxscript matplotlib

echo ""
echo "Starting training…"
python train.py --data_dir "$DATA_DIR" --epochs "$EPOCHS"

echo ""
echo "Exporting ONNX models…"
python export_onnx.py --checkpoint checkpoints/best.pt

echo ""
echo "Done! Restart the Replit workflows to use the new models."
