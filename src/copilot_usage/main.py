"""Main module for Copilot Usage project."""


def greet(name: str) -> str:
    """Return a greeting message for the given name."""
    return f"Hello, {name}! Welcome to Copilot Usage."


def add(a: float, b: float) -> float:
    """Return the sum of two numbers."""
    return a + b


def main() -> None:
    """Run the main entry point."""
    print(greet("World"))


if __name__ == "__main__":
    main()
