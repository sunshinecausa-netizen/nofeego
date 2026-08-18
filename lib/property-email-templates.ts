export type PropertyEmailContext={caseId:string;caseStatus:string;buildingName:string;floorPlan:string;moveInDate:string|null;budget:number|null;contactShareConsent:boolean;tenantDisplayName?:string|null};

const actionForStatus=(status:string)=>{
  if(status==='agent_assigned')return {purpose:'availability',label:'Availability confirmation'};
  if(status==='interested')return {purpose:'registration',label:'Client registration'};
  if(['registered_with_property','property_acknowledged'].includes(status))return {purpose:'tour',label:'Tour request'};
  if(status==='additional_documents_requested')return {purpose:'application',label:'Missing documents'};
  if(['approved','lease_sent'].includes(status))return {purpose:'leasing',label:'Approval and lease follow-up'};
  return {purpose:'application',label:'Application follow-up'};
};

export function propertyEmailTemplate(context:PropertyEmailContext){
  const action=actionForStatus(context.caseStatus);
  const identity=context.contactShareConsent&&context.tenantDisplayName?`Client: ${context.tenantDisplayName}\n`:'';
  return {
    purpose:action.purpose,
    subject:`${action.label} — ${context.buildingName}`,
    body:`Hello Leasing Team,\n\n${action.label} for ${context.buildingName}.\nFloor plan: ${context.floorPlan||'Flexible'}\nMove-in: ${context.moveInDate||'Flexible'}\nBudget: ${context.budget?`$${context.budget.toLocaleString()}`:'Not supplied'}\n${identity}Rental Case reference: ${context.caseId}\n\nPlease reply with the current next step and any time-sensitive requirements.\n\nThank you.`,
  };
}
