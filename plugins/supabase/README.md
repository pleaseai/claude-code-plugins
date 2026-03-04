# Supabase Plugin for Claude Code

Agent Skills to help developers using AI agents with Supabase, including Postgres performance best practices and a read-only MCP server for database introspection.

## Features

### Supabase MCP Server (Read-Only)

This plugin connects to Supabase's hosted MCP server at `https://mcp.supabase.com/mcp` in read-only mode. No authentication is required for read-only access.

The server provides tools for database introspection, schema exploration, and query assistance for your Supabase projects.

### Postgres Best Practices Skill

The bundled `supabase-postgres-best-practices` skill provides comprehensive Postgres performance optimization guidance across 8 categories:

| Priority | Category | Impact |
|----------|----------|--------|
| 1 | Query Performance | CRITICAL |
| 2 | Connection Management | CRITICAL |
| 3 | Security & RLS | CRITICAL |
| 4 | Schema Design | HIGH |
| 5 | Concurrency & Locking | MEDIUM-HIGH |
| 6 | Data Access Patterns | MEDIUM |
| 7 | Monitoring & Diagnostics | LOW-MEDIUM |
| 8 | Advanced Features | LOW |

The skill activates automatically when writing SQL queries, designing schemas, implementing indexes, configuring connection pooling, or working with Row-Level Security (RLS).

## Installation

```sh
claude
/plugin marketplace add pleaseai/claude-code-plugins
/plugin install supabase@pleaseai
```

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Postgres Performance Optimization](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Row-Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Upstream skill source](https://github.com/supabase/agent-skills)
