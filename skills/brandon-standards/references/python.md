# Python

The toolchain is uv for dependencies and scripts, ruff for lint and format, ty for type checking. The gate is `uv run pytest && uv run ruff check && uv run ty check`, or whatever the repo's `CLAUDE.md` names. `dignified-python`, `astral:ruff`, and `astral:ty` cover what this file and `engineering-patterns` don't.

## Contracts

A subsystem is a package, and its contract is what its `__init__.py` imports and lists in `__all__`. Nothing outside the package imports any other module from it.

## Docstrings

Docstrings go on the contract. They follow Google style, and the class carries the docstring rather than its `__init__` method.

## Suppressions

The ruled-out mechanisms are `# noqa` and `# type: ignore`. An approved one names the specific rule code and carries its reason on the same line.

## Tests

A repo's `tests/` directory may carry its own `CLAUDE.md` governing school, fixtures, and network policy. Read it before touching tests there. The `engineering-patterns` testing reference still applies for the parts it doesn't cover.

- Tests run on pytest. Run the red with `uv run pytest -k`.
- Names are `test_<unit>_<behavior>_<condition>`, such as `test_ship_rejects_order_when_already_shipped`.
- Test data comes from Faker.
