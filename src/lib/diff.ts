// Unified-diff parsing. GitHub's PR "files" API returns one patch per file;
// we annotate every line with its new-file line number so the model can cite
// exact lines, and so we can reject findings that point outside the diff.

export type DiffLine = {
  kind: "add" | "del" | "ctx";
  text: string;
  /** Line number in the new file (undefined for deleted lines). */
  newLine?: number;
};

export type FilePatch = {
  path: string;
  status: string;
  additions: number;
  deletions: number;
  lines: DiffLine[];
  /** New-file line numbers that were added in this PR (commentable). */
  addedLines: Set<number>;
};

const HUNK_RE = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

export function parsePatch(path: string, patch: string, status = "modified"): FilePatch {
  const lines: DiffLine[] = [];
  const addedLines = new Set<number>();
  let newLine = 0;
  let additions = 0;
  let deletions = 0;

  for (const raw of patch.replace(/\r\n/g, "\n").split("\n")) {
    const hunk = HUNK_RE.exec(raw);
    if (hunk) {
      newLine = Number(hunk[1]);
      continue;
    }
    if (newLine === 0) continue; // headers before the first hunk
    if (raw.startsWith("\\")) continue; // "\ No newline at end of file"
    if (raw.startsWith("+")) {
      lines.push({ kind: "add", text: raw.slice(1), newLine });
      addedLines.add(newLine);
      newLine++;
      additions++;
    } else if (raw.startsWith("-")) {
      lines.push({ kind: "del", text: raw.slice(1) });
      deletions++;
    } else if (raw.startsWith(" ") || raw === "") {
      lines.push({ kind: "ctx", text: raw.slice(1), newLine });
      newLine++;
    }
  }
  // A trailing newline in the patch produces a phantom empty context line.
  const last = lines[lines.length - 1];
  if (last && last.kind === "ctx" && last.text === "") lines.pop();
  return { path, status, additions, deletions, lines, addedLines };
}

/** Render a patch with explicit line numbers for the model. */
export function renderForModel(file: FilePatch): string {
  const body = file.lines
    .map((l) => {
      if (l.kind === "del") return `     - ${l.text}`;
      const n = String(l.newLine).padStart(4, " ");
      return `${n} ${l.kind === "add" ? "+" : " "} ${l.text}`;
    })
    .join("\n");
  return `### FILE: ${file.path} (${file.status})\n${body}`;
}

/** A few lines around `line`, used by the checker pass. */
export function excerpt(file: FilePatch, line: number, radius = 8): string {
  const idx = file.lines.findIndex((l) => l.newLine === line);
  if (idx === -1) return "";
  return renderForModel({
    ...file,
    lines: file.lines.slice(Math.max(0, idx - radius), idx + radius + 1),
  })
    .split("\n")
    .slice(1)
    .join("\n");
}

/** Parse a full multi-file `git diff` (used by the playground and benchmark). */
export function parseUnifiedDiff(diff: string): FilePatch[] {
  const text = diff.replace(/\r\n/g, "\n");
  const files: FilePatch[] = [];
  const chunks = text.split(/^diff --git /m).filter((c) => c.trim());
  for (const chunk of chunks) {
    const pathMatch = /^\+\+\+ (?:b\/)?(.+)$/m.exec(chunk) ?? /^a\/\S+ b\/(\S+)/.exec(chunk);
    const firstHunk = chunk.search(/^@@/m);
    if (!pathMatch || firstHunk === -1) continue;
    const path = pathMatch[1].trim();
    if (path === "/dev/null") continue;
    const status = /^new file/m.test(chunk) ? "added" : "modified";
    files.push(parsePatch(path, chunk.slice(firstHunk), status));
  }
  return files;
}
