import { clerkMiddleware } from "@clerk/nextjs/server";

// Auth is enforced per page, action and route handler with auth.protect() (resource-based checks).
// The proxy only attaches Clerk's request state.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
