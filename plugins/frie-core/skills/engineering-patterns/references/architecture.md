# Architecture

This file describes general practice, not any one repo.

`SKILL.md` holds the design rules that apply everywhere. This file holds the subsystem model and the structure, state, performance, and observability rules that follow from it. A domain skill decides the mechanism of each rule marked **(domain)**, as `SKILL.md` describes under Layers. Each language plugin's `standards` reference says how that language marks a contract and hides internals.

## Subsystems

An application is a tree of subsystems. Every structural rule in this file applies these terms:

| Term | Meaning |
|---|---|
| Subsystem | Code with one responsibility that owns its state, its storage, and the types that model its concepts. It is named for that responsibility, such as `Orders` or `Pricing`. |
| Contract | What a subsystem lets other code use: the operations they call, the records those operations take and return, the events it publishes, and its registration. |
| Internals | Everything in a subsystem that is not its contract. |
| Composition root | The host's startup code, which chooses the subsystems a process runs. |

The rules:

- One subsystem reaches another only through its contract. Internals take the narrowest visibility the language offers at that level. Where the language cannot hide them, such as between folders in one assembly, no code outside the subsystem references anything but its contract.
- A subsystem's storage, meaning its tables, schema, files, or cache keys, is internal. No other subsystem reads or writes it, including through a query or a view, so data another subsystem needs comes through the contract.
- Every type has exactly one owning subsystem. A type that another subsystem uses joins its owner's contract, and the consumer references it there. A persistence type never joins a contract. A project or folder that no subsystem owns, such as `Common`, `Shared`, or `Utils`, does not exist.
- Dependencies between subsystems point at contracts and form no cycle. A cycle means one responsibility is split across two subsystems, so it moves into one of them or into a new subsystem of its own.
- Subsystems nest, from a deployed service down to a folder, and these rules hold at every level. A folder is a nested subsystem only when it has its own responsibility and contract. Otherwise it is part of its parent's internals.
- Only the composition root composes. A subsystem's registration wires its internals, with one entry point per startup phase the host framework has, and the root calls those entry points. Code that makes a decision receives what it depends on from its caller and never constructs or looks up a dependency itself. How the root hands a type its dependencies is the domain skill's decision. **(domain)**
- A subsystem is tested in isolation. Its tests fake the contracts it depends on and use its real internals, per `testing.md`.

### Canonical shape

Match this shape rather than re-deriving it from the rules. `Inventory` reserves stock when `Orders` places an order. Names without a file extension stand for one type each, in the language's own file and visibility conventions.

```
Orders/                         subsystem
  OrderLookup                   contract: the operation other subsystems call
  OrderSummary                  contract: the record OrderLookup returns
  OrderPlaced                   contract: the event Orders publishes
  OrdersRegistration            contract: registration
  Order                         internal domain record, used by both features below
  Placement/
    PlaceOrderEndpoint
    OrderPlacementService
  Lookup/
    OrderLookupService          implements OrderLookup
Inventory/                      subsystem, depends on the Orders contract only
  StockLevels                   contract
  InventoryRegistration         contract: registration
  Reservation/
    OrderPlacedHandler          consumes OrderPlaced
    ReservationService          calls OrderLookup
Host/
  Startup                       composition root: calls OrdersRegistration and InventoryRegistration
tests/
  TestSupport/
    FakeOrderLookup             state-based fake of the Orders contract
  Inventory/
    ReservationServiceTests     real Reservation internals with FakeOrderLookup
```

## Code layout

The folder tree is the subsystem tree, so reading it alone shows every subsystem the application has and the responsibility of each one.

- **Every folder's name states what it is for**, either a subsystem (`Orders/`, `Authorization/`) or a feature inside one (`Placement/`). It is never named for a kind of type (`Models/`, `Extensions/`, `Helpers/`) or with a name that fits anything (`Infrastructure/`, `Common/`, `Utils/`), because those hide what the code does. The test is whether the folder has one responsibility its name states. A word that is also a kind of type doesn't fail it: a `Controls/` folder that is the app's control library passes, and a `Components/` folder that holds every component fails.
- **An internal type lives beside its consumer.** When a second consumer in the same subsystem appears, the type moves outward only as far as the nearest folder both consumers share. A consumer in another subsystem puts the type in its owner's contract instead.

These rules hold down to a UI project as a whole. Below that, the UI framework's reference sets the layout, because a UI's folders follow its navigation rather than ownership.

## Layer responsibilities

Inside a subsystem, two layers each have one job. A domain skill may add layers beside them.

| Layer | Responsibility | Forbidden |
|---|---|---|
| Entry point | Marshal input to and from domain services. Validate its own input types so marshaling can succeed. | Any domain knowledge. Deciding what a failure means, or which domain operation applies. |
| Service | All business logic. | Anything that belongs to another layer. |

The entry point is whatever the framework calls into: an HTTP endpoint, a UI event handler, a message consumer, a game engine callback. A framework skill lists its entry points.

## Results, not booleans

A service returns a `Result`. The entry point translates that into its response. The error type and the arity are the repo's choice.

An expected failure is a `Result` case, even when it is the only one. A thrown exception means a bug or an infrastructure failure.

A `bool` or a bare `null` return cannot express why something failed, which forces the entry point to know that false means "already shipped" here and "out of stock" there. That is domain knowledge in the marshaling layer, so the entry point ends up owning a rule it is not allowed to own.

A lookup whose only failure is absence returns the language's nullable type instead, because absence is the one reason it can express. A predicate that answers a question about its input, such as whether an order can ship, returns a `bool`, because no is an answer and not a failure.

## When to add a construct

| Construct | Justified by |
|---|---|
| Interface | Substitution. The practical test is "will I write a fake for this?" An external dependency and a contract operation always qualify, so an interface per class never does. |
| Record | Pure data. |
| Enum | Two or more members. A single member conveys no information. |
| Static pure function | Pure methods. Purity beats injection, because a total function never needs a seam. |
| Its own class | Any branch or switch arm with a dependency, or with more than trivial behavior. Isolated behavior is easier to reason about and easier to test. |
| Nothing at all | Pass-through and forwarding types. If the body only forwards, the type should not exist. |

One seam per external dependency. Never stack a second interface over an interface that already covers the same seam, because the class between them can only forward.

When variation arrives, abstract the part that varies rather than the stable logic wrapped around it. A price calculator reading rates from several sources keeps its pure calculation static and takes an injected loader for the rates.

A switch is fine while every arm is trivial. As soon as one arm needs a dependency or holds real logic, the arms become their own types.

## DRY

DRY is unconditional. Any duplication gets refactored, because the failure it prevents is a copy and paste bug. There is no rule of three and no exemption for two sites that happen to change for different reasons.

Inside the code we deploy together, DRY outranks a stable wire shape. If removing the duplication means an internal response type gains a nested block and our own consumers adjust, that is the cost of the fix. A published contract, meaning a public API, a package, or a stored or wire format that code outside the repo reads, keeps its shape, so the duplication is removed behind it and the contract changes only through its own versioning.

Extraction must never read worse than the duplication did. When it does, the parameter is wrong rather than the extraction. A boolean argument or a required `null` argument at a call site is an architectural signal that the method is doing two things or the type is wrong.

DRY applies to logic and concepts, not to matching shapes. Two subsystems that model different concepts with records of similar members are not duplicates, because merging them would give one type two owners.

## YAGNI

YAGNI, the `SKILL.md` rule against code without a current requirement, does not compete with anything above it. Every structural rule here fires on something that exists right now: a seam a fake needs, a duplicate already in the file, an arm with a real dependency, a type another subsystem already uses. YAGNI only ever speaks to what does not exist yet, so the two never arbitrate the same decision.

A new subsystem starts as a folder. It becomes its own project or deployed service only when a current requirement, such as a second host or independent deployment, needs that boundary.

## State and immutability

Records stay dumb. A record holds data and no transition rules, because which transitions are legal is business logic and business logic lives in a service.

A service applies a state change, and whether it produces a modified copy of the record or changes the record in place is the domain skill's decision. **(domain)**

When more than one service needs the same transition rules, those rules become a state machine that holds real, testable logic. The state machine is static functions when it can be, and an interface only when it has dependencies worth faking.

## Performance

Reason before measuring. Static analysis of the growth curve comes first, then a measurement validates behavior within a shape already known to be correct. A measurement taken at development scale cannot see a cost that grows with the input, so it will report that the wrong shape is fine.

A shape whose cost grows with its input when a constant-cost version exists is rejected without measurement. The domain skill lists those shapes, and a framework skill adds its own to that list. **(domain)**

Everything else is empirical. Take a measurement whenever one can be taken, and let the number decide.

## Observability

A running system emits enough to diagnose a failure without attaching a debugger. What it must emit, and through what, is the domain skill's decision. **(domain)**
