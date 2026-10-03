import "server-only";
import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";

/**
 * Returns the signed-in user's row, creating it on first sight (lazy sync instead of a
 * user.created webhook). Redirects to sign-in when signed out. Deduplicated per request.
 */
export const requireUser = cache(async (): Promise<User> => {
  const { userId } = await auth.protect();
  const existing = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (existing[0]) return existing[0];

  const cu = await currentUser();
  const inserted = await db
    .insert(users)
    .values({
      id: userId,
      email: cu?.primaryEmailAddress?.emailAddress ?? null,
      name: cu?.firstName ?? cu?.username ?? null,
      imageUrl: cu?.imageUrl ?? null,
    })
    .onConflictDoNothing()
    .returning();
  if (inserted[0]) return inserted[0];
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return row;
});
