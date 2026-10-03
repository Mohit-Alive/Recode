import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { CompanyDirectory } from "@/components/companies/company-directory";
import { requireUser } from "@/server/auth";
import { getCompanyIndex } from "@/server/queries";

export const metadata = { title: "Companies" };

export default async function CompaniesPage() {
  const user = await requireUser();
  const companies = await getCompanyIndex(user.id);
  return (
    <PageContainer>
      <PageHeader
        title="Companies"
        description="Problems reported in interviews at each company, ordered by how often they come up. Solving one counts everywhere it appears."
      />
      <div className="mt-8">
        <CompanyDirectory companies={companies} />
      </div>
    </PageContainer>
  );
}
