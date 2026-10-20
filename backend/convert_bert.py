"""Download sentence-transformers/all-MiniLM-L6-v2 and convert it to MLX weights.

Usage: python convert_bert.py [--repo REPO] [--out DIR]

Writes the tokenizer/config files plus ``model.npz`` (the weights in the key
layout expected by ``bert_model.Bert``) into ``models/bert models/<name>``.
"""

import argparse
from pathlib import Path

import mlx.core as mx
from huggingface_hub import snapshot_download

BACKEND_DIR = Path(__file__).resolve().parent
DEFAULT_REPO = "sentence-transformers/all-MiniLM-L6-v2"
DEFAULT_OUT = BACKEND_DIR / "models" / "bert models" / "all-MiniLM-L6-v2"

_REPLACEMENTS = [
    (".layer.", ".layers."),
    (".self.key.", ".key_proj."),
    (".self.query.", ".query_proj."),
    (".self.value.", ".value_proj."),
    (".attention.output.dense.", ".attention.out_proj."),
    (".attention.output.LayerNorm.", ".ln1."),
    (".output.LayerNorm.", ".ln2."),
    (".intermediate.dense.", ".linear1."),
    (".output.dense.", ".linear2."),
    (".LayerNorm.", ".norm."),
    ("pooler.dense.", "pooler."),
]


def replace_key(key: str) -> str:
    key = key.removeprefix("bert.")
    for old, new in _REPLACEMENTS:
        key = key.replace(old, new)
    return key


def convert(repo: str, out: Path) -> Path:
    out.mkdir(parents=True, exist_ok=True)
    snapshot_download(
        repo_id=repo,
        local_dir=out,
        allow_patterns=["*.json", "*.txt", "model.safetensors"],
    )
    safetensors_path = out / "model.safetensors"
    weights = mx.load(str(safetensors_path))
    converted = {
        replace_key(k): v.astype(mx.float32)
        for k, v in weights.items()
        if not k.endswith("position_ids")
    }
    npz_path = out / "model.npz"
    mx.savez(str(npz_path), **converted)
    safetensors_path.unlink()
    return npz_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=DEFAULT_REPO)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    args = parser.parse_args()
    print(f"Saved {convert(args.repo, args.out)}")
