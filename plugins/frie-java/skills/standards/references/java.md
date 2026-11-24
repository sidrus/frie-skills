# Java

Java 21 is the floor, set through the Gradle toolchain. Build through the Gradle wrapper, `./gradlew`. The repo chooses Groovy or Kotlin DSL, and library versions live in the version catalog, `gradle/libs.versions.toml`. The gate command is `./gradlew build`, which compiles under Error Prone, runs `spotlessCheck`, and runs the tests, unless the repo's `CLAUDE.md` specifies another.

## Formatting

Spotless with palantir-java-format owns all layout **(tooling)**. Run `./gradlew spotlessApply` rather than formatting by hand. Imports are explicit, never wildcards. Every override is annotated `@Override`, which Error Prone's `MissingOverride` check flags **(tooling)**.

## Null handling

- Every package has a `package-info.java` annotated `@NullMarked` from JSpecify, so everything is non-null unless marked. NullAway runs under Error Prone at error severity **(tooling)** and proves non-null values at every call site, so they get no guard.
- `@Nullable` from `org.jspecify.annotations` marks each exception, in type-use position: `@Nullable Address`, `String @Nullable []`. First-party code uses no other nullness annotations, such as `javax.annotation` or `org.jetbrains.annotations`.
- The guard that fails loudly is `Objects.requireNonNull`, for a value from unannotated code, such as a library return, that is null only through a bug. Never use NullAway's `castToNonNull` or an `assert`, which is off at runtime.
- `Optional` is a return type only, never a field, a parameter, or a collection element. Consume it with `map`, `orElse`, `ifPresentOrElse`, or `orElseThrow()` after an emptiness guard.

## Types

- A record is the pure data type. A compact constructor copies collection components with `List.copyOf`, so the record is immutable.
- A closed set of cases is a `sealed` interface over records, including a `Result`. Dispatch over it is a pattern-matching `switch` with no `default`, so a new case fails compilation at every switch that misses it.
- Classes are `final` unless they are designed for extension. A class of static pure functions is `final` with a private constructor.
- Fields are `final` unless they change.
- Domain collections are `List<T>`, `Set<T>`, or `Map<K, V>`, and the empty literal is `List.of()`. A collection returned to a caller is unmodifiable.
- A hoisted constant is a `private static final` field, and a hoisted collection is built with `List.of` or `Set.of`.
- Use `var` where the initializer states the type, such as a constructor call or a factory named for its type, and an explicit type everywhere else.
- A `switch` uses arrow labels, so no case falls through.
- A type test binds a pattern variable, `if (shape instanceof Circle circle)`, rather than casting after `instanceof`.

## Time, resources, and exceptions

- Time comes from `java.time` through an injected `Clock`, which a test fixes with `Clock.fixed`. Production code never calls a no-argument `now()`.
- Every `AutoCloseable` is opened in a try-with-resources.
- A thrown exception is unchecked. An unhandled checked exception from a library is rethrown wrapped in an unchecked exception.
- A caught `InterruptedException` restores the flag with `Thread.currentThread().interrupt()` before anything else.

## Visibility and layout

Package-private is the default visibility, so a feature package makes public only what another package consumes.

A subsystem's contract is its `api` package. Package-private cannot reach subpackages, so a subsystem's internals may be `public`, and nothing outside the subsystem imports anything but its `api` package.

One top-level type per file. A record or sealed case that exists only to serve one type nests inside it.

## Naming

- `PascalCase` types, `camelCase` members, and `UPPER_SNAKE_CASE` for `static final` constants.
- A member that only returns a value is a record component or a `getX()` or `isX()` accessor.
- A builder's chained setters are named `withX`.

## Doc comments

Javadoc goes on public types and members in `api` packages. Code outside them gets none, even when it is `public` only so that another package can reach it.

## Logging and observability

Logging goes through SLF4J, with parameterized `{}` messages and the exception as the final argument. Each class has one `private static final Logger`, unless a framework skill specifies a different source. Never `System.out` or `printStackTrace`.

A deployed service uses Logback as the SLF4J backend and runs with the OpenTelemetry Java agent. The agent instruments the HTTP server and client, JDBC, and Logback, and puts `trace_id` and `span_id` on every log event. A manual span for a domain operation is `@WithSpan` from `io.opentelemetry.instrumentation:opentelemetry-instrumentation-annotations`.

## Suppressions

The ruled-out mechanisms are `@SuppressWarnings`, Error Prone `-Xep:<Check>:OFF` flags, Spotless `spotless:off` toggles, and IDE `//noinspection` comments. `@SuppressWarnings` has no justification field, so an approved one states its reason on the annotation's line.

## Canonical shapes

Match these shapes rather than re-deriving them from the rules above.

Every package is null-marked:

```java
@NullMarked
package com.example.orders;

import org.jspecify.annotations.NullMarked;
```

A domain record with its nullable component marked and its collection copied immutable:

```java
record Order(OrderId id, OrderStatus status, List<OrderLine> lines, @Nullable Address shippingAddress) {
    Order {
        lines = List.copyOf(lines);
    }
}
```

A result as a sealed interface, and a guard rather than an assertion:

```java
sealed interface ShipResult {
    record Shipped(Shipment shipment) implements ShipResult {}

    record AlreadyShipped(OrderId orderId) implements ShipResult {}

    record NoAddress(OrderId orderId) implements ShipResult {}
}
```

```java
ShipResult ship(Order order) {
    if (order.status() == OrderStatus.SHIPPED) {
        return new ShipResult.AlreadyShipped(order.id());
    }

    Address address = order.shippingAddress();
    if (address == null) {
        return new ShipResult.NoAddress(order.id());
    }

    return new ShipResult.Shipped(shipments.create(order, address));
}
```

Exhaustive dispatch with no `default`:

```java
String messageKey = switch (result) {
    case ShipResult.Shipped shipped -> "message.orders.shipped";
    case ShipResult.AlreadyShipped alreadyShipped -> "message.orders.already_shipped";
    case ShipResult.NoAddress noAddress -> "message.orders.no_address";
};
```
