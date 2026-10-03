import { auth } from "@clerk/nextjs/server";
import { searchCompanies, searchProblems } from "@/server/queries";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const q = new URL(req.url).searchParams.get("q")?.slice(0, 80) ?? "";
  const [problems, companies] = await Promise.all([searchProblems(q), searchCompanies(q)]);
  return Response.json({ problems, companies });
}
