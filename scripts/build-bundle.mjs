#!/usr/bin/env node
// Concatenates supabase/migrations/*.sql (in order) into supabase/apply_all.sql,
// a single script you can paste into the Supabase SQL editor to set up (or bring
// up to date) the whole database in one run. Every migration is written to be
// re-runnable, so applying the bundle repeatedly is safe.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migDir = join(root, "supabase", "migrations");
const files = readdirSync(migDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

let out = `-- ============================================================================
-- apply_all.sql — Fay & Partenaires : schéma complet de la base de données.
--
-- GÉNÉRÉ automatiquement par scripts/build-bundle.mjs — NE PAS ÉDITER À LA MAIN.
-- Collez ce fichier dans l'éditeur SQL de Supabase et exécutez-le une fois.
-- Toutes les migrations sont ré-exécutables (create ... if not exists / or replace,
-- drop policy if exists, on conflict do nothing).
--
-- Migrations incluses : ${files.join(", ")}
-- ============================================================================

`;

for (const f of files) {
  out += `\n-- ===== ${f} ${"=".repeat(Math.max(0, 66 - f.length))}\n\n`;
  out += readFileSync(join(migDir, f), "utf8").trimEnd() + "\n";
}

out += `\n-- Recharge le cache de schéma de PostgREST pour exposer les nouvelles fonctions.\nnotify pgrst, 'reload schema';\n`;

writeFileSync(join(root, "supabase", "apply_all.sql"), out);
console.log(`Wrote supabase/apply_all.sql from ${files.length} migrations.`);
