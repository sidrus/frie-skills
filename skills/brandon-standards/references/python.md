# Python

Toolchain is uv for dependencies and scripts, ruff for lint and format, ty for type checking. The gate is `uv run pytest && uv run ruff check && uv run ty check`, or whatever the repo's `CLAUDE.md` names.

## Docstrings

Docstrings on a public function or class are the Python form of the API-surface exception in the `SKILL.md` comment policy. Ordinary `#` comments follow that policy unchanged.

Google style. Document the class, not `__init__`.

Include `Args`, `Returns`, and `Raises` only when they add something the signature doesn't already say. A `Returns: The order id.` on `-> OrderId` is noise.

## Tests

A repo's `tests/` directory may carry its own `CLAUDE.md` governing school, fixtures, and network policy. Read it before touching tests there. `references/testing.md` still applies for the parts it doesn't cover.
