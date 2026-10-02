# Blazor

## The component library

A Blazor project has a component library, and which one it is varies. Identify it before writing markup, from `_Imports.razor` and the project's package references.

## Styling

Reach for styling in this order: the component library's own utility classes, then custom CSS in `app.css`, then inline `style=`. Inline is for a value that is genuinely one-off.

Scoped CSS that has to reach into a child component's markup needs `::deep`.

## Components

Prefer a component from the library over raw HTML in every case where one fits. Use the library's grid, button, and dialog rather than hand-rolling the markup for them. Drop to raw HTML only where the library has nothing for what you need.

Extract repeated markup into a component. If the same structure appears in two or more places, it belongs in its own `.razor` file.

## Project layout

Feature-first, mirroring the server's `Features/<Feature>/` convention. A feature owns its page, the components only it renders, and its view records, all in one folder.

```
Features/<Feature>/     page + feature-only components + view records + feature projections
Components/Shared/      components two or more features render
Components/Layout/      shell: layout, sidebar, user menu, reconnect modal
Infrastructure/         API client, current user, event subscriber, options, auth,
                        logging, and cross-feature extensions over Core types only
_Imports.razor          at the project root, so it covers Features/ as well as Components/
```

Placement follows the dependency direction. If something in `Infrastructure/` would have to reference a `Features.*` type, it belongs in the feature instead. A projection used by two features moves to `Infrastructure/` only once it depends on nothing but Core.

## Render mode

The app sets its render mode once, on `<Routes>` in `App.razor`, so the whole app is interactive and pages inherit it. Don't repeat `@rendermode` on a page or component. It is a silent no-op that implies a per-page choice which doesn't exist.

## Cancellation

A component that calls a backend inherits the project's cancellable component base and passes its token. Override `Dispose(bool)`, calling `base.Dispose(disposing)`, for subscriptions. Don't hand-roll a `CancellationTokenSource` field plus `IDisposable`.
