export type TriageAnswers = Record<string, number>;
export const TRIAGE_VERSION = "NW-TRIAGE-0.2";
export const TRIAGE_IDS = ["claims","consequence","action","authority","timeout","evidence","correction","completion","tests","independent","urgency","unknowns"] as const;
export function scoreTriage(a:TriageAnswers) {
  const total = TRIAGE_IDS.reduce((sum,id)=>sum+(a[id]??0),0);
  const critical = (a.consequence===3 && ((a.action??0)>=2 || (a.authority??0)>=2)) || total>=27;
  const band = critical?"CRITICAL":total>=19?"RED":total>=10?"AMBER":"GREEN";
  return {total,band};
}
