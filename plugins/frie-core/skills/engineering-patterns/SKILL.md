---
name: engineering-patterns
description: Language-neutral engineering rules for design, architecture, naming, error handling, testing, comments, and suppressions. Use before planning, implementing, fixing, refactoring, or reviewing code or tests in any language. Language, domain, and framework skills build on it.
---

# Engineering Patterns

These rules hold in every language and every kind of software. A language skill, such as `frie-dotnet:standards`, adds that language's idioms. A domain skill, such as `frie-enterprise:standards`, adds the practices of one kind of software. A framework skill, such as `frie-neoforge:standards`, adds one framework's conventions. None repeats what is here, and none negates it.

## Read the reference for what you touch

| Touching | Read |
|---|---|
| any code edit that adds or changes a type, a folder, a dependency between two pieces of code, or state | `references/architecture.md` |
| any test file, and any change in behavior | `references/testing.md` |
| a deployed service, an API, or an application over a database | invoke `frie-enterprise:standards`, the domain skill for that work |
| a game, a game mod, or a simulation an engine ticks | invoke `frie-gamedev:standards`, the domain skill for that work |

Read each matching reference in full **before** the first edit, not as a check afterward. A reference stays in force for the whole task. If the conversation has been compacted since you read it, read it again before the next edit it covers.

If a skill a rule points to is not installed, or none exists for the language, do not stop. Say so once in the report, apply the rule's intent with the ecosystem's standard tool and the simplest mechanism, and say what you chose.

## Always

These five are the rules broken most often. Each has its section below.

- Never add a comment unless asked.
- Write the test first, and show its failing run before the implementation.
- Never weaken a check to make it pass. That means never deleting, skipping, or loosening a test or an assertion, never changing an expected value to what the code returned, never special-casing a test's input in production code, and never lowering a threshold. Make the code pass, or report the failure.
- Never suppress a warning.
- Never write logic that already exists somewhere else.

## Before claiming done

1. Run the repo's gate command from its `CLAUDE.md` or `AGENTS.md`. If it gives none, run the build, the full test suite, and the linters the repo configures, and say which commands ran.
2. If the gate fails, fix what the change caused. Report a failure that existed before the change with its output, and do not fix it or work around it.
3. Read every line the change added, and fix each of these before reporting:
   - a comment that was not asked for and is not one of the three required kinds
   - a new suppression, or an analyzer, compiler, or test setting made looser
   - a callable whose name is not a verb phrase, or a signature you designed with more than three parameters or an unused one
   - a silenced null check, an empty catch, a catch that logs and rethrows, or a catch-all outside the two allowed places
   - a `bool` or bare null returned where a failure has a reason
   - logic that now exists twice
   - in tests: an assertion on a computed boolean, on text for a human reader, on a log, or on an interaction; a name without all three parts; an expected value the test computed; a hand-typed value the behavior does not depend on
4. Confirm that each behavior you added had a failing run you showed before its implementation. If one did not, say so.
5. List the drift you saw and did not fix, and each rule that yielded to a dictated shape.
6. Report failures with their output. Never describe unverified work as passing.

## Precedence

When two sources disagree, the earlier one in this list wins.

1. What the user says in the conversation.
2. The repo's `CLAUDE.md` or `AGENTS.md`, for anything it states explicitly, whether a fact or a policy.
3. The `frie-` skills. Two of them disagreeing is a defect, so report it and follow the lower layer.
4. Other installed skills.
5. Existing code. Code that disagrees with the first three is drift, never precedent.

These rules bind what a change writes or rewrites. Drift the change does not write, including elsewhere in a file it touches, is listed in the report and not fixed unless asked. That covers existing duplication between two sites the change does not write, existing suppressions, and existing comments that are still true.

## Domain markers

A rule that ends with a marker such as **(domain: state-change)** leaves its mechanism to the domain skill. Find the row with that key in the domain skill's `Domain decisions` table and follow it. Code with no domain, such as a script or a command-line tool, uses the simplest mechanism that meets the rule.

## Intent over form

Each rule states an intent, and each language expresses it in its own idiom. A rule yields only where the language or a framework dictates the shape, meaning the code would not compile, the framework would not call it, or a `frie-` skill says the idiom is how the rule is met. A habit of the ecosystem is not a dictate. Each time a rule yields, the report says which rule and what dictated it.

## Naming

- Anything callable is named with a verb phrase: methods, functions, private helpers, test helpers, test fixtures, and any named lambda. A predicate starts with `is`, `has`, or `can`. A noun names a value, meaning a property, a field, a variable, or a parameter, including one that holds a function. `Code(string code)`, `RedisDatabase()`, and a fixture called `candidates` are all wrong.
- Three shapes the language dictates keep their form: a constructor, an accessor such as a Java record component, and a conversion in the language's `to`, `as`, `from`, or `of` form.
- Name an operation with the word the domain's users use for it, such as `BlockHost` and `UnblockHost`. A storage verb such as save, update, or set a flag is allowed only when it is that word. This holds at every layer, down to the operation that writes the storage.
- Names use whole words, with no abbreviations. A boolean is named affirmatively, so `CanSeek` and never `CannotSeek` or `IsNotReady`.

## Signatures

- Three parameters at most on a function or method, not counting the receiver or the language's trailing cancellation parameter. Fewer is better when the extra parameter would only pass through. The limit does not apply to a record's components or to a constructor that only receives dependencies.
- When a signature needs more, fold the extras into a type that already exists, or into a new record when the grouped values form a concept the domain already uses, such as a date range or an address. A record that exists only to bundle unrelated arguments is not a fix. When the extras form no concept, the operation does more than one thing, so split it. If it cannot be split, ask.
- An argument that is a literal at every call site is not data. Give each combination of such literals one named constant and pass the constant, or split the operation so the argument disappears. A boolean or a required `null` at a call site means the operation is doing two things.
- No unused parameters in a signature you design. An implementation of a contract, including a fake, keeps the contract's signature. A cancellation parameter counts as used when the body forwards it or checks it before a call that cannot be canceled.
- An operation either changes state or returns information about state, never both. The exceptions are a `Result` from a state change and a language idiom that combines them, such as a pop or a try-get.
- These limits govern signatures you design. Where a framework dictates the shape, such as a route handler, an overridden framework method, an event handler, a generated partial, or a delegate matching a library's signature, they do not apply.

## Values and absence

- Where a value may be absent and the code needs it, guard and fail loudly or supply a fallback. Never use an operator that silences the null checker without a runtime check, such as `!` in C# and TypeScript or a cast that drops nullability. A call that throws on null at run time is a guard.
- Where the checker cannot see a fact that is true, teach it with a guard that throws or the language's flow annotation. If neither is possible, ask, as for a suppression.
- No redundant null guards. A guard is redundant when the compiler or a null checker already proves the value non-null, or when the receiving member accepts null. Guard only where a value enters from outside that proof: deserialized input, reflection, an unannotated library, or an API that code outside the repo calls.
- A collection is never null. Empty is the absent case, initialized to the language's empty literal. Where "not provided" must differ from "empty", model it with an explicit type, never with null. The exemptions are a persistence type and a wire type whose external schema defines null.
- A literal whose meaning the surrounding code does not state, such as a threshold, a timeout, a status code, or a format string, is a named constant. So is a constant array used at more than one call site.

## Control flow

- In languages with braces, every control-flow body gets them, including single-line bodies.
- Handle each precondition and special case with an early return or throw at the top of the function. Never nest the main path inside a conditional.
- A dispatch over a closed set of cases handles every case by name. Where the language can fail compilation on a missed case, write no default arm. Elsewhere the default arm throws. A default arm never returns a value for a case it does not name.
- Keep a dispatch as one readable switch while every arm is trivial, as Constructs below defines it. Handle a narrow edge case with an early guard rather than restructuring the switch around it.

## Errors

- An expected failure is a return value, never an exception, per Results below. An exception means a bug or an infrastructure failure.
- Catch only where the code can act on the failure, and catch the narrowest exception type that it acts on. A catch ends in exactly one of three ways. It handles the failure completely. It cleans up or compensates and then rethrows the same exception with the language's bare rethrow. Or it throws a new exception with the original as its cause, to translate the failure across a subsystem's contract.
- Logging is not handling. A failure is either handled or propagated, never both, so a catch that rethrows does not log.
- No empty catch blocks. Where the right handling is to continue, such as cancellation on a shutdown path, the block logs at trace level or above so the swallow is visible.
- Never wrap a cancellation exception, because that turns a cancellation into a fault.
- A catch-all appears in two places only: an entry point's last-resort handler, and a block whose last statement is a bare rethrow.
- Decide what a failure means in the first caller that knows which operation failed, from the exception's type or structured fields, never from message text.

## Comments and documentation

**Never add a comment unless explicitly asked.** This is absolute and covers why-comments, test narration, config and YAML notes, cross-file coordination notes, and code blocks inside plans and specs.

Text in comment syntax that a tool interprets, such as a shebang, a build or compiler directive, a schema modeline, or a generated-code marker, is code and not a comment. So is a license header the repo requires.

Three kinds of comment are required, and they are the only comments written without being asked:

- A doc comment on every member of a subsystem's contract that the change adds or changes, as `references/architecture.md` defines a contract. The language skill says how a contract is marked. Where both an interface and an implementing class exist, document the interface. Parameter, return, and exception tags appear only when they add something the signature doesn't already say.
- A one-sentence doc comment on a test double or support type whose purpose cannot be read from its name and members, saying why it exists.
- The reason on an approved suppression, per Suppressions below.

When code would look wrong or removable without its reason, the reason goes into something that outlives the session: a name that states it, a test that fails when the code is removed, and the report, for the commit message. It never goes in a comment.

Existing comments are not yours. Leave one that is still true, including in code the change rewrites. Delete one that is wrong or that the change made false, and never correct it, because the code already says what is true. A required comment gets corrected instead, since deleting it breaks the rule that requires it. Never downgrade a doc comment to a plain comment. If the user deleted a comment or a block of code, it stays deleted.

The wording of comments, docs, and messages follows the `writing-style-guide` skill.

## Design

- The simplest solution that solves the problem wins. This governs the size of what you build, never whether the code you do build is properly structured.
- No code without a current requirement (YAGNI), because until the requirement exists you do not know what to build. Speculative abstractions, fan-out over one implementation, extension points for changes nobody asked for, and configuration for values that do not vary all get cut.
- Surface simplifications unprompted during design work.
- When a decision changes, re-derive everything downstream of it. Treat every remaining element as unjustified until the new decision justifies it again, rather than patching around a superseded decision.
- Production code never reads the system time directly. Wall-clock time comes from an injected clock, so a test can fix it.
- The code that acquires a resource releases it, with the language's scoped construct when the resource is finished in one scope. A type that holds a resource in a field implements the language's disposal protocol. A function that returns a resource hands ownership to its caller. Never release a resource you were handed.

## DRY

DRY is unconditional. Two sites that implement the same rule become one the moment the second appears, in the change that would create the second. There is no rule of three, and no exemption because the two sites are expected to change at different times.

- Two sites implement the same rule when one name from the domain describes both truthfully. `IsWithinOrderLineLimit` cannot describe a shelf-slot check, so those two sites are two rules whose text matches today, and they stay separate. If the only name that fits both describes the mechanics, such as `IsBetween1And100`, the sites are not duplicates. Apply this test to the names, never to a prediction about future change.
- The types these skills require to be separate are never duplicates of each other: a contract record, the internal record behind it, and its persistence type. Two subsystems that model different concepts with records of similar members are not duplicates either.
- A rule that two subsystems both need has one owner. It moves into the subsystem whose responsibility it is, and the other calls that contract. When it belongs to neither, it becomes a subsystem of its own, named for the rule.
- When a new case almost fits an existing extraction, never add a parameter that selects behavior. Inline the extraction back into its callers, then extract again what is the same rule under the test above.
- Tests follow the same rule through the shared test-support module in `references/testing.md`.

A published contract keeps its shape, so duplication is removed behind it. That means a public API, a package, a format that code outside the repo reads, and any stored or queued format that a later version of our own code must still read, such as a save file, a persisted message, or a cache entry. Every other internal shape changes freely to remove duplication.

## Layers

Inside a subsystem, two layers each have one job. A domain skill may add layers beside them, and a framework skill lists its entry points.

| Layer | Responsibility | Forbidden |
|---|---|---|
| Entry point | Turn framework input into the service's parameter types, and turn what the service returns into the framework's output. Choosing an operation from the kind of input, such as its route, message type, or bound action, is part of that. | Any choice that depends on a value's meaning or on state, including range and business-rule checks, and deciding what a failure means. |
| Service | All business logic. | Anything that belongs to another layer. |

The entry point is whatever the framework calls into: an HTTP endpoint, a UI event handler, a message consumer, a game engine callback. It converts input once into types that cannot hold an invalid value, and code past that point never rechecks it.

## Results

A service operation that has an expected failure returns a `Result`, even when it has only one. The entry point translates the `Result` into its response. The error type and the arity are the repo's choice.

- An operation with no expected failure returns its value directly.
- A lookup whose only failure is absence returns the language's nullable type, because absence is the one reason it can express.
- A predicate that answers a question about its input, such as whether an order can ship, returns a `bool`, because no is an answer and not a failure.
- When a library reports an expected failure by throwing, such as a unique-constraint violation that means a name is taken, the code that calls the library catches that exception type and returns the `Result` case.

A `bool` or a bare `null` cannot say why something failed, which forces the entry point to know that false means "already shipped" here and "out of stock" there. That is domain knowledge in the marshaling layer. This rule holds in every language, including those whose libraries report failure by exception.

## Constructs

| Construct | Justified by |
|---|---|
| Interface | Substitution. The practical test is "will I write a fake for this?" An external dependency and a contract operation always qualify. No other class gets an interface until a fake for it exists. |
| Record | Pure data. A record rejects construction with values that are invalid for every instance, and may expose values computed from its own fields alone. |
| Enum | Two or more members. A single member conveys no information. |
| Static pure function | Pure logic. Purity beats injection, because a pure function never needs a seam. |
| Its own class | The arms of a dispatch, meaning a switch or an if-else chain that tests one value against its kinds. An arm is trivial when it is one expression or one call that uses no dependency. When any arm is not trivial, every arm becomes its own type and the switch only selects the type. A guard or a single `if` is not a dispatch. |
| Nothing at all | Pass-through and forwarding types. If the body only forwards, the type should not exist. |

- One seam per external dependency. When a library supplies an interface and our code uses its operations as they are, that interface is the seam. Our own interface replaces it only when the implementing class translates between our records and the library's types, and then no other code references the library's interface.
- When variation arrives, abstract the part that varies rather than the stable logic wrapped around it. A price calculator reading rates from several sources keeps its pure calculation static and takes an injected loader for the rates.

## Testing

Every behavior a unit test can reach is written test first, and a bug fix starts with a test that fails because of the bug. `references/testing.md` holds the rules.

## Suppressions

Never suppress a warning, including style rules, by any route: an inline directive or attribute, a rule severity, an exclusion or baseline entry, a compiler flag, or removing the analyzer. Redesign so the warning does not fire, at every call site. The language skill lists the mechanisms it forbids. If a warning is a genuine false positive, ask. An approved suppression states its reason in a justification field where the mechanism has one, and on the suppression line where it does not.

Static analysis findings are authoritative. Only a suppression that already exists, or one the user approved, opts out of a finding. Where a finding contradicts a convention in these skills, the finding wins at the line it flags and the convention holds everywhere else.

Rules marked **(tooling)** are enforceable by an analyzer, formatter, or type checker, but whether they are enforced is per repo. Check what the repo actually configures. Where a rule is enforced, write it correctly the first time. Where it isn't, the rule still holds and you apply it by hand.

## Config files

Never add a section with no entries to a config file. Leave an existing empty section alone, because in many formats an empty section has a meaning.
