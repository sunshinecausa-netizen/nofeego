import { NextResponse } from 'next/server';
import { accountError, authenticateAccountRequest } from '@/lib/account/server';
import { deterministicRoommateProvider } from '@/lib/roommate/ai-provider';
import { extractRequestSchema } from '@/lib/roommate/schemas';

export async function POST(request: Request) {
  const auth = await authenticateAccountRequest(request);
  if (auth instanceof NextResponse) return auth;
  const parsed = extractRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return accountError('INVALID_EXTRACTION_REQUEST', 'Please provide a valid answer.');
  const result = await deterministicRoommateProvider.extractStructuredAnswer(parsed.data);
  return NextResponse.json(result.ok ? { data: result.value, provider: result.provider, version: result.version } : { error: result.reason, provider: result.provider }, { status: result.ok ? 200 : 422 });
}
