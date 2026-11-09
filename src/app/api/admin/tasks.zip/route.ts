import { strToU8, zipSync } from "fflate";
import { requireAdmin } from "@/lib/session";
import { getCatalog } from "@/lib/tasks/catalog";
import { catalogToFiles } from "@/lib/tasks/export";

/** All published tasks as the files from tasks/ (modules.yaml, <id>/task.yaml, de.md, en.md). */
export async function GET() {
  await requireAdmin();
  const files = catalogToFiles(await getCatalog());
  const zip = zipSync(Object.fromEntries(Object.entries(files).map(([path, content]) => [`tasks/${path}`, strToU8(content)])));
  const date = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="tasks-${date}.zip"`,
    },
  });
}
