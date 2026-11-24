# Python Tests

A repo's `tests/` directory may contain its own `CLAUDE.md` governing school, fixtures, and network policy. Read it before touching tests there. The `engineering-patterns` testing reference still applies for the parts it doesn't cover.

- Tests run on pytest. Run the red with `uv run pytest -k`.
- Assertions are plain `assert` statements, which pytest rewrites to report both values.
- The shared test-support module is a `tests/support/` package of fakes and generators. Fixtures live in `conftest.py`.
- Integration tests live in `tests/integration/` and run separately from the unit suite.
- Names are `test_<unit>_<behavior>_<condition>`, such as `test_ship_rejects_order_when_already_shipped`.
- Test data comes from Faker.
- Shared arrangement is a verb-named module-level function, or a fixture that returns a value. A fixture never returns a function.
