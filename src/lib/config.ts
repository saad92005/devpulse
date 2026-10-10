import { parse } from "yaml";
import { z } from "zod";

// Per-repo settings, read from `.devpulse.yml` on the PR's base branch.
export const CATEGORIES = ["bug", "security", "performance", "maintainability", "style"] as const;
export type Category = (typeof CATEGORIES)[number];

export const ConfigSchema = z.object({
  enabled: z.boolean().default(true),
  strictness: z.enum(["relaxed", "balanced", "strict"]).default("balanced"),
  review_drafts: z.boolean().default(false),
  max_comments: z.number().int().min(1).max(50).default(15),
  ignore: z.array(z.string()).default([]),
  focus: z.array(z.enum(CATEGORIES)).default(["bug", "security", "performance", "maintainability"]),
  instructions: z.string().max(2000).default(""),
  language: z.string().max(40).default("English"),
});

export type RepoConfig = z.infer<typeof ConfigSchema>;

export const DEFAULT_CONFIG: RepoConfig = ConfigSchema.parse({});

/** Files that are almost never worth an AI review. */
const BUILTIN_IGNORES = [
  "**/package-lock.json", "**/yarn.lock", "**/pnpm-lock.yaml", "**/bun.lock*", "**/Cargo.lock",
  "**/*.min.js", "**/*.min.css", "**/*.map", "**/dist/**", "**/build/**", "**/.next/**",
  "**/vendor/**", "**/node_modules/**", "**/*.snap", "**/*.svg", "**/*.png", "**/*.jpg",
  "**/*.jpeg", "**/*.gif", "**/*.webp", "**/*.ico", "**/*.woff*", "**/*.ttf", "**/*.pdf",
];

export function parseConfig(text: string | null): { config: RepoConfig; error?: string } {
  if (!text) return { config: DEFAULT_CONFIG };
  try {
    const parsed = ConfigSchema.safeParse(parse(text) ?? {});
    if (!parsed.success) {
      const error = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return { config: DEFAULT_CONFIG, error };
    }
    return { config: parsed.data };
  } catch (e) {
    return { config: DEFAULT_CONFIG, error: `Invalid YAML: ${(e as Error).message}` };
  }
}

export function globToRegExp(glob: string): RegExp {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        i++;
        if (glob[i + 1] === "/") {
          i++;
          re += "(?:.*/)?";
        } else re += ".*";
      } else re += "[^/]*";
    } else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

export function isIgnored(path: string, config: RepoConfig): boolean {
  return [...BUILTIN_IGNORES, ...config.ignore].some((g) => globToRegExp(g).test(path));
}

/** Minimum model confidence a finding needs to survive, per strictness. */
export const CONFIDENCE_FLOOR: Record<RepoConfig["strictness"], number> = {
  relaxed: 0.8,
  balanced: 0.65,
  strict: 0.5,
};

export const EXAMPLE_CONFIG = `# .devpulse.yml — commit this to your default branch
enabled: true
strictness: balanced        # relaxed | balanced | strict
review_drafts: false
max_comments: 15
language: English
focus: [bug, security, performance, maintainability]
ignore:
  - "**/*.generated.ts"
  - "docs/**"
instructions: |
  We use Zod for all input validation.
  Flag any SQL built with string concatenation.
`;
