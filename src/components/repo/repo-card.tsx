import { getTranslations } from "next-intl/server";
import { RepoForm } from "@/components/repo/repo-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Repository } from "@/lib/db/schema";

export async function RepoCard({ repo, id }: { repo: Repository | undefined; id?: string }) {
  const t = await getTranslations("Repo");
  return (
    <Card id={id}>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <RepoForm
          repo={repo ? { url: repo.url, owner: repo.owner, name: repo.name, defaultBranch: repo.defaultBranch } : null}
        />
      </CardContent>
    </Card>
  );
}
