"""
Export a trained PyTorch autoencoder to two ONNX files:
  - encoder.onnx  → goes to artifacts/sushruth/public/models/
  - decoder.onnx  → goes to artifacts/api-server/models/

Usage:
  python export_onnx.py --checkpoint ./checkpoints/best.pt
"""

import argparse
import os
import torch

from model import Autoencoder

INPUT_SIZE = 256
LATENT_CHANNELS = 64
LATENT_SPATIAL = 32


def export(checkpoint_path: str, out_dir: str):
    device = torch.device("cpu")
    model = Autoencoder(latent_channels=LATENT_CHANNELS)
    state = torch.load(checkpoint_path, map_location=device, weights_only=True)
    model.load_state_dict(state)
    model.eval()

    os.makedirs(out_dir, exist_ok=True)

    encoder_path = os.path.join(out_dir, "encoder.onnx")
    dummy_image = torch.zeros(1, 3, INPUT_SIZE, INPUT_SIZE)
    torch.onnx.export(
        model.encoder,
        dummy_image,
        encoder_path,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
        opset_version=17,
    )
    print(f"Encoder exported → {encoder_path}")

    decoder_path = os.path.join(out_dir, "decoder.onnx")
    dummy_latent = torch.zeros(1, LATENT_CHANNELS, LATENT_SPATIAL, LATENT_SPATIAL)
    torch.onnx.export(
        model.decoder,
        dummy_latent,
        decoder_path,
        input_names=["input"],
        output_names=["output"],
        dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
        opset_version=17,
    )
    print(f"Decoder exported → {decoder_path}")

    encoder_dest = os.path.join(
        os.path.dirname(__file__), "../../artifacts/sushruth/public/models/encoder.onnx"
    )
    decoder_dest = os.path.join(
        os.path.dirname(__file__), "../../artifacts/api-server/models/decoder.onnx"
    )
    os.makedirs(os.path.dirname(encoder_dest), exist_ok=True)
    os.makedirs(os.path.dirname(decoder_dest), exist_ok=True)

    # Merge external data into a single self-contained ONNX file before copying
    import onnx
    import shutil

    def save_inline(src, dst):
        """Load an ONNX model (with optional .data sidecar) and save it as a
        single file with all weights inlined — no external data file needed."""
        m = onnx.load(src)
        onnx.save(m, dst, save_as_external_data=False)

    save_inline(encoder_path, encoder_dest)
    save_inline(decoder_path, decoder_dest)
    print(f"\nCopied encoder (inline) → {encoder_dest}")
    print(f"Copied decoder (inline) → {decoder_dest}")
    print("\nDone. Restart the app workflows to pick up the new models.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--checkpoint", default="./checkpoints/best.pt")
    parser.add_argument("--out_dir", default="./onnx_export")
    args = parser.parse_args()
    export(args.checkpoint, args.out_dir)
