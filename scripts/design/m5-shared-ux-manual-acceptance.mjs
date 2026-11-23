/** M5 owner/human acceptance register: intentionally NEVER fabricates a pass. */
import {createPendingSyntheticEvidence} from '../qa/synthetic-evidence-matrix.mjs';
import {qualifySyntheticViewportEvidence} from '../qa/synthetic-viewport-evidence.mjs';
export const SHARED_ROLES=Object.freeze(['speech-therapist','coordinator','supervisor','guardian']);
export const SHARED_TASKS=Object.freeze({
  'speech-therapist':'today-session-evidence-draft-save-and-report-handoff',
  coordinator:'date-filter-exceptions-recurrence-scope-and-timezone',
  supervisor:'review-queue-source-evidence-comment-and-permitted-decision',
  guardian:'three-siblings-approved-practice-documents-and-authorized-messages',
});
export function buildPendingSharedUxManualAcceptance(){
  const rows=createPendingSyntheticEvidence({roles:SHARED_ROLES,journeys:['workspace']});
  const qualification=qualifySyntheticViewportEvidence(rows,{roles:SHARED_ROLES,journeys:['workspace']});
  if(qualification.status!=='NOT_QUALIFIED'||qualification.expectedCount!==100||
    qualification.observedCount!==100||qualification.failures.length!==500||
    rows.some(row=>Object.values(row.checks).some(value=>value!=='NOT_RUN'))) {
    throw new Error('Manual acceptance receipt must remain fully pending until actual human testing');
  }
  return {
    schemaVersion:1,environment:'ISOLATED_SYNTHETIC_CI',
    evidenceType:'PENDING_HUMAN_ACCEPTANCE_NOT_CI_APPROVAL',
    roleTasks:SHARED_TASKS,
    governance:{clinicalGate:'NO_GO_G2_G2b',ownerSignoff:'NOT_OBTAINED',
      manualScreenReader:'NOT_RUN',manualVisualReview:'NOT_RUN',
      realTaskTiming:'NOT_RUN',humanUsability:'NOT_RUN'},
    summary:{requiredRows:100,observedRows:0,awaitingHumanChecks:500,status:'NOT_QUALIFIED'},
    rows
  };
}
