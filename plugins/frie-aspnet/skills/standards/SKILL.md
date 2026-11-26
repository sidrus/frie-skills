---
name: standards
description: Framework rules for .NET services and Blazor apps, covering hosting, layering, EF Core and Dapper data access, and Blazor, layered on the frie-dotnet and frie-enterprise standards. Use before writing, editing, reviewing, or designing C# or Razor code or tests in an ASP.NET, worker, or Blazor project. Not for a game project.
---

# ASP.NET Standards

**Invoke `frie-dotnet:standards` and `frie-enterprise:standards` first.** That chain also loads `engineering-patterns`. This skill is the framework layer over both. It adds how a .NET host, ASP.NET, EF Core, Dapper, and Blazor express the enterprise rules, and never restates the layers under it.

## Read the reference for what you touch

| Touching | Read |
|---|---|
| `*.cs` | `references/dotnet-hosting.md`, and `references/dotnet-layering.md` for anything crossing a data-access, service, endpoint, or mapping boundary |
| .NET data access: a query, a write, a repository, a `DbContext`, an entity, a migration | `references/data-access-efcore.md` when the repo uses EF Core, `references/data-access-dapper.md` for Dapper or hand-written SQL |
| `*.razor` or a Blazor project's CSS | `references/blazor.md` |
| a test | the references above, `references/aspnet-testing.md`, and the `frie-enterprise` testing reference |

Read the reference **before** the first edit, not as a check afterward. `dotnet-hosting.md`, `dotnet-layering.md`, and both data-access files end with canonical shapes. Copy those rather than re-deriving them from the rules.
