import { RentalCaseWorkspace } from '@/components/rental-case-workspace';
export default async function TenantCasePage({params}:{params:Promise<{id:string}>}){const {id}=await params;return <RentalCaseWorkspace caseId={id} audience="tenant"/>}
