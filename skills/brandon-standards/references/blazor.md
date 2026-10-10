# Blazor

## The component library

A Blazor project has a component library, and which one it is varies. Identify it before writing markup, from `_Imports.razor` and the project's package references.

## Styling

Reach for styling in this order: the component library's own utility classes, then custom CSS, then inline `style=`. Inline is for a value that is genuinely one-off.

Custom CSS goes in scoped `.razor.css` files where the component library supports it, unless the repo's own instructions choose a global stylesheet. Scoped CSS that has to reach into a child component's markup needs `::deep`.

## Components

Prefer a component from the library over raw HTML in every case where one fits. Use the library's grid, button, and dialog rather than hand-rolling the markup for them. Drop to raw HTML only where the library has nothing for what you need.

Extract repeated markup into a component. If the same structure appears in two or more places, it belongs in its own `.razor` file.

## Project layout

The code layout outcomes in the `engineering-patterns` architecture reference apply. A type that only a shared component uses goes beside that component. Feature-first, mirroring the server's `Features/<Feature>/` convention, is one layout that meets those outcomes:

```
Features/<Feature>/     page + feature-only components + view records + feature projections and parsers
Components/             app root and the component toolkit: the cancellable base, operation state, dialog options
Components/Shared/      components two or more features render, each with its own projections and options beside it
Components/Layout/      shell: layout, sidebar, user menu, reconnect modal
Authorization/          current user and policy handlers
<Backend>Api/           API clients, their options, and their request and result types
Browser/                IJSRuntime services
_Imports.razor          at the project root, so it covers Features/ as well as Components/
```

## Render mode

The app sets its render mode once, on `<Routes>` in `App.razor`, so the whole app is interactive and pages inherit it. Don't repeat `@rendermode` on a page or component. It is a silent no-op that implies a per-page choice which doesn't exist.

## Cancellation

A component that calls a backend inherits the project's cancellable component base and passes its token. Override `Dispose(bool)`, calling `base.Dispose(disposing)`, for subscriptions. Don't hand-roll a `CancellationTokenSource` field plus `IDisposable`.
