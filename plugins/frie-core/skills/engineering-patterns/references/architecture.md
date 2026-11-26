# Architecture

Contents: Subsystems, Canonical shape, Code layout, YAGNI, State, Performance, Observability. Read all of it.

`SKILL.md` holds the rules every edit applies, including layers, results, constructs, and DRY. This file holds the subsystem model and the structure, state, performance, and observability rules that follow from it. A domain skill decides the mechanism of each rule that ends with a domain marker. The language skill says how that language marks a contract and hides internals.

## Subsystems

An application is a tree of subsystems. Every structural rule in these skills applies these terms:

| Term | Meaning |
|---|---|
| Subsystem | Code with one responsibility that owns its state, its storage, and the types that model its concepts. It is named for that responsibility, such as `Orders` or `Pricing`. |
| Contract | What a subsystem lets other code use: the operations they call, the records those operations take and return, the events it publishes, and its registration. |
| Internals | Everything in a subsystem that is not its contract. |
| Composition root | The host's startup code, which chooses the subsystems a process runs. |
| Record | A type that holds data, in whatever form the language skill gives. |
| Persistence type | A type whose shape storage dictates, such as an ORM entity or a row record. |
| Dependency | Anything that has a seam: an external resource, another subsystem's contract, the clock, randomness, or a type that itself takes dependencies. |

The rules:

- One subsystem reaches another only through its contract. Internals take the narrowest visibility the language offers at that level. Where the language cannot hide them, such as between folders in one assembly, no code outside the subsystem references anything but its contract.
- A contract is smaller than the internals behind it. A subsystem whose contract exposes one operation for each internal method hides nothing, so it is merged into its consumer.
- A subsystem's storage, meaning its tables, schema, files, or cache keys, is internal. No other subsystem reads or writes it, including through a query or a view, so data another subsystem needs comes through the contract. A contract operation that a consumer needs for many items takes the set of keys and returns the set, so a consumer never calls a contract once for each item.
- Each piece of state our code defines has exactly one subsystem that writes it. State the engine or framework owns, such as a scene object's transform or a request context, belongs to no subsystem.
- Every type has exactly one owning subsystem. A type that another subsystem uses joins its owner's contract, and the consumer references it there. A persistence type never joins a contract.
- A type every subsystem needs, such as the `Result` type, a money value, or the clock, is a subsystem of its own, named for the concept, whose contract is that type. It depends on no other subsystem.
- A project or folder that no subsystem owns, such as `Common`, `Shared`, or `Utils`, does not exist. Two folders sit outside the subsystem tree: the host, which holds only the composition root, and the test-support module `testing.md` defines.
- Dependencies between subsystems point at contracts and form no cycle. Break a cycle in this order. If one direction only announces that something happened, that subsystem publishes an event and the other consumes it. If both directions are calls about one concept, the concept moves into one of the two or into a subsystem of its own.
- Subsystems nest, from a deployed service down to a folder, and these rules hold at every level. A folder is a nested subsystem only when it has its own responsibility and contract. Otherwise it is part of its parent's internals.
- Only the composition root composes. A subsystem's registration wires its internals, with one entry point for each startup phase the host framework has, and the root calls those entry points.
- Code that makes a decision is handed its dependencies and never constructs or looks one up. It constructs values, records, and collections freely and calls pure functions directly. How a type is handed its dependencies is the domain skill's decision. **(domain: dependencies)**
- A subsystem is tested in isolation. Its tests fake the contracts it depends on and use its real internals, per `testing.md`.

## Canonical shape

Match this shape rather than re-deriving it from the rules. `Inventory` reserves stock when `Orders` places an order, and the event keeps `Orders` from depending on `Inventory`. Names without a file extension stand for one type each, in the language's own file and visibility conventions.

```
Orders/                         subsystem
  OrderLookup                   contract: the operation other subsystems call
  OrderSummary                  contract: the record OrderLookup returns
  OrderPlaced                   contract: the event Orders publishes
  OrdersRegistration            contract: registration
  Order                         internal domain record, used by both features below
  Placement/
    PlaceOrderEndpoint          entry point
    OrderPlacementService       service
  Lookup/
    OrderLookupService          implements OrderLookup
Inventory/                      subsystem, depends on the Orders contract only
  StockLevels                   contract
  InventoryRegistration         contract: registration
  Reservation/
    OrderPlacedHandler          entry point: consumes OrderPlaced
    ReservationService          service: calls OrderLookup
Results/                        subsystem every other one uses
  Result                        contract
Host/
  Startup                       composition root: calls OrdersRegistration and InventoryRegistration
tests/
  TestSupport/
    Orders/
      FakeOrderLookup           state-based fake of the Orders contract
  Inventory/
    ReservationServiceTests     real Reservation internals with FakeOrderLookup
```

## Code layout

The folder tree is the subsystem tree, so reading it alone shows every subsystem the application has and the responsibility of each one.

- **Every folder's name states what it is for**, either a subsystem (`Orders/`, `Authorization/`) or a feature inside one (`Placement/`). It is never named for a kind of type (`Models/`, `Extensions/`, `Helpers/`) or with a name that fits anything (`Infrastructure/`, `Common/`, `Utils/`), because those hide what the code does. The test is whether the folder has one responsibility its name states. A word that is also a kind of type doesn't fail it: a `Controls/` folder that is the app's control library passes, and a `Components/` folder that holds every component fails.
- **An internal type lives beside its consumer.** When a second consumer in the same subsystem appears, the type moves outward only as far as the nearest folder both consumers share. A consumer in another subsystem puts the type in its owner's contract instead.
- Inside the test-support module, a fake sits in a folder named for the subsystem whose contract it fakes.

These rules hold down to a UI project as a whole. Below that, the UI framework's reference sets the layout, because a UI's folders follow its navigation rather than ownership.

## YAGNI

YAGNI, the `SKILL.md` rule against code without a current requirement, does not compete with any structural rule. Every structural rule fires on something that exists right now: a seam a fake needs, a duplicate already in the file, an arm with a real dependency, a type another subsystem already uses. YAGNI only ever speaks to what does not exist yet, so the two never arbitrate the same decision.

A new subsystem starts as a folder. It becomes its own project or deployed service only when a current requirement, such as a second host or independent deployment, needs that boundary.

## State

Records stay dumb. A record holds no rule that depends on a previous state, on another record, or on a dependency, because those are business logic and business logic lives in a service.

A service applies a state change, and whether it produces a modified copy of the record or changes the record in place is the domain skill's decision. **(domain: state-change)**

When more than one service needs the same transition rules, those rules become a state machine that holds real, testable logic. The state machine is static functions when it can be, and an interface only when it has dependencies worth faking.

## Performance

Reason before measuring. Static analysis of the growth curve comes first, then a measurement validates behavior within a shape already known to be correct. A measurement taken at development scale cannot see a cost that grows with the input, so it will report that the wrong shape is fine.

The shapes the domain skill lists, and the ones a framework skill adds, are rejected without measurement. Each one spends a scarce unit, such as a round trip, a full scan, or a tick's time, once for each item when a version exists that spends it once for the batch. The list is closed, so a shape that is not on it is never rejected by reasoning alone. **(domain: rejected-shapes)**

Everything else is empirical. A change made for speed or memory is made only with a measurement before and after, at an input size the first paragraph calls representative. Without that measurement the simpler code stays.

## Observability

A running system emits enough to diagnose a failure without attaching a debugger. What it must emit, and through what, is the domain skill's decision. **(domain: observability)**
