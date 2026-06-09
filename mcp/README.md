# Canton dev context MCP server

An [MCP](https://modelcontextprotocol.io) server that exposes this repository's
Canton Network knowledge base — the markdown under [`../context/`](../context/)
and the skills under [`../.cursor/skills/`](../.cursor/skills/) — to AI clients
(Cursor, Claude Desktop, and any other MCP-capable host).

The repo's markdown is the single source of truth. The server indexes those
files at startup; there is no separate copy of the content to keep in sync.

## Tools

| Tool | Purpose |
|------|---------|
| `canton_search` | Keyword search across context docs + skills; returns ranked snippets with file paths and doc links. |
| `canton_doc` | Return the full markdown of a document by id (e.g. `development/cip-56-integration`). |
| `canton_list_topics` | List every document and skill with its id. |
| `canton_skill` | Return a named skill body (e.g. `canton-daml-development`). |
| `canton_api_ref` | Quick reference for a Canton API (JSON Ledger API v2, gRPC, interactive submission, PQS, Scan, token standard). |
| `canton_check_deprecation` | Check whether a term/command is deprecated or renamed in Canton 3.x. |

## Resources

| URI | Content |
|-----|---------|
| `canton://topics` | JSON index of all documents and skills. |
| `canton://skills` | JSON index of skills. |
| `canton://deprecations` | JSON list of known renames/deprecations. |
| `canton://doc/{id}` | Raw markdown for a single document. |
| `canton://status` | Server status (repo root, doc counts, load time). |

## Build and run

Requires Node.js 18+.

```bash
cd mcp
npm install
npm run build      # compiles to dist/
npm start          # runs dist/index.js over stdio
```

For local iteration without a build step:

```bash
npm run dev        # tsx watch on src/index.ts
```

The server communicates over stdio. All logs go to stderr, so they never
corrupt the JSON-RPC stream on stdout.

By default the server locates the knowledge base two directories up from the
compiled file (the repository root). Override with `CANTON_CONTEXT_ROOT` if you
run the binary from elsewhere.

## Client configuration

### Cursor

Add to `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global):

```json
{
  "mcpServers": {
    "canton-dev-context": {
      "command": "node",
      "args": ["/absolute/path/to/cc-dev-llm-context/mcp/dist/index.js"]
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "canton-dev-context": {
      "command": "node",
      "args": ["/absolute/path/to/cc-dev-llm-context/mcp/dist/index.js"]
    }
  }
}
```

## Inspect / debug

```bash
npm run inspect    # builds, then launches @modelcontextprotocol/inspector
```

This opens the MCP Inspector against the local server so you can list tools and
resources and call them interactively.
