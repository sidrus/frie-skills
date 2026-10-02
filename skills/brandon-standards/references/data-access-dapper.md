# Data Access: Dapper

Applies when the repo reads and writes through Dapper or other hand-written SQL. A repo on EF Core uses `data-access-efcore.md` instead. The rules that hold for both, such as type ownership, the signature table, and mapping file naming, are in `dotnet-layering.md`.

## The repository

The repository is the data-access layer. It is the only type that touches data entities and the only place SQL lives.

- It projects from `*Entity` on the way out and constructs one on the way in, so no `Data.Entities.*` type ever appears in its interface signature.
- SQL is hoisted to `private const string` raw string literals on the repository. A service never holds a query string.
- Dapper's extension methods take no token directly, so the token goes through `CommandDefinition`.

## Data entities

Every table read or written gets a `*Entity`. It is shaped by the table, so it carries the column nullability, the raw JSON string, and the identity key, and it stays behind the repository. It never doubles as the domain record, even when the two currently have the same members, because hand-written SQL has no model configuration to absorb a later difference in shape.

Both directions of the entity boundary live in one `*EntityMappingExtensions.cs`, shaped as in `dotnet-layering.md`.

## Canonical shapes

The repository interface takes and returns domain records:

```csharp
internal interface IOrderRepository
{
    Task<Order?> FindAsync(long id, CancellationToken cancellationToken);
    Task AddAsync(Order order, CancellationToken cancellationToken);
}
```

The implementation, with SQL hoisted to constants and the token passed through `CommandDefinition`:

```csharp
internal sealed class OrderRepository(IDbConnectionFactory connections) : IOrderRepository
{
    private const string FindSql = """
        SELECT Id, Number, Lines, Notes
        FROM sales.Orders
        WHERE Id = @Id;
        """;

    private const string InsertSql = """
        INSERT INTO sales.Orders (Number, Lines, Notes)
        VALUES (@Number, @Lines, @Notes);
        """;

    public async Task<Order?> FindAsync(long id, CancellationToken cancellationToken)
    {
        using var connection = await connections.OpenAsync(cancellationToken);

        var entity = await connection.QuerySingleOrDefaultAsync<OrderEntity>(
            new CommandDefinition(FindSql, new { Id = id }, cancellationToken: cancellationToken));

        return entity?.ToDomain();
    }

    public async Task AddAsync(Order order, CancellationToken cancellationToken)
    {
        using var connection = await connections.OpenAsync(cancellationToken);

        await connection.ExecuteAsync(
            new CommandDefinition(InsertSql, order.ToEntity(), cancellationToken: cancellationToken));
    }
}
```
