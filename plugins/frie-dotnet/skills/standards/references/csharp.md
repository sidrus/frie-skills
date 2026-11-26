# C# Style

## Nullability

- `is null` and `is not null`, never `== null`. No first-party analyzer covers this. Roslynator RCS1248 does, and it correctly leaves expression trees alone, so in a repo referencing that package with `dotnet_diagnostic.RCS1248.severity = warning` this is **(tooling)**. Everywhere else you apply it by hand.
  - Exception: expression-tree lambdas require `== null`, because `is null` is CS8122 there **(tooling)**. A collection expression `[]` is likewise CS9175 in an expression tree, so use `Array.Empty<T>()`. Don't comment either exception. In practice this comes up only under a LINQ provider, in EF `HasConversion`, `ValueComparer`, and LINQ-to-entities predicates. It never arises in Dapper, where the predicate is SQL.
- Never the null-forgiving `!`. Use `?.` with a `?? fallback`, or a guard that fails loudly.

## Values and collections

- `string.Empty`, never `""`. This includes defaults, coalescing, and query comparisons. Under a LINQ provider it also translates correctly, so EF turns `!= string.Empty` into `<> ''`.
- Domain and API collections are `IReadOnlyList<T>` initialized to `[]`.
- A hoisted constant array is a `private static readonly T[]` field. Inline constant arrays at repeated call sites are CA1861 **(tooling)**.
- On an array or list, use the indexer, `Count`, ranges, or the collection's own methods, never `Enumerable` methods such as `FirstOrDefault`, `Last`, `Reverse`, or `Take`. `Select` projections are fine.

## File and member layout

- One type per file.
- Expression-bodied members put `=>` at the end of the signature line, the conventional trailing placement.
- Private `static readonly` fields are `_camelCase`.
- Enum members are separated by a blank line.
- An object initializer that doesn't fit on one line with its `new` puts its opening brace on its own line and one member per line.

## Signatures and naming

- The trailing cancellation parameter is a `CancellationToken` named `cancellationToken`, never `ct`.
- A value hoisted out of a signature is a `private static readonly` field.
- A member that takes no arguments, has no side effects, and only returns a value is a property, never a method.
- Return the concrete type when it is known, so `MemoryStream` rather than `Stream`.
- Return a named record, never a tuple, private helpers included.
- Resolve a name collision by renaming the type, never with a `using` alias.

## Contracts

A subsystem that is its own project makes its contract `public` and everything else `internal`. Inside one project, both are `internal`.

## Doc comments

XML docs go on a subsystem's contract whatever its visibility, because a subsystem that is a folder has an `internal` contract. Nothing else gets them.

## Time, resources, and exceptions

- Time comes from an injected `TimeProvider`, and a test fakes it with `FakeTimeProvider` from `Microsoft.Extensions.TimeProvider.Testing`.
- A disposable is disposed with `using`, or `await using` when it implements `IAsyncDisposable`.
- A wrapped exception passes the original as its `innerException`.

## Control flow

Braces on every body are IDE0011 via `csharp_prefer_braces`, but an `IDE*` rule only fires during build when the project sets `EnforceCodeStyleInBuild`, so in a repo without that property it is an IDE-only hint and you apply it by hand.

## Await

Never dereference an awaited call in place. `(await GetAsync()).Name` and `(await GetAsync()).Should().Be(x)` both get an `await` on its own line first, landing in a named local that the next line reads. The parenthesized form hides what was awaited inside the parentheses, and the local is what makes the line say which value the assertion checks.

```csharp
var saved = await File.ReadAllBytesAsync(path, cancellationToken);

saved.Should().StartWith([0xEF, 0xBB, 0xBF]);
```

## Suppressions

The ruled-out mechanisms are `#pragma`, `[SuppressMessage]`, and csproj `<NoWarn>`. An approved `[SuppressMessage]` states its reason in `Justification`, and an approved `#pragma` states it on the pragma line.

## Canonical shapes

Match these shapes rather than re-deriving them from the rules above.

A domain record with non-null collections initialized to `[]` and a hoisted constant array:

```csharp
internal sealed record Order(long Id, string Number, IReadOnlyList<OrderLine> Lines)
{
    private static readonly OrderStatus[] _openStatuses = [OrderStatus.Placed, OrderStatus.Packing];

    public OrderStatus Status { get; init; }

    public IReadOnlyList<string> Notes { get; init; } = [];

    public bool IsOpen => _openStatuses.Contains(Status);
}
```

Absence handled with a guard or a coalesce, never `!`:

```csharp
if (order.ShippingAddress is null)
{
    return ShippingQuote.Unavailable(order.Id);
}

var carrier = order.Carrier?.Name ?? string.Empty;
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
