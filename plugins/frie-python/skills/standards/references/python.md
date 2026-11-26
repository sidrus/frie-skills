# Python

The toolchain is uv for dependencies and scripts, ruff for lint and format, ty for type checking. The gate command is `uv run pytest && uv run ruff check && uv run ruff format --check && uv run ty check`, unless the repo's `CLAUDE.md` specifies another.

## Contracts

A subsystem is a package, and its contract is what its `__init__.py` imports and lists in `__all__`. Nothing outside the package imports any other module from it.

## Time, resources, and exceptions

- Time comes through an injected `Callable[[], datetime]` that returns an aware UTC datetime, defaulting to `lambda: datetime.now(UTC)`.
- A resource is released with `with` or `async with`.
- A wrapped exception is raised with `raise ... from error`.

## Docstrings

Docstrings go on the contract. They follow Google style, and the docstring goes on the class rather than its `__init__` method.

## Observability

Logging goes through the standard library's `logging`. A deployed service runs under OpenTelemetry's zero-code instrumentation, installed with `opentelemetry-distro` and `opentelemetry-exporter-otlp` and started with `opentelemetry-instrument`. `frie-enterprise:standards` decides what must be instrumented and what gets a metric.

## Suppressions

The ruled-out mechanisms are `# noqa` and `# type: ignore`. An approved one specifies the rule code and states its reason on the same line.
