// Makes an existing user an admin: the first admin has to come from somewhere.
//
//   npm run admin:grant -- person@example.com        (locally)
//   node scripts/admin-grant.mjs person@example.com  (in the container terminal)
//
// Plain JavaScript so it also runs in the container, which has no build tools.
import postgres from "postgres";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local (e.g. in the container): use variables from the environment.
}

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !process.env.DATABASE_URL) {
  console.error("Usage: DATABASE_URL must be set; node scripts/admin-grant.mjs <email>");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
try {
  const updated = await sql`update "user" set role = 'admin' where lower(email) = ${email} returning email`;
  if (updated.length === 0) {
    console.error(`No user with the address ${email}. Register first, then run this again.`);
    process.exitCode = 1;
  } else {
    console.log(`${updated[0].email} is now an admin`);
  }
} finally {
  await sql.end();
}
