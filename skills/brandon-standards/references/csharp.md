# C# Style

`dotnet-skills:csharp-coding-standards` covers what this file and `engineering-patterns` don't.

## Nullability

- `is null` and `is not null`, never `== null`. No first-party analyzer covers this. Roslynator RCS1248 does, and it correctly leaves expression trees alone, so in a repo carrying that package with `dotnet_diagnostic.RCS1248.severity = warning` this is **(tooling)**. Everywhere else it is on you.
  - Exception: expression-tree lambdas require `== null`, because `is null` is CS8122 there **(tooling)**. A collection expression `[]` is likewise CS9175 in an expression tree, so use `Array.Empty<T>()`. Don't comment either exception. In practice this only comes up with a LINQ provider, so EF `HasConversion`, `ValueComparer`, and LINQ-to-entities predicates. It never arises in Dapper, where the predicate is SQL.
- The non-null assertion is the null-forgiving `!`. Use `?.` with a `?? fallback`, or a guard that fails loudly.

## Values and collections

- `string.Empty`, never `""`. This includes defaults, coalescing, and query comparisons. Under a LINQ provider it also translates correctly, so EF turns `!= string.Empty` into `<> ''`.
- Domain and API collections are `IReadOnlyList<T>` initialized to `[]`.
- A hoisted constant array is a `private static readonly T[]` field. Inline constant arrays at repeated call sites are CA1861 **(tooling)**.

## File and member layout

- One type per file.
- Types that bind to `IOptions` are records.
- Expression-bodied members put `=>` at the end of the signature line, the conventional trailing placement.
- Private `static readonly` fields are `_camelCase`.

## Signatures and naming

- The trailing cancellation parameter is a `CancellationToken` named `cancellationToken`, never `ct`.
- A value hoisted out of a signature is a `private static readonly` field.
- A member that only returns a value is a property, never a noun-named method.
- Return the concrete type when it is known, so `MemoryStream` rather than `Stream`.

## Doc comments

XML docs go on the API surface, even when the rest of the file has none. Public and internal members are equivalent for this, since an internal-by-design assembly still has a cross-layer contract.

## Logging

Every log call goes through `[LoggerMessage]` source generation: `public static partial void X(this ILogger logger, ...)` extension methods in one `*Log.cs` static partial class per feature.

This is CA1848 **(tooling)** where the repo sets `dotnet_diagnostic.CA1848.severity = warning`. CA rules run during build with no extra property or package, so a direct `logger.LogInformation(...)` call fails the build rather than waiting for review.

A catch that expects its exception logs through the feature's `*Log.cs` extensions.

## Observability

`ILogger` is the logging framework the observability floor routes through OpenTelemetry. For setup, semantic conventions, exporter configuration, and instrumentation API details, read `dotnet-skills:opentelementry-dotnet-instrumentation`, plus `dotnet-skills:aspire-service-defaults` when the shared wiring belongs in one place. `engineering-patterns` decides what must be instrumented and what earns a metric, and those cover how to wire it.

## HTTP

- Never `new HttpClient(...)`. Use `IHttpClientFactory` or a typed `AddHttpClient<T>` registration.
- POST endpoints take a JSON body, not query-string flags.

## Control flow

Braces on every body are IDE0011 via `csharp_prefer_braces`, but an `IDE*` rule only fires during build when the project sets `EnforceCodeStyleInBuild`, so in a repo without that property it is an IDE-only hint and still on you to get right.

## Await

Never dereference an awaited call in place. `(await GetAsync()).Name` and `(await GetAsync()).Should().Be(x)` both get an `await` on its own line first, landing in a named local that the next line reads. The parenthesized form buries what was awaited behind punctuation, and the local is what makes the line say which value is being asserted on.

```csharp
var saved = await File.ReadAllBytesAsync(path, cancellationToken);

saved.Should().StartWith([0xEF, 0xBB, 0xBF]);
```

## Suppressions

The ruled-out mechanisms are `#pragma`, `[SuppressMessage]`, and csproj `<NoWarn>`. An approved `[SuppressMessage]` carries its reason in `Justification`, and an approved `#pragma` carries it on the pragma line.

## Tests

- Names are `Method_ExpectedBehavior_Condition`, such as `Ship_RejectsOrder_WhenAlreadyShipped`.
- Run the red with `dotnet test --filter`.
- Endpoint authorization is one `Theory` of role to status code.
- Test data comes from Bogus, with `Soenneker.Utils.AutoBogus` where auto-generation is needed and never the abandoned `AutoBogus`. Each domain type gets one `Faker<T>`.
- The shared test-support module is one TestSupport project referenced by every test project.
- Integration tests live in a separate `*.IntegrationTests` project.
- A Windows-1252 fixture is read with `Encoding.GetEncoding(1252)`, since `Encoding.Latin1` is not CP1252.

## Canonical shapes

Match these shapes rather than re-deriving them from the rules above.

Logging, one `*Log.cs` per feature. This is the one place the `this` parameter style is correct, because the source generator requires it:

```csharp
internal static partial class OrderLog
{
    [LoggerMessage(Level = LogLevel.Information, Message = "Order {OrderId} shipped with {Count} lines")]
    public static partial void OrderShipped(this ILogger logger, long orderId, int count);

    [LoggerMessage(Level = LogLevel.Trace, Message = "Order polling loop canceled during shutdown")]
    public static partial void LoopCanceled(this ILogger logger);
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
    logger.LoopCanceled();
}
```
