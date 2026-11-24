# React

## Components

- Components are function components, one per `.tsx` file, with the file named for the component in PascalCase.
- A component's props are a `type` named `<Component>Props`, destructured in the signature.
- A component is an entry point. It renders, and it hands every decision to a plain function or a hook, so the decision is testable without rendering.
- A list item's `key` is a stable identifier from the data, never the array index.
- Markup uses semantic elements and labeled controls, because the tests find elements by role and accessible name.

## Hooks and state

- The Rules of Hooks are Biome's `useHookAtTopLevel`, and effect dependencies are its `useExhaustiveDependencies` **(tooling)**.
- A custom hook is a function named `use<Thing>`, and it holds stateful logic that more than one component shares or that a component would otherwise hold inline.
- State holds only what can't be computed. A value derived from props or state is computed during render, never copied into state by an effect.
- An effect synchronizes with a system outside React, such as a subscription or a browser API. Never fetch in an effect. Server data goes through TanStack Query, unless the repo already uses another data library.
- State shared across distant components goes through context, or through the repo's state library when it has one. It never goes through props passed down more than two levels.

## Tests

- Components are tested with `@testing-library/react`, `@testing-library/user-event`, and the `@testing-library/jest-dom` matchers under Vitest's `jsdom` environment.
- Elements are found by role and accessible name, `getByRole('button', { name: 'Ship' })`, and by test ID only when nothing else identifies them.
- A component test asserts on what the user sees through those queries. Never use snapshots of rendered markup.

## Canonical shapes

A component that renders and hands its decision to a pure function:

```tsx
export type ShipButtonProps = {
  readonly order: Order
  readonly onShip: (orderId: OrderId) => void
}

export function ShipButton({ order, onShip }: ShipButtonProps) {
  return (
    <button type="button" disabled={!canShip(order)} onClick={() => onShip(order.id)}>
      Ship
    </button>
  )
}
```

A component test through roles:

```tsx
describe('ShipButton', () => {
  test('is disabled when the order is already shipped', () => {
    render(<ShipButton order={buildOrder({ status: 'shipped' })} onShip={() => {}} />)

    expect(screen.getByRole('button', { name: 'Ship' })).toBeDisabled()
  })
})
```
