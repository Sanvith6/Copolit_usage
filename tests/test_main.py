"""Tests for the main module."""

from copilot_usage.main import add, greet


def test_greet():
    result = greet("Alice")
    assert result == "Hello, Alice! Welcome to Copilot Usage."


def test_greet_empty_name():
    result = greet("")
    assert result == "Hello, ! Welcome to Copilot Usage."


def test_add():
    assert add(2, 3) == 5


def test_add_floats():
    assert add(1.5, 2.5) == 4.0


def test_add_negative():
    assert add(-1, 1) == 0
