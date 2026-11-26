# C# Tests

- Names are `Method_ExpectedBehavior_Condition`, such as `Ship_RejectsOrder_WhenAlreadyShipped`.
- Tests run on xUnit.net, through the latest `xunit.v3` package, on Microsoft.Testing.Platform. The test project sets `<UseMicrosoftTestingPlatformRunner>true</UseMicrosoftTestingPlatformRunner>`, and the repo's `global.json` sets `"test": { "runner": "Microsoft.Testing.Platform" }`.
- Assertions use AwesomeAssertions, never FluentAssertions.
- Run the red with `dotnet test --filter-method` and the test's fully qualified name.
- Test data comes from Bogus, with `Soenneker.Utils.AutoBogus` where auto-generation is needed and never the abandoned `AutoBogus`. Each domain type gets one `Faker<T>`.
- The shared test-support module is one TestSupport project referenced by every test project.
- Integration tests live in a separate `*.IntegrationTests` project.
- A Windows-1252 fixture is read with `Encoding.GetEncoding(1252)`, because `Encoding.Latin1` is not CP1252.
