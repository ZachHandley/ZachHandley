#!/usr/bin/env python
"""Download SpaCy transformer model."""

import subprocess
import sys


def main() -> int:
    """Download the en_core_web_trf model."""
    print("Downloading SpaCy transformer model: en_core_web_trf")
    print("This may take several minutes...\n")

    try:
        # Use subprocess to run spacy download
        result = subprocess.run(
            [sys.executable, "-m", "spacy", "download", "en_core_web_trf"],
            check=True,
            capture_output=True,
            text=True,
        )
        print(result.stdout)
        print("\n✓ Model downloaded successfully!")
        return 0

    except subprocess.CalledProcessError as e:
        print(f"Error downloading model: {e}")
        print(f"stderr: {e.stderr}")
        print("\nTrying alternative method...")

        # Alternative: direct pip install
        try:
            result = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "pip",
                    "install",
                    "https://github.com/explosion/spacy-models/releases/download/en_core_web_trf-3.8.0/en_core_web_trf-3.8.0-py3-none-any.whl",
                ],
                check=True,
                capture_output=True,
                text=True,
            )
            print(result.stdout)
            print("\n✓ Model installed successfully!")
            return 0
        except Exception as e2:
            print(f"Alternative method also failed: {e2}")
            return 1

    except Exception as e:
        print(f"Unexpected error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
