# .NET Layering

The rules here hold whatever the data-access library. The data-access layer itself splits by library, so read the matching file before touching a query, a write, a repository, a `DbContext`, an entity, or a migration:

- **EF Core**: `data-access-efcore.md`. The repo is on EF Core when its data-access project references `Microsoft.EntityFrameworkCore.*`.
- **Dapper** or other hand-written SQL: `data-access-dapper.md`.

## Which project owns a type

A type belongs to the project that **consumes** it, not the one it feels thematically related to.

| Project | What goes here |
|---|---|
| Core | Types shared by two or more projects: API request and response types, domain events, enums, shared utilities. No dependency on any data-access library. |
| Data | Data-access plumbing shared by several projects: the connection factory or `DbContext`, data entities, and migration artifacts. Nothing else. Plumbing used by one project lives in that project. |
| Worker, Blazor, and other leaf projects | Project-internal types. If one project uses it, it lives there, even when it models a business concept. |

Don't pre-emptively promote a type to Core. Move it when a second project actually needs it.

One exception: API request and response types stay in Core even when a single project serves them, because their consumer is the external HTTP caller rather than a project.

## The three type categories

| Category | Location | Naming | Purpose |
|---|---|---|---|
| Data entities | `Data.Entities.*` | `*Entity` suffix | Persistence only, never leaves the data-access layer |
| Domain records | `<Project>.Features.<Feature>.*` | Plain names | Internal working types passed between layers |
| API types | `Core.Api.*` | `*Request` and `*Response` | HTTP contracts |

Under Dapper every table has a data entity. Under EF Core the domain record is usually the mapped type, and a data entity exists only where model configuration cannot bridge the table's shape. Each data-access file says when.

A type never serves two of these categories.

## Which types may appear where

Who holds which *responsibility* is in `architecture.md`. This section covers only which types are allowed to appear in a signature.

| Layer | Accepts | Returns |
|---|---|---|
| Data access | Domain records, primitives | Domain records, primitives |
| Service | Domain records, primitives | `Result<T>` over domain records or primitives |
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

Both directions of the entity boundary in one file, `extension(T)` blocks, `internal`, empty converted to null on the way down:

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
        IOrderService orders,
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
