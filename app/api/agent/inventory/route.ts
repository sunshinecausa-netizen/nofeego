import { NextResponse } from 'next/server';
import { accountError, authenticateAccountRequest } from '@/lib/account/server';

export async function GET(request: Request) {
  const auth = await authenticateAccountRequest(request);
  if (auth instanceof NextResponse) return auth;

  const { data: role, error: roleError } = await auth.supabase.rpc('current_account_role');
  if (roleError) return accountError('ROLE_READ_FAILED', 'Inventory could not be loaded. Please try again.', 500);
  if (role !== 'agent') return accountError('AGENT_REQUIRED', 'You do not have permission to view this inventory.', 403);

  const requestedBuildingId = new URL(request.url).searchParams.get('building');
  const {data,error}=await auth.supabase.rpc('agent_authorized_inventory',{p_building_id:requestedBuildingId});
  if(error){
    const forbidden=error.code==='42501'||error.message.includes('forbidden')||error.message.includes('access_required');
    return accountError(forbidden?'INVENTORY_BUILDING_FORBIDDEN':'INVENTORY_READ_FAILED',forbidden?'You do not have permission to view this inventory.':'Inventory could not be loaded. Please try again.',forbidden?403:500);
  }
  const payload=(data??{}) as Record<string,unknown>;
  const buildings=Array.isArray(payload.buildings)?payload.buildings:[];
  return NextResponse.json({...payload,state:buildings.length?'ready':'no_access',propertyAccess:[],outbox:[],feedback:[],registrations:[],cases:[]});
}
