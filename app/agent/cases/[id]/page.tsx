import { RentalCaseWorkspace } from '@/components/rental-case-workspace';
export default async function AgentCasePage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <RentalCaseWorkspace caseId={id} audience="agent"/>}
