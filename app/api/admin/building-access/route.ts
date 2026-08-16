import { NextResponse } from 'next/server';
import { z } from 'zod';
import { accountError, authenticateAccountRequest } from '@/lib/account/server';
const schema=z.object({organizationId:z.string().uuid(),buildingId:z.string().uuid()}).strict();
export async function POST(request:Request){const auth=await authenticateAccountRequest(request);if(auth instanceof NextResponse)return auth;const parsed=schema.safeParse(await request.json().catch(()=>null));if(!parsed.success)return accountError('INVALID_BUILDING_ACCESS','Review the Building access request.');const {data,error}=await auth.supabase.rpc('admin_grant_property_building_access',{p_organization_id:parsed.data.organizationId,p_building_id:parsed.data.buildingId});if(error)return accountError('BUILDING_ACCESS_REJECTED','Only an authorized Admin can grant Property Building access.',403);return NextResponse.json({item:data});}
