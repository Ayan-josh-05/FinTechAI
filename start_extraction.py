#!/usr/bin/env python3
"""
start_extraction.py
Entry point for the LegalAI data extraction pipeline.

Usage:
    python3 start_extraction.py
"""
import sys
from pathlib import Path

# Add the project root to sys.path so that `shared/` and `Extraction/` are importable.
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from Extraction.main import main

if __name__ == "__main__":
    main()
