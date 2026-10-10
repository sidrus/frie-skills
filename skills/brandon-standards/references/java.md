# Java

Java 21 is the floor, set through the Gradle toolchain. Always build through the Gradle wrapper, `./gradlew`. Whether the build script uses Groovy or Kotlin DSL is the repo's choice. The gate is `./gradlew build`, which compiles under Error Prone, runs `spotlessCheck`, and runs the tests, unless the repo's `CLAUDE.md` names another.

## Formatting

Spotless with palantir-java-format owns all layout **(tooling)**. Run `./gradlew spotlessApply` rather than hand-formatting, and never arrange code against what the formatter produces. Imports are explicit, never wildcards.

## Null handling

- Every package carries a `package-info.java` annotated `@NullMarked` from JSpecify, so everything is non-null unless marked.
- `@Nullable` from `org.jspecify.annotations` marks each exception, in type-use position: `@Nullable Address`, `String @Nullable []`. First-party code uses no other nullness annotation family, such as `javax.annotation` or `org.jetbrains.annotations`.
- NullAway runs under Error Prone at error severity **(tooling)**.
- `Objects.requireNonNull` is a guard that fails loudly, so it belongs where a null means a bug. The non-null assertion that only silences the checker is NullAway's `castToNonNull` or an `assert`, which is off at runtime.
- Java has only `== null`, so that is the comparison.
- `Optional` is a return type only, never a field, a parameter, or a collection element. Consume it with `map`, `orElse`, `ifPresentOrElse`, or `orElseThrow()` after an emptiness guard.

## Types

- A record is the pure data type. A compact constructor copies collection components with `List.copyOf`, so the record is immutable.
- A closed set of cases is a `sealed` interface over records, including a `Result`. Dispatch over it is a pattern-matching `switch` with no `default`, so a new case fails compilation at every switch that misses it.
- Classes are `final` unless they are designed for extension. A class of static pure functions is `final` with a private constructor.
- Fields are `final` unless they change.
- Domain collections are `List<T>`, `Set<T>`, or `Map<K, V>`, and the empty literal is `List.of()`. Collections returned to a caller are unmodifiable.
- `var` where the initializer names the type, such as a constructor call or a factory named for its type. An explicit type everywhere else.

## Visibility and layout

Package-private is the default visibility. It does the work `internal` does in C#, so a feature package keeps its types package-private and makes public only what another package consumes. Packages are named per the code layout outcomes in `engineering-patterns`.

One top-level type per file. A record or sealed case that exists only to serve one type nests inside it.

## Naming

- Standard Java conventions: `PascalCase` types, `camelCase` members, `UPPER_SNAKE_CASE` for `static final` constants.
- A member that only returns a value is a record component or a `getX()` or `isX()` accessor.
- A builder's chained setters follow the builder idiom, `withX`.

## Doc comments

Javadoc goes on public types and members in the module's `api` packages, which are its contract with other mods or modules. Code outside `api` packages gets none, even when it is `public` only so that another package can reach it.

## Logging

SLF4J, with parameterized `{}` messages and the exception as the final argument. One `private static final Logger` per class, unless a framework skill names a different source. Never `System.out` or `printStackTrace`.

## Resources

Every `AutoCloseable` is opened in a try-with-resources.

## Suppressions

The ruled-out mechanisms are `@SuppressWarnings`, Error Prone `-Xep:<Check>:OFF` flags, Spotless `spotless:off` toggles, and IDE `//noinspection` comments. `@SuppressWarnings` has no justification field, so an approved one carries its reason on the annotation's line.

## Tests

- JUnit 5 with AssertJ. Assert with `assertThat(actual).isEqualTo(expected)` and its relatives, never JUnit's `assertTrue` or `assertEquals`.
- Run the red with `./gradlew test --tests '<Class>.<method>'`.
- Names are `method_expectedBehavior_condition`, such as `ship_rejectsOrder_whenAlreadyShipped`.
- Endpoint authorization is one `@ParameterizedTest`.
- Test data comes from Datafaker (`net.datafaker:datafaker`). Each domain type gets one faker class in the test-support module that builds it from generated values, with a `withX` override for each property a test may pin.
- Mockito only at the true external boundaries the `engineering-patterns` testing reference allows.
- The shared test-support module is the `java-test-fixtures` Gradle plugin's `src/testFixtures/java` source set. Other projects consume it with `testImplementation(testFixtures(project(":<name>")))`.
- Integration tests live in their own source set, declared through Gradle's JVM Test Suite plugin.

## Canonical shapes

Match these shapes rather than re-deriving them from the rules above.

Every package is null-marked:

```java
@NullMarked
package com.example.orders;

import org.jspecify.annotations.NullMarked;
```

A domain record: a nullable component marked, the collection copied immutable:

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

One faker per domain type, in `src/testFixtures/java`:

```java
public final class OrderFaker {
    private static final Faker FAKER = new Faker();

    private OrderId id = new OrderId(FAKER.number().randomNumber());
    private OrderStatus status = FAKER.options().option(OrderStatus.class);
    private @Nullable Address shippingAddress = new Address(FAKER.address().streetAddress(), FAKER.address().city());

    public OrderFaker withStatus(OrderStatus status) {
        this.status = status;
        return this;
    }

    public OrderFaker withShippingAddress(@Nullable Address shippingAddress) {
        this.shippingAddress = shippingAddress;
        return this;
    }

    public Order generate() {
        return new Order(id, status, List.of(), shippingAddress);
    }
}
```

A state-based test asserting on the value:

```java
class OrderServiceTest {
    private final FakeShipmentGateway shipments = new FakeShipmentGateway();
    private final OrderService service = new OrderService(shipments);

    @Test
    void ship_rejectsOrder_whenAlreadyShipped() {
        Order order = new OrderFaker().withStatus(OrderStatus.SHIPPED).generate();

        ShipResult result = service.ship(order);

        assertThat(result).isEqualTo(new ShipResult.AlreadyShipped(order.id()));
    }
}
```
