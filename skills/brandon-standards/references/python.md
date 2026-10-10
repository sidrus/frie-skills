# Python

Toolchain is uv for dependencies and scripts, ruff for lint and format, ty for type checking. The gate is `uv run pytest && uv run ruff check && uv run ty check`, or whatever the repo's `CLAUDE.md` names. `dignified-python`, `astral:ruff`, and `astral:ty` cover what this file and `engineering-patterns` don't.

## Docstrings

Docstrings on a public function or class are the Python form of the API-surface doc comment. Google style. Document the class, not `__init__`.

## Suppressions

The ruled-out mechanisms are `# noqa` and `# type: ignore`. An approved one names the specific rule code and carries its reason on the same line.

## Tests

A repo's `tests/` directory may carry its own `CLAUDE.md` governing school, fixtures, and network policy. Read it before touching tests there. The `engineering-patterns` testing reference still applies for the parts it doesn't cover.

- pytest. Run the red with `uv run pytest -k`.
- Names are `test_<unit>_<behavior>_<condition>`, such as `test_ship_rejects_order_when_already_shipped`.
- Test data comes from Faker.
