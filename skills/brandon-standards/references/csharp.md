# C# Style

## Nullability

- `is null` and `is not null`, never `== null`. No first-party analyzer covers this. Roslynator RCS1248 does, and it correctly leaves expression trees alone, so in a repo carrying that package with `dotnet_diagnostic.RCS1248.severity = warning` this is **(tooling)**. Everywhere else it is on you.
  - Exception: expression-tree lambdas require `== null`, because `is null` is CS8122 there **(tooling)**. A collection expression `[]` is likewise CS9175 in an expression tree, so use `Array.Empty<T>()`. Don't comment either exception. In practice this only comes up with a LINQ provider, so EF `HasConversion`, `ValueComparer`, and LINQ-to-entities predicates. It never arises in Dapper, where the predicate is SQL.
- Never the null-forgiving `!`. Use `?.` with a `?? fallback`, or a guard that fails loudly.
- No redundant null guards. If the target accepts null, assign directly rather than wrapping the assignment in `if (x is not null)`.

## Values and collections

- `string.Empty`, never `""`. This includes defaults, coalescing, and query comparisons. Under a LINQ provider it also translates correctly, so EF turns `!= string.Empty` into `<> ''`.
- Domain and API collections are non-null `IReadOnlyList<T>` initialized to `[]`. Nullability on a collection belongs only on a data entity, so the column stores NULL rather than `'[]'`; convert empty to null and back in the mapping layer.
- No inline constant arrays at repeated call sites, which is CA1861 **(tooling)**. Hoist to a `private static readonly T[] _camelCase` field.

## File and member layout

- One type per file.
- Types that bind to `IOptions` are records.
- Expression-bodied members put `=>` at the end of the signature line, the conventional trailing placement.

## Naming

- Method names are verbs. Nouns are properties. This applies to test helpers too.
- Return the concrete type when it is known, so `MemoryStream` rather than `Stream`.

## Logging

Every log call goes through `[LoggerMessage]` source generation: `public static partial void X(this ILogger logger, ...)` extension methods in one `*Log.cs` static partial class per feature.

This is CA1848 **(tooling)** where the repo sets `dotnet_diagnostic.CA1848.severity = warning`. CA rules run during build with no extra property or package, so a direct `logger.LogInformation(...)` call fails the build rather than waiting for review.

## HTTP

- Never `new HttpClient(...)`. Use `IHttpClientFactory` or a typed `AddHttpClient<T>` registration.
- POST endpoints take a JSON body, not query-string flags.

## Control flow

- Braces on every control-flow body, including single-line ones. This is IDE0011 via `csharp_prefer_braces`, but an `IDE*` rule only fires during build when the project sets `EnforceCodeStyleInBuild`, so in a repo without that property it is an IDE-only hint and still on you to get right.
- Keep dispatch as a readable pattern-match switch. Bolt a narrow edge case on as an early guard rather than restructuring the switch around it.
- No empty catch blocks. Log at least at Trace through the feature's `*Log.cs` extensions, even for an expected shutdown-path exception such as `OperationCanceledException`.

## Await

Never dereference an awaited call in place. `(await GetAsync()).Name` and `(await GetAsync()).Should().Be(x)` both get an `await` on its own line first, landing in a named local that the next line reads. The parenthesized form buries what was awaited behind punctuation, and the local is what makes the line say which value is being asserted on.

```csharp
var saved = await File.ReadAllBytesAsync(path, cancellationToken);

saved.Should().StartWith([0xEF, 0xBB, 0xBF]);
```

## Config files

No empty sections in `.editorconfig` or similar config files.

## Canonical shapes

Match these shapes rather than re-deriving them from the rules above.

Logging, one `*Log.cs` per feature. This is the one place the `this` parameter style is correct, because the source generator requires it:

```csharp
internal static partial class OrderLog
{
    [LoggerMessage(Level = LogLevel.Information, Message = "Order {OrderId} shipped with {Count} lines")]
    public static partial void OrderShipped(this ILogger logger, long orderId, int count);

    [LoggerMessage(Level = LogLevel.Trace, Message = "Order polling loop cancelled during shutdown")]
    public static partial void LoopCancelled(this ILogger logger);
}
```

A domain record: non-null collections, initialized to `[]`, hoisted constants:

```csharp
internal sealed record Order(long Id, string Number, IReadOnlyList<OrderLine> Lines)
{
    private static readonly string[] _openStatuses = ["Placed", "Packing"];

    public string Status { get; init; } = string.Empty;

    public IReadOnlyList<string> Notes { get; init; } = [];

    public bool IsOpen() => _openStatuses.Contains(Status);
}
```

Nullability: a guard or a coalesce, never `!`:

```csharp
if (order.ShippingAddress is null)
{
    return ShippingQuote.Unavailable(order.Id);
}

var carrier = order.Carrier?.Name ?? string.Empty;
```

A catch that expects the exception still logs:

```csharp
catch (OperationCanceledException)
{
    logger.LoopCancelled();
}
```
