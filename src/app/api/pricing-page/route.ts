import { NextResponse } from 'next/server';
import { getPricingPageVisitCounts, getPricingPageMostVisits } from '@/lib/queries';
import { withRequestContext, getFilterGridstatus } from '@/lib/api-helpers';
import { getErrorMessage, query } from '@/lib/db';

// Look up user IDs from emails
async function getUserIdsFromEmails(emails: string[]): Promise<Map<string, number>> {
  if (emails.length === 0) return new Map();
  
  const users = await query<{ username: string; id: number }>(
    `SELECT username, id FROM api_server.users WHERE username = ANY($1)`,
    [emails]
  );
  
  const emailToId = new Map<string, number>();
  for (const user of users) {
    emailToId.set(user.username, user.id);
  }
  return emailToId;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  return withRequestContext(searchParams, async () => {
    try {
      const filterGridstatus = getFilterGridstatus(searchParams);
      const [visitCounts1d, visitCounts7d, visitCounts30d, mostVisits1d, mostVisits7d, mostVisits30d] = await Promise.all([
        getPricingPageVisitCounts('1d', filterGridstatus),
        getPricingPageVisitCounts('7d', filterGridstatus),
        getPricingPageVisitCounts('30d', filterGridstatus),
        getPricingPageMostVisits('1d', 50, filterGridstatus),
        getPricingPageMostVisits('7d', 50, filterGridstatus),
        getPricingPageMostVisits('30d', 50, filterGridstatus),
      ]);

      // Get all unique emails
      const allEmails = new Set<string>();
      mostVisits1d.forEach(v => allEmails.add(v.email));
      mostVisits7d.forEach(v => allEmails.add(v.email));
      mostVisits30d.forEach(v => allEmails.add(v.email));

      // Look up user IDs
      const emailToUserId = await getUserIdsFromEmails(Array.from(allEmails));

      // Add user IDs to most visits
      const mostVisits1dWithIds = mostVisits1d.map(v => ({
        ...v,
        userId: emailToUserId.get(v.email) || null,
      }));
      const mostVisits7dWithIds = mostVisits7d.map(v => ({
        ...v,
        userId: emailToUserId.get(v.email) || null,
      }));
      const mostVisits30dWithIds = mostVisits30d.map(v => ({
        ...v,
        userId: emailToUserId.get(v.email) || null,
      }));

      return NextResponse.json({
        visitCounts: {
          '1d': visitCounts1d,
          '7d': visitCounts7d,
          '30d': visitCounts30d,
        },
        mostVisits: {
          '1d': mostVisits1dWithIds,
          '7d': mostVisits7dWithIds,
          '30d': mostVisits30dWithIds,
        },
      });
    } catch (error) {
      console.error('Error fetching pricing page data:', error);
      return NextResponse.json(
        { error: getErrorMessage(error) },
        { status: 500 }
      );
    }
  });
}

