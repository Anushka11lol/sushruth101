"""
Creates demo ONNX encoder + decoder models with random (untrained) weights.
These let you test the full compression pipeline immediately without training.
After training on real medical images, replace these with export_onnx.py output.

Usage:
  pip install onnx numpy
  python create_demo_models.py
"""

import os
import numpy as np
import onnx
from onnx import helper, TensorProto, numpy_helper

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ENCODER_DEST = os.path.join(SCRIPT_DIR, "../../artifacts/sushruth/public/models/encoder.onnx")
DECODER_DEST = os.path.join(SCRIPT_DIR, "../../artifacts/api-server/models/decoder.onnx")

rng = np.random.default_rng(42)


def rand_weights(shape):
    return rng.standard_normal(shape).astype(np.float32) * 0.05


def build_encoder():
    w1 = rand_weights((32, 3, 3, 3))
    b1 = np.zeros(32, dtype=np.float32)
    w2 = rand_weights((64, 32, 3, 3))
    b2 = np.zeros(64, dtype=np.float32)
    w3 = rand_weights((16, 64, 3, 3))
    b3 = np.zeros(16, dtype=np.float32)

    inits = [
        numpy_helper.from_array(w1, "enc_w1"),
        numpy_helper.from_array(b1, "enc_b1"),
        numpy_helper.from_array(w2, "enc_w2"),
        numpy_helper.from_array(b2, "enc_b2"),
        numpy_helper.from_array(w3, "enc_w3"),
        numpy_helper.from_array(b3, "enc_b3"),
    ]

    nodes = [
        helper.make_node("Conv", ["input", "enc_w1", "enc_b1"], ["h1"],
                         kernel_shape=[3, 3], strides=[2, 2], pads=[1, 1, 1, 1]),
        helper.make_node("Relu", ["h1"], ["r1"]),
        helper.make_node("Conv", ["r1", "enc_w2", "enc_b2"], ["h2"],
                         kernel_shape=[3, 3], strides=[2, 2], pads=[1, 1, 1, 1]),
        helper.make_node("Relu", ["h2"], ["r2"]),
        helper.make_node("Conv", ["r2", "enc_w3", "enc_b3"], ["h3"],
                         kernel_shape=[3, 3], strides=[2, 2], pads=[1, 1, 1, 1]),
        helper.make_node("Sigmoid", ["h3"], ["output"]),
    ]

    graph = helper.make_graph(
        nodes, "encoder",
        [helper.make_tensor_value_info("input", TensorProto.FLOAT, [1, 3, 256, 256])],
        [helper.make_tensor_value_info("output", TensorProto.FLOAT, [1, 16, 32, 32])],
        inits,
    )
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)])
    model.ir_version = 8
    onnx.checker.check_model(model)
    return model


def build_decoder():
    w1 = rand_weights((16, 64, 3, 3))
    b1 = np.zeros(64, dtype=np.float32)
    w2 = rand_weights((64, 32, 3, 3))
    b2 = np.zeros(32, dtype=np.float32)
    w3 = rand_weights((32, 3, 3, 3))
    b3 = np.zeros(3, dtype=np.float32)

    inits = [
        numpy_helper.from_array(w1, "dec_w1"),
        numpy_helper.from_array(b1, "dec_b1"),
        numpy_helper.from_array(w2, "dec_w2"),
        numpy_helper.from_array(b2, "dec_b2"),
        numpy_helper.from_array(w3, "dec_w3"),
        numpy_helper.from_array(b3, "dec_b3"),
    ]

    nodes = [
        helper.make_node("ConvTranspose", ["input", "dec_w1", "dec_b1"], ["h1"],
                         kernel_shape=[3, 3], strides=[2, 2], pads=[1, 1, 1, 1],
                         output_padding=[1, 1]),
        helper.make_node("Relu", ["h1"], ["r1"]),
        helper.make_node("ConvTranspose", ["r1", "dec_w2", "dec_b2"], ["h2"],
                         kernel_shape=[3, 3], strides=[2, 2], pads=[1, 1, 1, 1],
                         output_padding=[1, 1]),
        helper.make_node("Relu", ["h2"], ["r2"]),
        helper.make_node("ConvTranspose", ["r2", "dec_w3", "dec_b3"], ["h3"],
                         kernel_shape=[3, 3], strides=[2, 2], pads=[1, 1, 1, 1],
                         output_padding=[1, 1]),
        helper.make_node("Sigmoid", ["h3"], ["output"]),
    ]

    graph = helper.make_graph(
        nodes, "decoder",
        [helper.make_tensor_value_info("input", TensorProto.FLOAT, [1, 16, 32, 32])],
        [helper.make_tensor_value_info("output", TensorProto.FLOAT, [1, 3, 256, 256])],
        inits,
    )
    model = helper.make_model(graph, opset_imports=[helper.make_opsetid("", 17)])
    model.ir_version = 8
    onnx.checker.check_model(model)
    return model


if __name__ == "__main__":
    for dest in [ENCODER_DEST, DECODER_DEST]:
        os.makedirs(os.path.dirname(dest), exist_ok=True)

    print("Building encoder...")
    enc = build_encoder()
    onnx.save(enc, ENCODER_DEST)
    size_kb = os.path.getsize(ENCODER_DEST) / 1024
    print(f"  Saved encoder.onnx ({size_kb:.1f} KB) → {ENCODER_DEST}")

    print("Building decoder...")
    dec = build_decoder()
    onnx.save(dec, DECODER_DEST)
    size_kb = os.path.getsize(DECODER_DEST) / 1024
    print(f"  Saved decoder.onnx ({size_kb:.1f} KB) → {DECODER_DEST}")

    print("\nDemo models generated.")
    print("Note: these use random weights — images will not reconstruct accurately.")
    print("Train with train.py + export_onnx.py for real compression quality.")
