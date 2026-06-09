import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, resolve, relative, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Knowledge base loader and in-memory keyword index for the
 * cc-dev-llm-context Canton Network docs and skills.
 *
 * The repo's markdown is the single source of truth: this module reads
 * `context/<area>/<topic>.md` and `.cursor/skills/<name>/SKILL.md` at startup
 * and indexes them. No content is duplicated into a separate JSON file.
 */

export type DocKind = "context" | "skill";

export interface KbDoc {
  /** Stable slug, e.g. "development/cip-56-integration" or "skill/canton-daml-development". */
  id: string;
  kind: DocKind;
  /** Top-level area for context docs (reference|business|infrastructure|development), or "skills". */
  area: string;
  title: string;
  relPath: string;
  absPath: string;
  text: string;
  headings: string[];
  links: string[];
}

export interface SearchHit {
  id: string;
  kind: DocKind;
  title: string;
  relPath: string;
  score: number;
  snippet: string;
  headings: string[];
  links: string[];
}

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "is",
  "are", "be", "by", "as", "at", "it", "this", "that", "from", "how", "do",
  "does", "can", "i", "my", "you", "your", "we", "what", "which", "when",
  "where", "why", "use", "using", "used", "about", "into", "via",
]);

const MAX_SNIPPET_CHARS = 320;

/** Resolve the repository root. Allows override via CANTON_CONTEXT_ROOT. */
function resolveRepoRoot(): string {
  const override = process.env.CANTON_CONTEXT_ROOT;
  if (override && override.trim().length > 0) {
    return resolve(override.trim());
  }
  // This module lives at mcp/dist/knowledge.js (built) or mcp/src/knowledge.ts (dev).
  // The repo root is two directories up from the module directory in both cases.
  const moduleDir = dirname(fileURLToPath(import.meta.url));
  return resolve(moduleDir, "..", "..");
}

function walkMarkdown(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") && entry.name !== ".cursor") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkMarkdown(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      out.push(full);
    }
  }
  return out;
}

function extractHeadings(text: string): string[] {
  const headings: string[] = [];
  for (const line of text.split("\n")) {
    const match = /^(#{1,6})\s+(.+?)\s*#*$/.exec(line);
    if (match) headings.push(match[2].trim());
  }
  return headings;
}

function extractLinks(text: string): string[] {
  const links = new Set<string>();
  const re = /\((https?:\/\/[^)\s]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    links.add(m[1]);
  }
  return [...links];
}

function deriveTitle(text: string, fallback: string): string {
  const h1 = /^#\s+(.+?)\s*#*$/m.exec(text);
  if (h1) return h1[1].trim();
  // Skill files keep the title in YAML front matter `name:`.
  const name = /^name:\s*(.+)$/m.exec(text);
  if (name) return name[1].trim();
  return fallback;
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[`*_>#\[\]()|]/g, " ")
    .split(/[^a-z0-9+-]+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

export class KnowledgeBase {
  readonly repoRoot: string;
  readonly docs: KbDoc[] = [];
  readonly loadedAt: string;
  private readonly byId = new Map<string, KbDoc>();

  constructor() {
    this.repoRoot = resolveRepoRoot();
    this.loadedAt = new Date().toISOString();
    this.loadContext();
    this.loadSkills();
    for (const doc of this.docs) this.byId.set(doc.id, doc);
  }

  private loadContext(): void {
    const contextDir = join(this.repoRoot, "context");
    for (const absPath of walkMarkdown(contextDir)) {
      const relPath = relative(this.repoRoot, absPath);
      const parts = relPath.split(sep);
      const area = parts.length >= 2 ? parts[1] : "context";
      const slug = relPath
        .replace(/^context[\\/]/, "")
        .replace(/\.md$/i, "")
        .split(sep)
        .join("/");
      const text = this.readSafe(absPath);
      if (text === null) continue;
      this.docs.push({
        id: slug,
        kind: "context",
        area,
        title: deriveTitle(text, slug),
        relPath,
        absPath,
        text,
        headings: extractHeadings(text),
        links: extractLinks(text),
      });
    }
  }

  private loadSkills(): void {
    // Prefer .cursor skills; fall back to .claude if .cursor is absent.
    const skillRoots = [
      join(this.repoRoot, ".cursor", "skills"),
      join(this.repoRoot, ".claude", "skills"),
    ];
    const seen = new Set<string>();
    for (const root of skillRoots) {
      if (!existsSync(root)) continue;
      for (const absPath of walkMarkdown(root)) {
        const name = relative(root, absPath).split(sep)[0];
        if (seen.has(name)) continue;
        seen.add(name);
        const text = this.readSafe(absPath);
        if (text === null) continue;
        this.docs.push({
          id: `skill/${name}`,
          kind: "skill",
          area: "skills",
          title: deriveTitle(text, name),
          relPath: relative(this.repoRoot, absPath),
          absPath,
          text,
          headings: extractHeadings(text),
          links: extractLinks(text),
        });
      }
    }
  }

  private readSafe(absPath: string): string | null {
    try {
      if (!statSync(absPath).isFile()) return null;
      return readFileSync(absPath, "utf8");
    } catch (err) {
      console.error(`[canton-mcp] failed to read ${absPath}: ${String(err)}`);
      return null;
    }
  }

  getById(id: string): KbDoc | undefined {
    if (this.byId.has(id)) return this.byId.get(id);
    // Tolerate a leading "context/" prefix or a trailing ".md".
    const normalized = id.replace(/^context\//, "").replace(/\.md$/i, "");
    if (this.byId.has(normalized)) return this.byId.get(normalized);
    // Tolerate a bare topic name matching the last path segment.
    const matches = this.docs.filter((d) => d.id.endsWith(`/${normalized}`) || d.id === normalized);
    return matches.length === 1 ? matches[0] : undefined;
  }

  getSkill(name: string): KbDoc | undefined {
    const clean = name.replace(/^skill\//, "");
    return this.byId.get(`skill/${clean}`);
  }

  listContext(): KbDoc[] {
    return this.docs.filter((d) => d.kind === "context");
  }

  listSkills(): KbDoc[] {
    return this.docs.filter((d) => d.kind === "skill");
  }

  search(query: string, limit = 8): SearchHit[] {
    const terms = tokenize(query);
    if (terms.length === 0) return [];
    const termSet = new Set(terms);

    const hits: SearchHit[] = [];
    for (const doc of this.docs) {
      const lowerText = doc.text.toLowerCase();
      const lowerTitle = doc.title.toLowerCase();
      const lowerHeadings = doc.headings.join(" \n ").toLowerCase();

      let score = 0;
      for (const term of termSet) {
        const inBody = countOccurrences(lowerText, term);
        if (inBody === 0 && !lowerTitle.includes(term) && !lowerHeadings.includes(term)) {
          continue;
        }
        score += Math.min(inBody, 5);
        if (lowerTitle.includes(term)) score += 6;
        if (lowerHeadings.includes(term)) score += 3;
      }
      // Phrase boost: full query string present in the document.
      const phrase = query.trim().toLowerCase();
      if (phrase.length > 3 && lowerText.includes(phrase)) score += 8;

      if (score > 0) {
        hits.push({
          id: doc.id,
          kind: doc.kind,
          title: doc.title,
          relPath: doc.relPath,
          score,
          snippet: bestSnippet(doc.text, termSet),
          headings: doc.headings,
          links: doc.links,
        });
      }
    }

    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, limit);
  }
}

function countOccurrences(haystack: string, needle: string): number {
  if (needle.length === 0) return 0;
  let count = 0;
  let idx = haystack.indexOf(needle);
  while (idx !== -1) {
    count++;
    idx = haystack.indexOf(needle, idx + needle.length);
  }
  return count;
}

function bestSnippet(text: string, terms: Set<string>): string {
  const lines = text.split("\n");
  let bestLine = -1;
  let bestHits = 0;
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    let hits = 0;
    for (const term of terms) {
      if (lower.includes(term)) hits++;
    }
    if (hits > bestHits) {
      bestHits = hits;
      bestLine = i;
    }
  }
  if (bestLine === -1) {
    return truncate(text.replace(/\s+/g, " ").trim(), MAX_SNIPPET_CHARS);
  }
  const start = Math.max(0, bestLine - 1);
  const end = Math.min(lines.length, bestLine + 3);
  return truncate(lines.slice(start, end).join("\n").trim(), MAX_SNIPPET_CHARS);
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}
