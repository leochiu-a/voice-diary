import { requireUser } from "@/lib/auth";
import { containsPattern, searchExcerpt } from "@/lib/search";

// The entries whose body contains ?q=, as ids with the excerpt to show. The
// list already holds each entry's date, tags and voice notes; only the full
// bodies stay on the server, so the search runs here.
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim();
  if (!q) return Response.json([]);
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("entries")
    .select("id, body")
    .ilike("body", containsPattern(q));
  if (error) throw error;
  return Response.json(data.map(({ id, body }) => ({ id, excerpt: searchExcerpt(body, q) })));
}
