# TypeScript Tests

## Runner and assertions

- Tests run on Vitest, unless a framework ships its own test kit, such as `claude-code/testing` for Claude Code mods.
- Assert with `expect(actual).toEqual(expected)` and its relatives, never `toBeTruthy` or `toBe(true)` over a computed comparison.
- Run the red with `npx vitest run <file> -t '<test name>'`.
- An expected error is asserted with `toThrow(OrderError)` or `rejects.toThrow(OrderError)`, then on its typed fields, never on its message.
- `vi.fn` appears only at the true external boundaries the `engineering-patterns` testing reference allows. `vi.mock` never replaces an in-process module.
- `vi.useFakeTimers` is only for code that schedules timers. Time otherwise comes from an injected `Clock`.

## Names and structure

- Each test file has one `describe` named for its unit, with no nesting. Each test's name is the expected behavior and the condition, `rejects the order when it is already shipped` or `creates a shipment by default`, so the `describe` and the test together read as all three parts.
- Tests live under `tests/`, mirroring the source tree, in files named `<unit>.test.ts`.
- Per-test state is built inside the test or by a verb-named function it calls. `beforeEach` holds only setup that a function can't express.

## Data and support

- Test data comes from `@faker-js/faker`. Each domain type gets one builder function, `buildOrder(overrides: Partial<Order> = {})`, that generates every property and spreads the overrides last.
- The shared test-support module is `tests/support/`, holding the builders and fakes.
- Integration tests live in `tests/integration/` and run as a separate Vitest project.

## Canonical shapes

One builder per domain type, in `tests/support/`:

```ts
export function buildOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: faker.string.uuid(),
    status: faker.helpers.arrayElement(ORDER_STATUSES),
    lines: [],
    shippingAddress: { street: faker.location.streetAddress(), city: faker.location.city() },
    ...overrides,
  }
}
```

A state-based test asserting on the value:

```ts
describe('OrderService', () => {
  test('rejects the order when it is already shipped', async () => {
    const service = new OrderService(new FakeShipmentGateway())
    const order = buildOrder({ status: 'shipped' })

    const result = await service.ship(order)

    expect(result).toEqual({ kind: 'alreadyShipped', orderId: order.id })
  })
})
```
