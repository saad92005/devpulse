// Sample diffs for the playground and the benchmark. Each carries the bugs we
// deliberately seeded so the benchmark can measure the catch rate.

export type Sample = {
  id: string;
  name: string;
  diff: string;
  /** Seeded issues: file + line + a keyword the finding title/body should mention. */
  expected: { path: string; line: number; keywords: string[] }[];
};

export const SAMPLES: Sample[] = [
  {
    id: "sql-injection",
    name: "Search endpoint (Node)",
    diff: `diff --git a/src/routes/users.ts b/src/routes/users.ts
--- a/src/routes/users.ts
+++ b/src/routes/users.ts
@@ -12,8 +12,14 @@ import { db } from "../db";

 export async function searchUsers(req: Request, res: Response) {
-  const users = await db.user.findMany({ where: { name: req.query.q } });
-  res.json(users);
+  const q = req.query.q as string;
+  const users = await db.$queryRawUnsafe(
+    \`SELECT id, name, email, password_hash FROM users WHERE name LIKE '%\${q}%'\`
+  );
+  res.json(users);
+}
+
+export async function deleteUser(req: Request, res: Response) {
+  await db.user.delete({ where: { id: req.params.id } });
+  res.status(204).end();
 }
`,
    expected: [
      { path: "src/routes/users.ts", line: 16, keywords: ["sql", "inject"] },
      { path: "src/routes/users.ts", line: 16, keywords: ["password", "hash", "sensitive", "expos"] },
      { path: "src/routes/users.ts", line: 22, keywords: ["auth", "permission", "authoriz"] },
    ],
  },
  {
    id: "async-bugs",
    name: "Order processing (TypeScript)",
    diff: `diff --git a/src/orders.ts b/src/orders.ts
--- a/src/orders.ts
+++ b/src/orders.ts
@@ -1,6 +1,22 @@
 import { charge } from "./payments";
 import { Order } from "./types";

+export async function processOrders(orders: Order[]) {
+  let total = 0;
+  orders.forEach(async (order) => {
+    await charge(order.customerId, order.amount);
+    total += order.amount;
+  });
+  return total;
+}
+
+export function lastItems<T>(items: T[], n: number): T[] {
+  const out: T[] = [];
+  for (let i = items.length - n; i <= items.length; i++) {
+    out.push(items[i]);
+  }
+  return out;
+}
+
 export function orderLabel(order: Order) {
   return \`#\${order.id} — \${order.customer.name.toUpperCase()}\`;
 }
`,
    expected: [
      { path: "src/orders.ts", line: 6, keywords: ["foreach", "await", "async", "promise"] },
      { path: "src/orders.ts", line: 15, keywords: ["off-by-one", "bound", "undefined", "<="] },
    ],
  },
  {
    id: "python-secrets",
    name: "Upload handler (Python)",
    diff: `diff --git a/app/upload.py b/app/upload.py
--- a/app/upload.py
+++ b/app/upload.py
@@ -1,5 +1,21 @@
 import os
+import subprocess
+import requests
 from flask import request

+AWS_SECRET_KEY = "AKIA9F3K2LQ7XZ0EXAMPLE/wJalrXUtnFEMI"
+
+def convert(filename):
+    subprocess.run(f"convert uploads/{filename} out.png", shell=True)
+
+def fetch_avatar():
+    url = request.args.get("url")
+    return requests.get(url, timeout=5).content
+
+def save(data):
+    path = os.path.join("uploads", request.args.get("name"))
+    with open(path, "wb") as f:
+        f.write(data)
+
 def health():
     return "ok"
`,
    expected: [
      { path: "app/upload.py", line: 6, keywords: ["secret", "credential", "hardcod", "key"] },
      { path: "app/upload.py", line: 9, keywords: ["command", "inject", "shell"] },
      { path: "app/upload.py", line: 13, keywords: ["ssrf", "request forgery", "arbitrary url", "url"] },
      { path: "app/upload.py", line: 16, keywords: ["traversal", "path"] },
    ],
  },
  {
    id: "clean",
    name: "Clean refactor (no bugs)",
    diff: `diff --git a/src/format.ts b/src/format.ts
--- a/src/format.ts
+++ b/src/format.ts
@@ -1,7 +1,9 @@
-export function formatPrice(cents) {
-  return "$" + (cents / 100).toFixed(2);
+const formatter = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
+
+export function formatPrice(cents: number): string {
+  return formatter.format(cents / 100);
 }

-export function initials(name) {
-  return name.split(" ").map((p) => p[0]).join("");
+export function initials(name: string): string {
+  return name.split(" ").filter(Boolean).map((p) => p[0].toUpperCase()).join("");
 }
`,
    expected: [],
  },
];
