import { appUrl } from "@/lib/env";
import { destroySession } from "@/lib/session";

export async function POST() {
  await destroySession();
  return Response.redirect(`${appUrl()}/`, 303);
}
