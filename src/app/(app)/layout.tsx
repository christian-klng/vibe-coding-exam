import { requireSession } from "@/lib/session";

// Everything in this route group requires a signed-in user with a verified e-mail
// (Better Auth only creates sessions after verification).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireSession();
  return <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">{children}</main>;
}
