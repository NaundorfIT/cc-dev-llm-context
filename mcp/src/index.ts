#!/usr/bin/env node
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { KnowledgeBase, type KbDoc, type SearchHit } from "./knowledge.js";

/**
 * Canton dev context MCP server.
 *
 * Serves the cc-dev-llm-context knowledge base (context docs + skills) over
 * stdio. All diagnostics go to stderr so they never corrupt the stdio
 * JSON-RPC stream.
 */

interface Deprecation {
  deprecated: string;
  replacement: string;
  since: string;
  note: string;
}

// Public, well-documented version drift. Verify live details against the docs.
const DEPRECATIONS: Deprecation[] = [
  {
    deprecated: "domain",
    replacement: "synchronizer",
    since: "Canton 3.x",
    note: "Terminology change across the protocol and APIs. Do not mix 2.x and 3.x names.",
  },
  {
    deprecated: "application_id",
    replacement: "user_id",
    since: "Canton 3.x",
    note: "Ledger API field/identifier rename. The user_id must match the JWT subject for external/authn'd submissions.",
  },
  {
    deprecated: "Daml Assistant (daml CLI)",
    replacement: "dpm (Digital Asset Package Manager)",
    since: "preferred from 3.4; Daml Assistant removed at 3.5",
    note: "dpm manages SDK install, scaffolding, compilation, codegen, sandbox, PQS, and Daml Shell. Requires JDK 17+.",
  },
  {
    deprecated: "JSON Ledger API v1 (query-by-attribute)",
    replacement: "JSON Ledger API v2 + PQS (Participant Query Store)",
    since: "v1 removed at Canton 3.4",
    note: "Target the JSON Ledger API v2 for new work; use PQS (SQL over Postgres) for query-by-attribute.",
  },
  {
    deprecated: "Featured app activity markers",
    replacement: "Traffic-based app-reward attribution (CIP-0104)",
    since: "~end of July 2026",
    note: "Keep FeaturedAppRight active and optimise views/traffic; stop creating markers after CIP-0104 rollout.",
  },
];

interface ApiRefEntry {
  summary: string;
  whenToUse: string;
  docs: string[];
}

// Curated entry points; the linked official docs are the source of truth.
const API_REF: Record<string, ApiRefEntry> = {
  json_ledger_api: {
    summary:
      "JSON Ledger API v2 (HTTP/REST + WebSocket). The default integration surface for new application work.",
    whenToUse:
      "Web/BFF apps, browser wallets, anything JS/TS-friendly. v1 is removed as of Canton 3.4.",
    docs: [
      "https://docs.digitalasset.com/build/3.4/reference/json-api/openapi.html",
    ],
  },
  grpc_ledger_api: {
    summary:
      "gRPC Ledger API: command submission, update/state services, party/user/package management, pruning, and interactive submission (external signing).",
    whenToUse:
      "High throughput, non-JVM/non-JS languages, or interactive submission for external parties.",
    docs: [
      "https://docs.digitalasset.com/build/3.4/reference/lapi-reference.html",
    ],
  },
  interactive_submission: {
    summary:
      "Interactive submission: prepare a transaction (returns a hash), sign the hash off the participant, then execute with the signature. Underpins non-custodial/external-party writes.",
    whenToUse:
      "External parties whose signing keys live outside the validator; non-custodial wallets.",
    docs: [
      "https://docs.digitalasset.com/build/3.4/tutorials/app-dev/external_signing_onboarding.html",
    ],
  },
  pqs: {
    summary:
      "Participant Query Store (PQS): SQL querying over Postgres. Replaces the removed JSON API v1 query-by-attribute.",
    whenToUse: "Read-heavy querying, reporting, and reconciliation over contract state.",
    docs: ["https://docs.digitalasset.com/build/3.4/"],
  },
  scan_api: {
    summary:
      "Scan API: the public read API/store exposing network activity and live parameters (AmuletRules, rounds, traffic config).",
    whenToUse: "Monitoring, reconciliation, and reading live network/tokenomics parameters.",
    docs: ["https://docs.sync.global/"],
  },
  token_standard: {
    summary:
      "Token Standard (CIP-56) HTTP APIs and Daml models: holdings, transfers, allocations/DvP, pre-approvals.",
    whenToUse: "Building wallets or integrating assets that follow the Canton token standard.",
    docs: ["https://docs.sync.global/app_dev/token_standard/index.html"],
  },
};

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function jsonResourceContents(uri: URL, value: unknown) {
  return {
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

function formatHit(hit: SearchHit, repoRoot: string): string {
  const links = hit.links.slice(0, 4);
  const linkLine = links.length > 0 ? `\nLinks: ${links.join(", ")}` : "";
  return [
    `### ${hit.title}  (score ${hit.score})`,
    `id: ${hit.id} | kind: ${hit.kind} | file: ${hit.relPath}`,
    "",
    hit.snippet,
    linkLine,
  ].join("\n");
}

function describeDoc(doc: KbDoc): string {
  return `- ${doc.id}  —  ${doc.title}  (${doc.relPath})`;
}

async function main(): Promise<void> {
  const kb = new KnowledgeBase();
  console.error(
    `[canton-mcp] indexed ${kb.docs.length} docs from ${kb.repoRoot} ` +
      `(${kb.listContext().length} context, ${kb.listSkills().length} skills)`,
  );

  const server = new McpServer({
    name: "canton-dev-context",
    version: "0.1.0",
  });

  server.tool(
    "canton_search",
    "Search the Canton Network knowledge base (context docs + skills) by keyword. " +
      "Returns ranked snippets with the source file and outbound documentation links. " +
      "Use this first for 'how/where/what' questions about building or operating on Canton.",
    {
      query: z.string().describe("Keywords or a natural-language question about Canton/DAML."),
      limit: z
        .number()
        .int()
        .min(1)
        .max(15)
        .optional()
        .describe("Maximum number of results (default 8)."),
    },
    async ({ query, limit }) => {
      const hits = kb.search(query, limit ?? 8);
      if (hits.length === 0) {
        return textResult(
          `No matches for "${query}". Try canton_list_topics to see available docs, ` +
            `or broaden your keywords.`,
        );
      }
      const body = hits.map((h) => formatHit(h, kb.repoRoot)).join("\n\n");
      return textResult(`Canton knowledge base — results for "${query}"\n\n${body}`);
    },
  );

  server.tool(
    "canton_doc",
    "Return the full markdown of a context document by its topic id (for example " +
      "'development/cip-56-integration' or just 'cip-56-integration'). Use canton_list_topics to discover ids.",
    {
      topic: z.string().describe("Document id/slug, e.g. 'development/ledger-api-patterns'."),
    },
    async ({ topic }) => {
      const doc = kb.getById(topic);
      if (!doc) {
        return textResult(
          `No document with id "${topic}". Use canton_list_topics to see valid ids.`,
        );
      }
      return textResult(`# ${doc.title}\n(source: ${doc.relPath})\n\n${doc.text}`);
    },
  );

  server.tool(
    "canton_list_topics",
    "List every available knowledge-base document (context docs grouped by area) and skill, with ids.",
    {},
    async () => {
      const context = kb.listContext();
      const byArea = new Map<string, KbDoc[]>();
      for (const doc of context) {
        const list = byArea.get(doc.area) ?? [];
        list.push(doc);
        byArea.set(doc.area, list);
      }
      const sections: string[] = [];
      for (const [area, docs] of [...byArea.entries()].sort()) {
        sections.push(`## ${area}\n${docs.map(describeDoc).join("\n")}`);
      }
      const skills = kb.listSkills();
      if (skills.length > 0) {
        sections.push(`## skills\n${skills.map(describeDoc).join("\n")}`);
      }
      return textResult(`Canton knowledge base topics\n\n${sections.join("\n\n")}`);
    },
  );

  server.tool(
    "canton_skill",
    "Return the full body of a named skill (for example 'canton-daml-development', " +
      "'canton-cip56-integrations', 'canton-validator-infrastructure').",
    {
      name: z.string().describe("Skill name, with or without the 'skill/' prefix."),
    },
    async ({ name }) => {
      const skill = kb.getSkill(name);
      if (!skill) {
        const available = kb.listSkills().map((s) => s.id.replace(/^skill\//, "")).join(", ");
        return textResult(`No skill named "${name}". Available skills: ${available}`);
      }
      return textResult(skill.text);
    },
  );

  server.tool(
    "canton_api_ref",
    "Quick reference for a Canton integration API. Returns a summary, when-to-use guidance, " +
      "and official documentation links.",
    {
      api: z
        .enum([
          "json_ledger_api",
          "grpc_ledger_api",
          "interactive_submission",
          "pqs",
          "scan_api",
          "token_standard",
        ])
        .describe("Which API to describe."),
    },
    async ({ api }) => {
      const entry = API_REF[api];
      const text = [
        `# ${api}`,
        "",
        entry.summary,
        "",
        `When to use: ${entry.whenToUse}`,
        "",
        `Docs: ${entry.docs.join(", ")}`,
      ].join("\n");
      return textResult(text);
    },
  );

  server.tool(
    "canton_check_deprecation",
    "Check whether a term, API name, command, or tool is deprecated/renamed in current Canton (3.x). " +
      "Call this before recommending an identifier you are unsure about (for example 'domain', " +
      "'application_id', 'daml assistant', 'json api v1', 'markers').",
    {
      term: z.string().describe("The term/name/command to check."),
    },
    async ({ term }) => {
      const lower = term.toLowerCase();
      const matches = DEPRECATIONS.filter(
        (d) =>
          lower.includes(d.deprecated.toLowerCase().split(" ")[0]) ||
          d.deprecated.toLowerCase().includes(lower) ||
          d.replacement.toLowerCase().includes(lower),
      );
      if (matches.length === 0) {
        return textResult(
          `No known deprecation recorded for "${term}". This is not a guarantee it is current — ` +
            `confirm against version-pinned official docs.`,
        );
      }
      const body = matches
        .map(
          (m) =>
            `- "${m.deprecated}" → use "${m.replacement}" (${m.since}). ${m.note}`,
        )
        .join("\n");
      return textResult(`Deprecation / rename check for "${term}":\n\n${body}`);
    },
  );

  // Resources -------------------------------------------------------------

  server.resource("topics", "canton://topics", async (uri) =>
    jsonResourceContents(
      uri,
      kb.docs.map((d) => ({ id: d.id, kind: d.kind, area: d.area, title: d.title, file: d.relPath })),
    ),
  );

  server.resource("skills", "canton://skills", async (uri) =>
    jsonResourceContents(
      uri,
      kb.listSkills().map((d) => ({ id: d.id, title: d.title, file: d.relPath })),
    ),
  );

  server.resource("deprecations", "canton://deprecations", async (uri) =>
    jsonResourceContents(uri, DEPRECATIONS),
  );

  server.resource("status", "canton://status", async (uri) =>
    jsonResourceContents(uri, {
      server: "canton-dev-context",
      repoRoot: kb.repoRoot,
      loadedAt: kb.loadedAt,
      contextDocs: kb.listContext().length,
      skills: kb.listSkills().length,
    }),
  );

  server.resource(
    "doc",
    new ResourceTemplate("canton://doc/{id}", { list: undefined }),
    async (uri, variables) => {
      const rawId = Array.isArray(variables.id) ? variables.id[0] : variables.id;
      const doc = rawId ? kb.getById(decodeURIComponent(rawId)) : undefined;
      if (!doc) {
        return {
          contents: [
            { uri: uri.href, mimeType: "text/plain", text: `No document with id "${rawId}".` },
          ],
        };
      }
      return {
        contents: [{ uri: uri.href, mimeType: "text/markdown", text: doc.text }],
      };
    },
  );

  await server.connect(new StdioServerTransport());
  console.error("[canton-mcp] server running on stdio");
}

main().catch((err) => {
  console.error(`[canton-mcp] fatal: ${String(err)}`);
  process.exit(1);
});
