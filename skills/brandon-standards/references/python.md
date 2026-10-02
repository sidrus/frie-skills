# Python

Toolchain is uv for dependencies and scripts, ruff for lint and format, ty for type checking. The gate is `uv run pytest && uv run ruff check && uv run ty check`, or whatever the repo's `CLAUDE.md` names.

Where `dignified-python` or `astral:ruff` conflict with anything here, this file wins.

## Docstrings

Google style. Document the class, not `__init__`.

Include `Args`, `Returns`, and `Raises` only when they add something the signature doesn't already say. A `Returns: The order id.` on `-> OrderId` is noise.

Ordinary `#` comments follow the comment policy in `SKILL.md`, which is that they aren't added unless asked. Docstrings on a public function or class are not comments for that purpose.

## Escape hatches

Every `# type: ignore` and every `# noqa` carries an inline explanation of why it is there. A bare one is not acceptable, and neither is adding one instead of fixing the cause. See the suppressions rule in `SKILL.md`.

## Tests

A repo's `tests/` directory may carry its own `CLAUDE.md` governing school, fixtures, and network policy. Read it before touching tests there. `references/testing.md` still applies for the parts it doesn't cover.
