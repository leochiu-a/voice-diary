import { requireUser } from "@/lib/auth";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// A page of cards asks for its bodies at once; more than a few pages is a mistake.
const MAX_IDS = 100;

// The bodies of the entries in ?ids= (comma-separated). The list holds every
// entry's date, tags and voice notes, and asks for bodies only for the cards
// it is about to show.
export async function GET(request: Request) {
  const ids = (new URL(request.url).searchParams.get("ids") ?? "")
    .split(",")
    .filter((id) => UUID.test(id));
  if (ids.length === 0) return Response.json([]);
  if (ids.length > MAX_IDS) return new Response("Too many ids", { status: 400 });
  const { supabase } = await requireUser();
  const { data, error } = await supabase.from("entries").select("id, body").in("id", ids);
  if (error) throw error;
  return Response.json(data);
}
