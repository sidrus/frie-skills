# Layering

The `engineering-patterns` architecture reference defines subsystems, the entry point layer, and the service layer. This file adds the third layer a service or business application has, and how dependencies and state move through all three.

## Data access

| Layer | Responsibility | Forbidden |
|---|---|---|
| Data access | Read and write domain records, through a repository or the ORM's own context. | Any business logic. |

- Each subsystem owns its data access, and a persistence type stays inside that layer.
- An entry point may read through data access directly when it makes no decision at all, which is the pure passthrough read. One branch, one normalization, or one rule and a service owns it.
- Data access is not unit tested. It delegates to its data source, so a unit test over it asserts that the mapping library still works. Integration tests over the real schema cover it.

## Dependencies

A type declares what it depends on in its constructor, and the host's dependency injection container supplies it. A subsystem's registration is the only code that tells the container about the subsystem's types. No type takes the container, or a service locator over it, as a dependency.

## State

A record is immutable once built. A state change is the service producing a modified copy of the record, in the language's copy idiom, and handing the copy to data access.

## Canonical shape

This extends the shape in the `engineering-patterns` architecture reference with the data access each subsystem owns.

```
Orders/
  OrderRepository               internal data access over the Orders schema
  OrderEntity                   internal persistence type
  Placement/
    PlaceOrderEndpoint          entry point: marshals the request, calls the service
    OrderPlacementService       service: decides, then writes through OrderRepository
Inventory/
  Reservation/
    StockRepository             internal data access over the Inventory schema
```
