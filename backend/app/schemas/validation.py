"""Request-only text normalization. Never apply this type to passwords or tokens."""
from typing import Annotated
from pydantic import BeforeValidator


def strip_text(value: object) -> object:
    """Trim strings before length checks without coercing other input types."""
    return value.strip() if isinstance(value, str) else value


TrimmedString = Annotated[str, BeforeValidator(strip_text)]
