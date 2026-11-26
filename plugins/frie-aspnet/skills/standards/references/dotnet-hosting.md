# .NET Hosting

These rules apply to code that runs under a `Microsoft.Extensions` host: an ASP.NET app, a worker, or a Blazor app.

## Options

Types that bind to `IOptions` are records.

## Logging

Every log call goes through `[LoggerMessage]` source generation, as `public static partial void X(this ILogger logger, ...)` extension methods in one `*Log.cs` static partial class per feature.

This is CA1848 **(tooling)** where the repo sets `dotnet_diagnostic.CA1848.severity = warning`. CA rules run during build with no extra property or package, so a direct `logger.LogInformation(...)` call fails the build rather than waiting for review.

A catch that expects its exception logs through the feature's `*Log.cs` extensions.

## Observability

Serilog is the logging framework. It is registered as the `ILogger` provider, so the `[LoggerMessage]` calls flow through it, and it exports to OpenTelemetry through `Serilog.Sinks.OpenTelemetry`. The `frie-enterprise` observability reference decides what must be instrumented and what gets a metric.

## HTTP

- Never `new HttpClient(...)`. Use `IHttpClientFactory` or a typed `AddHttpClient<T>` registration.
- POST endpoints take a JSON body, not query-string flags.

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

A catch that expects the exception still logs:

```csharp
catch (OperationCanceledException)
{
    logger.LoopCanceled();
}
```
