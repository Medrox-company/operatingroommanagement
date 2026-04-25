# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Test, že uv run umí spustit Python skript s PEP 723 metadaty."""

import sys
import os
from pathlib import Path

print("[v0] Python version:", sys.version)
print("[v0] sys.executable:", sys.executable)
print("[v0] cwd:", os.getcwd())
print("[v0] __file__:", __file__)
print("[v0] script dir:", Path(__file__).resolve().parent)
print("[v0] sys.path[0]:", sys.path[0])
print("[v0] OK")
