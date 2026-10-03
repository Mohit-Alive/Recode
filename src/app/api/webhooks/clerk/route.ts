import type { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

/**
 * Users are created lazily on first request; this webhook keeps profile fields fresh and removes
 * all data when an account is deleted in Clerk (every user table cascades from users.id).
 */
export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }
  if (evt.type === "user.deleted" && evt.data.id) {
    await db.delete(users).where(eq(users.id, evt.data.id));
  } else if (evt.type === "user.updated") {
    const d = evt.data;
    const email = d.email_addresses.find((e) => e.id === d.primary_email_address_id)?.email_address ?? null;
    await db.update(users).set({ email, name: d.first_name ?? d.username ?? null, imageUrl: d.image_url }).where(eq(users.id, d.id));
  }
  return new Response("ok");
}
