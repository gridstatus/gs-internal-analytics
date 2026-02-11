import { getCurrentUserEmail, isAuthorizedEditor } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const email = await getCurrentUserEmail();
  const canEdit = email !== null && isAuthorizedEditor(email);
  return NextResponse.json({ canEdit });
}
