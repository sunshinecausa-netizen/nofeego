import assert from 'node:assert/strict';
import test from 'node:test';
import { deterministicRoommateProvider } from './ai-provider';
import { conversationReducer, initialConversationState } from './conversation-reducer';
import { roommateDraftSchema } from './schemas';

test('move-in extraction returns structured timing', async () => {
  const result = await deterministicRoommateProvider.extractStructuredAnswer({ field:'move_in_timing', text:'Around September 1, 2026, but I can move a week earlier.', current:{} });
  assert.equal(result.ok, true); if(result.ok){assert.equal(result.value.flexibilityDaysBefore, 7); assert.equal(result.value.moveInDate, '2026-09-01');}
});
test('conversation supports forward and back navigation', () => {
  const next=conversationReducer(initialConversationState,{type:'next',maxQuestions:1}); assert.equal(next.stage,'lifestyle');
  assert.equal(conversationReducer(next,{type:'back'}).stage,'home');
});
test('schema blocks bedroom capacity overflow', () => {
  const input={ buildingId:'00000000-0000-4000-8000-000000000001',buildingName:'Test',buildingSlug:'test',unitId:null,floorPlan:'2 Bed',bedroomCount:2,homeConfirmed:true,
    moveInDate:'2026-09-01',flexibilityDaysBefore:0,flexibilityDaysAfter:0,leaseTerm:'12_months',personalMonthlyBudget:2500,roommatesNeeded:2,
    smokingStatus:'never',petStatus:'no_pets',petAllergies:'None',workPattern:'hybrid',sleepSchedule:'Standard',noisePreference:'quiet',cleaningHabits:'regularly_clean',guestFrequency:'occasionally',temperaturePreference:'moderate',qualificationStatus:'ready',creditCategory:null,guarantorStatus:'independent',identityVerificationWillingness:'yes',displayName:'A',bio:'Quiet and tidy roommate.',contactEmail:'a@example.com',termsAccepted:true,matchNotifications:true,marketingConsent:false };
  assert.equal(roommateDraftSchema.safeParse(input).success,false);
});
