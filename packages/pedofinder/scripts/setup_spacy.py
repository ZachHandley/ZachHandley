"""Download and install SpaCy models."""

import subprocess
import sys

from rich.console import Console

console = Console()


def install_spacy_model(model_name: str = "en_core_web_trf") -> bool:
    """Download and install a SpaCy model.

    Args:
        model_name: Name of the SpaCy model to install

    Returns:
        True if successful, False otherwise
    """
    console.print(f"[cyan]Downloading SpaCy model: {model_name}...")

    try:
        # Run spacy download command
        result = subprocess.run(
            [sys.executable, "-m", "spacy", "download", model_name],
            capture_output=True,
            text=True,
            check=True,
        )

        console.print(f"[green]Successfully installed {model_name}")
        return True

    except subprocess.CalledProcessError as e:
        console.print(f"[red]Failed to install {model_name}")
        console.print(f"[red]Error: {e.stderr}")
        return False


def verify_spacy_model(model_name: str = "en_core_web_trf") -> bool:
    """Verify that a SpaCy model is installed and loadable.

    Args:
        model_name: Name of the SpaCy model to verify

    Returns:
        True if model is available, False otherwise
    """
    try:
        import spacy

        spacy.load(model_name)
        console.print(f"[green]SpaCy model '{model_name}' is installed and working")
        return True

    except OSError:
        console.print(f"[yellow]SpaCy model '{model_name}' is not installed")
        return False


def main() -> int:
    """Main entry point.

    Returns:
        Exit code (0 for success)
    """
    console.print("[bold]SpaCy Model Setup[/bold]\n")

    # Transformer-based model (most accurate, slower)
    transformer_model = "en_core_web_trf"

    # Check if already installed
    console.print(f"[cyan]Checking if {transformer_model} is installed...")

    if verify_spacy_model(transformer_model):
        console.print("\n[green]SpaCy transformer model is already installed!")
        console.print("[green]No action needed.")
        return 0

    # Install the model
    console.print(f"\n[yellow]Installing {transformer_model}...")
    console.print("[yellow]This may take a few minutes...")

    success = install_spacy_model(transformer_model)

    if success:
        # Verify installation
        console.print("\n[cyan]Verifying installation...")
        if verify_spacy_model(transformer_model):
            console.print("\n[bold green]SpaCy setup complete!")
            return 0
        else:
            console.print("\n[red]Installation verification failed")
            return 1
    else:
        console.print("\n[red]Failed to install SpaCy model")
        console.print("\n[yellow]You can manually install it with:")
        console.print(f"[yellow]  python -m spacy download {transformer_model}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
