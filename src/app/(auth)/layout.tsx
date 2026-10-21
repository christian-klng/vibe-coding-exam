import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getSession()) {
    redirect("/tasks");
  }
  return <main className="flex flex-1 items-start justify-center px-4 py-16">{children}</main>;
}
