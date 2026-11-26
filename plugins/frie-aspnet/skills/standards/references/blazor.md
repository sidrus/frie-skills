# Blazor

## The component library

A Blazor project has a component library, and which one it is varies. Identify it before writing markup, from `_Imports.razor` and the project's package references.

## Styling

Apply styling in this order: the component library's own utility classes, then custom CSS, then inline `style=`. Inline is for a value that is genuinely one-off.

Custom CSS goes in scoped `.razor.css` files where the component library supports it, unless the repo's own instructions choose a global stylesheet. Scoped CSS that has to reach into a child component's markup needs `::deep`.

## Components

Prefer a component from the library over raw HTML in every case where one fits. Use the library's grid, button, and dialog rather than writing the markup for them by hand. Use raw HTML only where the library has nothing for what you need.

Extract repeated markup into a component. If the same structure appears in two or more places, it belongs in its own `.razor` file.

## Project layout

The project as a whole is one subsystem under the `engineering-patterns` architecture reference. Inside it, folders follow the app's navigation:

```
Features/
  Components/           components and records that two or more features use; a group that shares one domain concept gets a subfolder for it
  <Feature>/
    <Page>.razor        one or more pages, each named for what it shows
    Components/         components only this feature uses
    Models/             view records only this feature uses
    Services/           the feature's other C# code: projections, parsers, options, logging
    <SubFeature>/       the same structure, for a page whose components no page above it uses
Layout/                 app root and shell: App, Routes, layout, sidebar, user menu, reconnect modal
Services/               code that no component lifecycle or browser call reaches
  Authorization/        current user and policy handlers
  <Backend>Api/         API clients and their options
_Imports.razor          at the project root, so it covers every folder
```

A feature creates `Components/`, `Models/`, or `Services/` only when it has something to put in it.

A feature uses code from its own folder and from folders above it, never from a sibling feature or a feature below it. When a second feature needs a type, the type moves up to the nearest folder both features share, which for two top-level features is `Features/Components/`. Code that depends on a component's lifecycle or the browser, such as the cancellable component base, operation state, and `IJSRuntime` services, lives under `Features/` and moves up the same way.

A backend in the same solution supplies its request and response types through its contract. `<Backend>Api/` defines its own only for a backend outside the solution.

A shared control in `Features/Components/` wraps a library component with the app's defaults and behavior. A page customizes a control's behavior or layout by composition, through its parameters and `RenderFragment` slots, and never by inheriting from it.

## Render mode

The app sets its render mode once, on `<Routes>` in `App.razor`, so the whole app is interactive and pages inherit it. Don't repeat `@rendermode` on a page or component. It is a silent no-op that implies a per-page choice which doesn't exist.

## Cancellation

A component that calls a backend inherits the project's cancellable component base and passes its token. Override `Dispose(bool)`, calling `base.Dispose(disposing)`, for subscriptions. Don't write your own `CancellationTokenSource` field plus `IDisposable`.
