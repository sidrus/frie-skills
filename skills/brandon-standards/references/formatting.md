# C# Formatting

These rules cover line breaking. They are deliberately compatible with `dotnet format` and the IDE's code cleanup, so running either must never undo the house style. If a rule here would be undone by code cleanup, the rule is wrong and gets dropped.

The repo's `.editorconfig` sets the line-length limit referenced below.

## One fluent operator per line

A chain of two or more invoked operators splits so that each operator starts its own line, indented one level under the receiver. This holds whether the chain currently fits on one line or is already partly wrapped.

```csharp
public async Task<IReadOnlyList<string>> ListNumbersAsync(CancellationToken cancellationToken) =>
    await context.Orders
        .Select(order => order.Number)
        .OrderBy(number => number)
        .ToListAsync(cancellationToken);
```

A partly wrapped chain is still wrong. This

```csharp
var statuses = await context.Orders.Where(order => order.StoreId == storeId)
    .Select(order => order.Status).ToListAsync(cancellationToken);
```

becomes this.

```csharp
var statuses = await context.Orders
    .Where(order => order.StoreId == storeId)
    .Select(order => order.Status)
    .ToListAsync(cancellationToken);
```

A single operator stays on one line, however long the argument list is.

```csharp
public async Task<bool> HasOpenOrderAsync(Guid storeId, CancellationToken cancellationToken) =>
    await context.Orders.AnyAsync(order => order.StoreId == storeId && order.Status == OrderStatus.Placed, cancellationToken);
```

Chains nested inside another call's arguments are left alone, because splitting them obscures the outer call's shape.

```csharp
var orders = await AsyncStreams.FlattenAsync(
    Sut([[order]]).ListBatchesAsync(cancellationToken));
```

## Receiver placement

The receiver takes a line of its own, so the chain reads as a source followed by its steps.

```csharp
_gateway
    .QuoteAsync(Arg.Any<ShippingRequest>(), cancellationToken)
    .Returns(new ShippingQuote(order.Id, rate));
```

Three kinds of receiver keep their first operator on the same line, because a line of their own adds no clarity.

Names shorter than three characters.

```csharp
e.Property(order => order.Status)
    .HasConversion<string>()
    .HasMaxLength(50);
```

Predefined type keywords.

```csharp
string.Concat(tokens)
    .Split(' ', StringSplitOptions.RemoveEmptyEntries);
```

Types and static classes, recognizable by their leading capital under normal .NET naming rules.

```csharp
Fakes.Faker<Order>()
    .RuleFor(order => order.StoreId, storeId)
    .RuleFor(order => order.Lines, lines)
    .Generate();
```

## Assertions

Assertion chains containing `.Should()` stay exactly as written. They read as one sentence, and splitting them hurts readability more than it helps.

```csharp
orders.Should().HaveCount(3);
saved.Status.Should().Be(OrderStatus.Placed);
_repository.InsertedBatches.Select(batch => batch.Count).Should().Equal(7, 2);
```

The one case that does split is a single assertion line over the repo's column limit, which wraps one operator per line like any other chain.

## Wrapping arguments

When a call's arguments do not fit on one line, break them one per line and leave the closing paren attached to the last argument, which is what code cleanup produces.

```csharp
private OrderPipeline CreatePipeline(IOrderSource source) => new(
    source,
    orderRepository,
    shipmentRepository,
    publisher);
```

Method declarations and primary constructor parameter lists wrap the same way.

```csharp
internal sealed class OrderPipelineFactory(
    IOrderSource source,
    IOrderRepository orderRepository,
    IOrderEventPublisher publisher,
    ILoggerFactory loggerFactory) : IOrderPipelineFactory
```

## Applying this to an existing codebase

Regex cannot do this safely. Raw string literals, interpolated strings, and comments all contain parens and dots that must not move, and a line-oriented pass will corrupt embedded SQL.

Use a throwaway console app that references `Microsoft.CodeAnalysis.CSharp`, parse with `LanguageVersion.Preview` so C# 14 `extension(T)` blocks parse cleanly, and collect edits as offset splices keyed off token positions.

- Check `GetDiagnostics()` for errors per file and skip anything that fails to parse rather than rewriting a bad tree.
- Find chains by walking `InvocationExpressionSyntax` down through `MemberAccessExpressionSyntax`, and only act on chains whose parent is a statement, a return, an arrow body, or a variable initializer. That parent check is what keeps nested chains out.
- Run it to a fixpoint. A second pass should report zero edits, which shows the rules are consistent rather than undoing each other.
- Finish with `dotnet format --verify-no-changes`. If it reports work to do, the rewriter has introduced something code cleanup disagrees with.
- Verify with a full build and the whole test suite. Every edit is whitespace, so any behavior change means a bug in the rewriter.
