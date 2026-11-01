// Sets up local development in one go, after `pnpm install`:
//
//   pnpm bootstrap
//
// Starts Supabase in Docker with the CLI from devDependencies, which applies
// the migrations and supabase/seed.sql (the demo account's place on the
// sign-up list), writes .env.local from its keys unless there is one already,
// and fills the demo account's diary with invented entries. Run it again at
// any time to reset that diary.
//
// Voice notes are transcribed only with an OpenAI key, which it writes into a
// new .env.local when given one: OPENAI_API_KEY=sk-... pnpm bootstrap
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";

const DEMO_EMAIL = "demo@voice-diary.test";

function run(command: string, args: string[]) {
  execFileSync(command, args, { stdio: "inherit" });
}

run("supabase", ["start"]);
run("supabase", ["db", "query", "--local", "--file", "supabase/seed.sql"]);

if (existsSync(".env.local")) {
  console.log("\n.env.local exists; left as it is.");
} else {
  const status = JSON.parse(
    execFileSync("supabase", ["status", "--output", "json"], { encoding: "utf8" }),
  );
  writeFileSync(
    ".env.local",
    `# Written by \`pnpm bootstrap\` for local development; see .env.example.
SUPABASE_URL=${status.API_URL}
SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY}
SUPABASE_SECRET_KEY=${status.SECRET_KEY}
OPENAI_API_KEY=${process.env.OPENAI_API_KEY ?? ""}
ALLOWED_EMAILS=${DEMO_EMAIL}
`,
  );
  console.log("\nWrote .env.local.");
}

run("pnpm", ["seed", "--email", DEMO_EMAIL, "--apply"]);

console.log(`
Ready. Run \`pnpm dev\`, open https://localhost:3443 and sign in as ${DEMO_EMAIL};
the sign-in link arrives in Mailpit, http://127.0.0.1:54324.`);
