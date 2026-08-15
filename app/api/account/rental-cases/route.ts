import { NextResponse } from 'next/server';
import { accountError, authenticateAccountRequest } from '@/lib/account/server';

export async function GET(request: Request) {
  const auth = await authenticateAccountRequest(request); if (auth instanceof NextResponse) return auth;
  const inquiryId = new URL(request.url).searchParams.get('inquiryId');
  if (!inquiryId) return accountError('INQUIRY_REQUIRED', 'An inquiry is required.');
  const { data: rentalCase, error } = await auth.supabase.from('rental_cases').select('*').eq('inquiry_id', inquiryId).maybeSingle();
  if (error) return accountError('RENTAL_CASE_READ_FAILED', 'Unable to load this Rental Case.', 500);
  if (!rentalCase) return accountError('RENTAL_CASE_NOT_FOUND', 'Rental Case not found.', 404);
  const { data: options, error: optionsError } = await auth.supabase.from('rental_case_options').select('*').eq('rental_case_id', rentalCase.id).order('created_at');
  if (optionsError) return accountError('RENTAL_OPTIONS_READ_FAILED', 'Unable to load current options.', 500);
  return NextResponse.json({ rentalCase, options: options ?? [] });
}
