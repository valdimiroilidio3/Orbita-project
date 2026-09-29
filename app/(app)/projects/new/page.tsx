import type { Metadata } from "next";
import { requireOrg } from "@/lib/server/authz";
import ProjectWizard from "../../components/project-wizard";

export const metadata: Metadata = { title: "Novo projeto" };

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ industry?: string }>;
}) {
  await requireOrg();
  const { industry } = await searchParams;
  return <ProjectWizard prefillIndustry={industry} />;
}
