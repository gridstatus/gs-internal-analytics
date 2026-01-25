import { clerkMiddleware } from "@clerk/nextjs/server";

// Public API routes that don't require authentication
const PUBLIC_API_ROUTES = ['/api/health'];

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const pathname = req.nextUrl.pathname;
  
  // Allow public API routes through without auth
  if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
    return;
  }
  
  // Protect API routes - return 401 if not authenticated
  // This ensures no unauthenticated access to data
  if (pathname.startsWith('/api') && !userId) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Page routes are allowed through - AppLayout will show sign-in UI
  // when user is not authenticated via SignedOut component
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

