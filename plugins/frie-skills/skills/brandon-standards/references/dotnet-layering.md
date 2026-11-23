# .NET Layering

The rules here hold whatever the data-access library. The data-access layer itself splits by library, so read the matching file before touching a query, a write, a repository, a `DbContext`, an entity, or a migration:

- **EF Core**: `data-access-efcore.md`. The repo is on EF Core when its data-access project references `Microsoft.EntityFrameworkCore.*`.
- **Dapper** or other hand-written SQL: `data-access-dapper.md`.

For the query-level mechanics behind the performance rules in `engineering-patterns`, read `dotnet-skills:database-performance` and `dotnet-skills:efcore-patterns`. The performance rules decide *which* fix to apply and in what order, and those skills cover how to write it.

## Which subsystem owns a type

Projects and folders follow the subsystem model in the `engineering-patterns` architecture reference, and `Program.cs` is the composition root.

- A subsystem that is its own project makes its contract `public` and everything else `internal`. Inside one project, both are `internal`.
- Each subsystem owns its data access: its `DbContext` or repositories, its data entities, and the migrations for its schema.
- Plumbing with no domain knowledge that several subsystems need, such as a connection factory, is its own subsystem named for that one responsibility. It never holds data entities or another subsystem's types.
- API request and response types belong to the subsystem whose endpoints serve them. They join its contract only when a .NET client in another project consumes them.

## The three type categories

| Category | Location | Naming | Purpose |
|---|---|---|---|
| Data entities | Beside the owning subsystem's data access | `*Entity` suffix | Persistence only, never leaves the data-access layer |
| Domain records | The owning subsystem's folder | Plain names | Working types passed between layers, and the records a contract takes and returns |
| API types | Beside the endpoints that serve them | `*Request` and `*Response` | HTTP contracts |

Under Dapper every table has a data entity. Under EF Core the domain record is usually the mapped type, and a data entity exists only where model configuration cannot bridge the table's shape. Each data-access file says when.

A type never serves two of these categories.

## Which types may appear where

Who holds which *responsibility* is in the `engineering-patterns` architecture reference. This section covers only which types are allowed to appear in a signature.

| Layer | Accepts | Returns |
|---|---|---|
| Data access | Domain records, primitives | Domain records, primitives |
| Service | Domain records, primitives | A `Result` over domain records or primitives, or a nullable record from a lookup |
| Endpoint | `*Request` types | `*Response` types |

The data-access layer is the repository under Dapper and the `DbContext` under EF Core. In both, a data entity stays inside it and never appears in a service or endpoint signature.

An endpoint maps domain records to response types before returning, and never exposes a raw domain record or data entity.

## Mapping

Keep the layer types separate, but co-locate **both directions** of one boundary in a single file. One file per boundary, not one file per direction.

| File | Responsibility |
|---|---|
| `*EntityMappingExtensions.cs` | Entity to domain and back, wherever a data entity exists |
| `*ApiMappingExtensions.cs` | API to domain and back, meaning request to domain and domain to response |

Only create a mapping file when the feature has a type on the other side of that boundary.

| Direction | Method |
|---|---|
| Entity to domain | `ToDomain()` |
| Domain to entity | `ToEntity()` |
| API request to domain | `ToDomain()` |
| Domain to API response | `ToResponse()` |

When one source maps to several response shapes, name the target: `ToOrderSummary()`, `ToOrderDetailResponse()`.

Mapping and projection are always extension methods in a `<Type>MappingExtensions.cs` file near the consumer, never private static helpers on the consuming class. All mapping classes are `internal` and use C# 14 `extension(T)` block syntax rather than the `this T` parameter style.

A repo may exempt specific files from the entity-versus-API split, such as an external SDK adapter or a formatting utility. Those still use `extension(T)` and stay `internal`. The repo's `CLAUDE.md` holds the exemption list.

## Canonical shapes

Match these shapes rather than re-deriving them from the rules above. The data-access shapes are in the matching data-access file.

Both directions of the entity boundary in one `internal` file of `extension(T)` blocks, with empty collections converted to null on the way down:

```csharp
internal static class OrderEntityMappingExtensions
{
    extension(OrderEntity entity)
    {
        public Order ToDomain() => new(entity.Id, entity.Number, entity.Lines?.ToList() ?? [])
        {
            Notes = entity.Notes?.ToList() ?? [],
        };
    }

    extension(Order order)
    {
        public OrderEntity ToEntity() => new()
        {
            Id = order.Id,
            Number = order.Number,
            Lines = order.Lines.Count > 0 ? order.Lines.ToList() : null,
            Notes = order.Notes.Count > 0 ? order.Notes.ToList() : null,
        };
    }
}
```

An endpoint maps to the response type before returning:

```csharp
internal static class OrderEndpoints
{
    public static async Task<Results<Ok<OrderDetailResponse>, NotFound>> GetOrderAsync(
        long id,
        OrderService orders,
        CancellationToken cancellationToken)
    {
        var order = await orders.FindAsync(id, cancellationToken);

        if (order is null)
        {
            return TypedResults.NotFound();
        }

        return TypedResults.Ok(order.ToOrderDetailResponse());
    }
}
```

When `Orders` is its own project, a contract operation is a `public` interface over `public` records, implemented by an `internal` service:

```csharp
/// <summary>Reads orders on behalf of other subsystems.</summary>
public interface IOrderLookup
{
    /// <summary>Finds an order's summary, or returns null when no order has the ID.</summary>
    Task<OrderSummary?> FindAsync(long id, CancellationToken cancellationToken);
}
```

A subsystem's registration, one `extension(T)` block per startup phase, wiring `internal` types that the host never sees:

```csharp
/// <summary>Registers the Orders subsystem with a host.</summary>
public static class OrdersRegistration
{
    extension(IServiceCollection services)
    {
        /// <summary>Registers the Orders services.</summary>
        public IServiceCollection AddOrders()
        {
            services.AddScoped<IOrderLookup, OrderLookupService>();
            services.AddScoped<OrderPlacementService>();

            return services;
        }
    }

    extension(IEndpointRouteBuilder endpoints)
    {
        /// <summary>Maps the Orders HTTP endpoints.</summary>
        public IEndpointRouteBuilder MapOrders()
        {
            endpoints.MapGet("/orders/{id:long}", OrderEndpoints.GetOrderAsync);

            return endpoints;
        }
    }
}
```

The host's `Program.cs` is the composition root and calls only registration entry points:

```csharp
var builder = WebApplication.CreateBuilder(args);

builder.Services
    .AddOrders()
    .AddInventory();

var app = builder.Build();

app.MapOrders();

app.Run();
```
