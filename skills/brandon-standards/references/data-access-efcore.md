# Data Access: EF Core

Applies when the repo reads and writes through EF Core. A repo on Dapper or other hand-written SQL uses `data-access-dapper.md` instead. The rules that hold for both, such as type ownership, the signature table, and API mapping, are in `dotnet-layering.md`.

## The DbContext is the repository

EF already provides the repository and the unit of work. `DbSet<T>` is the repository, `SaveChangesAsync` is the transaction, and the model configuration is the mapping. Services query the context directly with LINQ. A repository class over a `DbContext` can only forward, so it does not exist, and neither does an interface over the context, because tests run against the real database.

- The context is `internal` to the project that owns its tables. Nothing outside that project can reach them, which makes the context the persistence boundary.
- Under Blazor Server, or from any singleton, inject `IDbContextFactory<T>` and create one context per operation with `await using`. A long-lived context accumulates tracked state across unrelated work.
- Raw SQL stays out of services. When LINQ cannot express a query, the `FromSql` call lives in a query extension, below.

## Domain records are the mapped types

The domain record is what `DbSet<T>` holds. Column shape differences are bridged in `OnModelCreating`: value conversions, owned types, JSON columns, and a `ValueComparer` for converted collections. Expression-tree lambdas in that configuration follow the `== null` and `Array.Empty<T>()` exceptions in `csharp.md`.

A separate `*Entity` with `*EntityMappingExtensions.cs` earns its place only when model configuration cannot express the difference between the table and the record. Then it follows the entity rules in `data-access-dapper.md` for that one type.

## Queries

- Reads are `AsNoTracking`. Records compare by value, so tracking stays short-lived and deliberate.
- A read that needs part of a record projects with `Select` rather than materializing the whole row.
- Every list read is bounded, per the performance rules in `architecture.md`.
- A filter or ordering used by more than one query is a static extension over `IQueryable<T>` in a `*QueryExtensions.cs` beside the context, using an `extension(IQueryable<T>)` block. That keeps query logic DRY and pure, with nothing to inject.

## Writes

- Inserts are `Add` then `SaveChangesAsync`.
- Set-based updates and deletes are `ExecuteUpdateAsync` and `ExecuteDeleteAsync`, which run in the database without loading rows.
- A tracked load, modify, and save is the deliberate exception, used when the change depends on the loaded state.

## Constraint violations

Integrity lives in the database, so a write can come back as a constraint violation. The service classifies it at the call site, catching `DbUpdateException` and dispatching on the provider exception's structured fields: `SqlState` and `ConstraintName` for Npgsql. The constraint name is a `const` on the context, passed to `HasDatabaseName` or `HasName` in the model and matched in the catch filter, so the two cannot drift.

## Schema and migrations

- A context in a modular solution owns a schema: `HasDefaultSchema`, plus `MigrationsHistoryTable` in that same schema, so each module's migrations are independent.
- Migrations are generated with `dotnet ef migrations add` against the context and committed alongside the model change that produced them.

## Testing

Integration tests run against the real provider through Testcontainers. The EF in-memory provider and SQLite stand-ins are not substitutes, because they skip the constraints and SQL translation that the behavior depends on.

## Canonical shapes

The context, internal, with its schema and a named constraint:

```csharp
internal sealed class SalesDbContext(DbContextOptions<SalesDbContext> options) : DbContext(options)
{
    public const string Schema = "sales";
    public const string OrderNumberIndex = "ix_orders_store_id_number";

    public DbSet<Order> Orders => Set<Order>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema(Schema);

        modelBuilder.Entity<Order>(order =>
        {
            order.HasKey(entity => entity.Id);
            order
                .HasIndex(entity => new { entity.StoreId, entity.Number })
                .IsUnique()
                .HasDatabaseName(OrderNumberIndex);
        });
    }
}
```

A shared filter as a query extension:

```csharp
internal static class OrderQueryExtensions
{
    extension(IQueryable<Order> orders)
    {
        public IQueryable<Order> Open() =>
            orders.Where(order => order.Status == OrderStatus.Placed || order.Status == OrderStatus.Packing);
    }
}
```

A service reading untracked and bounded, and writing with the constraint classified at the call site:

```csharp
internal sealed class OrderService(IDbContextFactory<SalesDbContext> contexts)
{
    private const int MaxOrders = 500;

    public async Task<IReadOnlyList<Order>> ListOpenAsync(Guid storeId, CancellationToken cancellationToken)
    {
        await using var context = await contexts.CreateDbContextAsync(cancellationToken);

        return await context.Orders
            .AsNoTracking()
            .Where(order => order.StoreId == storeId)
            .Open()
            .OrderBy(order => order.Number)
            .Take(MaxOrders)
            .ToListAsync(cancellationToken);
    }

    public async Task<Result<Order>> PlaceAsync(Order order, CancellationToken cancellationToken)
    {
        await using var context = await contexts.CreateDbContextAsync(cancellationToken);

        context.Orders.Add(order);

        try
        {
            await context.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException
        {
            SqlState: PostgresErrorCodes.UniqueViolation,
            ConstraintName: SalesDbContext.OrderNumberIndex,
        })
        {
            return new Result<Order>.Failure(new OrderNumberTaken(order.Number));
        }

        return new Result<Order>.Success(order);
    }
}
```
