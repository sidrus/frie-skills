# Python

The toolchain is uv for dependencies and scripts, ruff for lint and format, ty for type checking. The gate is `uv run pytest && uv run ruff check && uv run ruff format --check && uv run ty check`, or whatever the repo's `CLAUDE.md` specifies.
## Contracts

A subsystem is a package, and its contract is what its `__init__.py` imports and lists in `__all__`. Nothing outside the package imports any other module from it.

## Time, resources, and exceptions

- Time comes through an injected `Callable[[], datetime]` that returns an aware UTC datetime, defaulting to `lambda: datetime.now(UTC)`.
- A resource is released with `with` or `async with`.
- A wrapped exception is raised with `raise ... from error`.

## Docstrings

Docstrings go on the contract. They follow Google style, and the docstring goes on the class rather than its `__init__` method.

## Observability

Logging goes through the standard library's `logging`. A deployed service runs under OpenTelemetry's zero-code instrumentation, installed with `opentelemetry-distro` and `opentelemetry-exporter-otlp` and started with `opentelemetry-instrument`. `engineering-patterns` decides what must be instrumented and what gets a metric.

## Suppressions

The ruled-out mechanisms are `# noqa` and `# type: ignore`. An approved one specifies the rule code and states its reason on the same line.

## Tests

A repo's `tests/` directory may contain its own `CLAUDE.md` governing school, fixtures, and network policy. Read it before touching tests there. The `engineering-patterns` testing reference still applies for the parts it doesn't cover.

- Tests run on pytest. Run the red with `uv run pytest -k`.
- Assertions are plain `assert` statements, which pytest rewrites to report both values.
- The shared test-support module is a `tests/support/` package of fakes and generators. Fixtures live in `conftest.py`.
- Integration tests live in `tests/integration/` and run separately from the unit suite.
- Names are `test_<unit>_<behavior>_<condition>`, such as `test_ship_rejects_order_when_already_shipped`.
- Test data comes from Faker.
- Shared arrangement is a verb-named module-level function, or a fixture that returns a value. A fixture never returns a function.
