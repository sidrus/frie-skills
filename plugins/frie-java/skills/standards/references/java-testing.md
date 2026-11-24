# Java Tests

## Runner and assertions

- Tests run on JUnit Jupiter with AssertJ. Assert with `assertThat(actual).isEqualTo(expected)` and its relatives, never JUnit's `assertTrue` or `assertEquals`.
- Run the red with `./gradlew test --tests '<Class>.<method>'`.
- An expected exception is asserted with `assertThatExceptionOfType(X.class).isThrownBy(...)` and then on its typed fields, never with `withMessage` or `hasMessage`.
- A class without value equality is compared with `usingRecursiveComparison()` rather than field by field.
- Endpoint authorization is one `@ParameterizedTest`.
- The mocking library is Mockito.

## Names and structure

- Names are `method_expectedBehavior_condition`, such as `ship_rejectsOrder_whenAlreadyShipped` or `ship_createsShipment_byDefault`. Each part is lowerCamelCase, underscores separate the parts, and the condition starts with `when` or is `byDefault`.
- The method name is the test's whole name, so a test has no `@DisplayName` and tests are not grouped with `@Nested`.
- A test class is named for its unit with a `Test` suffix, such as `OrderServiceTest`. Test classes, test methods, and lifecycle methods are package-private.
- Per-test state lives in field initializers, because JUnit creates a new instance for each test method. `@BeforeEach` holds only setup that an initializer can't express.

## Data and support

- Test data comes from Datafaker (`net.datafaker:datafaker`). Each domain type gets one faker class with a `withX` override for each property a test may pin.
- The shared test-support module is the `java-test-fixtures` Gradle plugin's `src/testFixtures/java` source set. Other projects consume it with `testImplementation(testFixtures(project(":<name>")))`.
- Integration tests live in their own source set, declared through Gradle's JVM Test Suite plugin.

## Canonical shapes

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
