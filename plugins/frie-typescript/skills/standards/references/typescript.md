# TypeScript

The toolchain is npm for packages and scripts, `tsc` for type checking, Biome for lint and format, and Vitest for tests. The gate command is `npx tsc --noEmit && npx biome ci && npx vitest run`, unless the repo's `CLAUDE.md` specifies another.

## Compiler

`tsconfig.json` sets `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, and `verbatimModuleSyntax`. Packages are ES modules, with `"type": "module"` in `package.json`.

## Formatting and lint

Biome owns layout and lint **(tooling)**, configured in `biome.json`. Run `npx biome check --write` rather than formatting by hand. Type-only imports use `import type`, which `verbatimModuleSyntax` enforces **(tooling)**.

## Absence

- `undefined` is the absent value. `null` appears only where an external API or a JSON payload produces it, and the code that receives it converts it to `undefined`.
- Compare with `===` and `!==`, never `==`, which is Biome's `noDoubleEquals` **(tooling)**. The core ban on non-null assertions is Biome's `noNonNullAssertion` **(tooling)**.
- A default uses `??`, never `||`, which also replaces `0`, `''`, and `false`.

## Types

- A data shape is a `type` with `readonly` properties, and its collections are `readonly T[]` with `[]` as the empty literal. A state change builds a new object with spread syntax.
- An `interface` declares a contract that a class or a fake implements.
- A closed set of cases is a discriminated union on a `kind` field, including a `Result`. Dispatch over it is a `switch` on `kind` whose `default` assigns the value to `never`, so a new case fails compilation at every switch that misses it.
- A fixed set of values is a union of string literals, or an `as const` object when the code iterates the values. Never `enum`.
- Never `any`. A value from outside the process, such as a request body, parsed JSON, or an environment variable, arrives as `unknown` and is parsed through a Zod schema at the entry point, unless the repo already uses another schema library.
- Never `as` to change a type, apart from `as const`. Narrow with a type guard, `in`, `instanceof`, or a schema parse, and check a literal's shape with `satisfies`.
- Named functions are `function` declarations, and arrow functions are for callbacks.
- Exports are named, never `default`, except where a framework requires a default export.

## Modules and contracts

A subsystem is a folder, and its contract is what its `index.ts` exports. Nothing outside the folder imports any other module from it. No other file re-exports from a sibling module.

## Async

- Every promise is awaited or returned. A promise that is intentionally not awaited is passed to a function that handles its rejection.
- Use `async` and `await` rather than `.then` chains.

## Time, resources, and exceptions

- Time comes through an injected `Clock`, a `() => Date` that defaults to `() => new Date()`. A test passes a fixed clock.
- A disposable resource is declared with `using` or `await using`. A resource without `Symbol.dispose` is released in a `finally` block.
- A wrapped error passes the original as `cause`: `new OrderError('...', { cause: error })`.
- An error that a caller dispatches on is its own `Error` subclass with typed fields. A `catch` narrows its `unknown` value with `instanceof` before using it.

## Doc comments

TSDoc goes on what a contract's `index.ts` exports, and nothing else gets it.

## Logging and observability

Production code never calls `console`, which is Biome's `noConsole` **(tooling)**, except in a CLI's output. A Node service logs through pino and starts with `--import @opentelemetry/auto-instrumentations-node/register`, which instruments HTTP, the database client, and pino, and puts `trace_id` and `span_id` on every log line. A manual span for a domain operation goes through `trace.getTracer(...).startActiveSpan` from `@opentelemetry/api`.

## Suppressions

The ruled-out mechanisms are `// biome-ignore`, `// @ts-ignore`, `// @ts-expect-error`, `// @ts-nocheck`, and `// eslint-disable`. An approved `biome-ignore` states its reason after the rule name, which is its justification field, and an approved `@ts-expect-error` states it on the same line.

## Canonical shapes

Match these shapes rather than re-deriving them from the rules above.

A domain type with readonly members, and a result as a discriminated union:

```ts
export type Order = {
  readonly id: OrderId
  readonly status: OrderStatus
  readonly lines: readonly OrderLine[]
  readonly shippingAddress?: Address
}

export type ShipResult =
  | { readonly kind: 'shipped'; readonly shipment: Shipment }
  | { readonly kind: 'alreadyShipped'; readonly orderId: OrderId }
  | { readonly kind: 'noAddress'; readonly orderId: OrderId }
```

A guard rather than an assertion:

```ts
async function ship(order: Order): Promise<ShipResult> {
  if (order.status === 'shipped') {
    return { kind: 'alreadyShipped', orderId: order.id }
  }

  if (order.shippingAddress === undefined) {
    return { kind: 'noAddress', orderId: order.id }
  }

  return { kind: 'shipped', shipment: await shipments.create(order, order.shippingAddress) }
}
```

Exhaustive dispatch:

```ts
function selectMessageKey(result: ShipResult): string {
  switch (result.kind) {
    case 'shipped':
      return 'orders.shipped'
    case 'alreadyShipped':
      return 'orders.alreadyShipped'
    case 'noAddress':
      return 'orders.noAddress'
    default: {
      const unhandled: never = result
      throw new Error(`Unhandled ship result ${JSON.stringify(unhandled)}`)
    }
  }
}
```
