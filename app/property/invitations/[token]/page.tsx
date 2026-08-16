import { PropertyInvitationGate } from '@/components/property-invitation-gate';
export default async function PropertyInvitationPage({params}:{params:Promise<{token:string}>}){const {token}=await params;return <PropertyInvitationGate token={token}/>}
