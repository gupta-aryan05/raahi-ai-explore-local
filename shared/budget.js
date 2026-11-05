// User-editable planning allowances; no unsupported claims about actual tickets or transport rates.
export function calculateBudget({travelers=1,transport=0,food=0,parking=0,extras=0,contingency=10}={}){
 const valid=[travelers,transport,food,parking,extras,contingency].every(x=>Number.isFinite(Number(x))&&Number(x)>=0);
 if(!valid||!Number.isInteger(Number(travelers))||Number(travelers)<1||Number(travelers)>100||Number(contingency)>100)throw new Error('Invalid budget inputs');
 const perPerson=(Number(food)+Number(extras))*Number(travelers);
 const base=Number(transport)+Number(parking)+perPerson;
 const reserve=Math.round(base*Number(contingency)/100);
 return {base,reserve,total:base+reserve,perPerson:(base+reserve)/Number(travelers),ticketFeesKnown:false};
}
