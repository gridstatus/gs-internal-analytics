import { currentUser } from '@clerk/nextjs/server';

/** Emails allowed to edit subscriptions. Do not expose this list to the client. */
const AUTHORIZED_EDITOR_EMAILS = ['max@gridstatus.io'] as const;

export function isAuthorizedEditor(email: string): boolean {
  return (AUTHORIZED_EDITOR_EMAILS as readonly string[]).includes(email);
}

/**
 * Returns the current Clerk user's primary email, or null if not signed in or no email.
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  const user = await currentUser();
  if (!user) return null;
  const primary = user.primaryEmailAddressId
    ? user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)
    : user.emailAddresses[0];
  return primary?.emailAddress ?? null;
}

/**
 * Asserts the current user is an authorized editor. Returns their email.
 * Throws a Response with status 403 if not authorized or not signed in.
 */
export async function assertCanEdit(): Promise<string> {
  const email = await getCurrentUserEmail();
  if (!email) {
    throw new Response('Unauthorized', { status: 401 });
  }
  if (!isAuthorizedEditor(email)) {
    throw new Response('Forbidden', { status: 403 });
  }
  return email;
}
