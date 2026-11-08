export type FitnessAnswers = Record<string,number|null|string>;
export const FITNESS_DIMENSIONS = {
  Purpose:["owner"],
  Complexity:["overlap","map"],
  "Cost visibility":["cost"],
  Resilience:["swap","outage","rollback"],
  Governance:["authority","logs","compare"]
} as const;
export function scoreFitness(answers:FitnessAnswers) {
 const stats=Object.entries(FITNESS_DIMENSIONS).map(([name,ids])=>{
  const vals=ids.map(id=>answers[id]).filter((v):v is number=>typeof v==="number");
  return {name,count:vals.length,total:ids.length,score:vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):null};
 });
 const answered=stats.reduce((s,d)=>s+d.count,0);
 const valid=stats.filter(d=>d.score!==null);
 const overall=valid.length>=4&&answered>=7?Math.round(valid.reduce((s,d)=>s+(d.score??0),0)/valid.length):null;
 return {stats,answered,overall};
}
