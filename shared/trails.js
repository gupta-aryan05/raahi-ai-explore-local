import { places } from './places.js';
export const XP_PER_STOP=50, XP_TRAIL_BONUS=100;
export function getPlace(id){return places.find(p=>p.id===id);}
export function mapsUrl(p){return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name+', '+p.address)}`;}
export function directionsUrl(stops){return stops.length?`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(stops.at(-1).name+', '+stops.at(-1).address)}${stops.length>1?'&waypoints='+encodeURIComponent(stops.slice(0,-1).map(p=>p.name+', '+p.address).join('|')):''}`:'#';}
export function pickPlaces(input){
 const {city,interest='All',hours=4,budget=500}=input;
 if(!['Ambala','Kurukshetra','Panchkula'].includes(city)) throw new Error('Choose a supported city.');
 if(!Number.isFinite(+hours)||+hours<2||+hours>12) throw new Error('Time must be between 2 and 12 hours.');
 if(!Number.isFinite(+budget)||+budget<0||+budget>100000) throw new Error('Enter a valid budget.');
 let list=places.filter(p=>p.city===city);
 const priority=p=>(p.category===interest?3:0)+(p.hidden?2:0);
 list.sort((a,b)=>priority(b)-priority(a));
 // Conservative indicative on-site visiting time only, plus a planning buffer of 25min between stops.
 let used=0, chosen=[];
 for(const p of list){const added=p.visit+(chosen.length?25:0); if(used+added <= Number(hours)*60-25 && chosen.length<4){chosen.push(p);used+=added;}}
 // Do not pretend that entrance/transport prices are known. Budget is guidance, not a price guarantee.
 if(chosen.length<2) throw new Error('Not enough time for a two-stop trail here. Try 3 or more hours.');
 return chosen;
}
export function makeOfflineTrail(input){
 const selected=pickPlaces(input);
 return {id:`trail-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,city:input.city,interest:input.interest,hours:Number(input.hours),budget:Number(input.budget),mode:'offline',title:`The ${input.city} Heritage Quest`,description:`Follow ${selected.length} real local landmarks and unlock their stories. Clues and quizzes are curated offline; no AI was used.`,stops:selected.map((p,i)=>({placeId:p.id,clue:`Stop ${i+1}: Discover a place where ${p.story.charAt(0).toLowerCase()+p.story.slice(1)}`,question:p.question,options:p.options,answer:p.answer})),createdAt:Date.now()};
}
export function validateAIContent(raw, selected){
 if(!raw||!Array.isArray(raw.stops)||!raw.title||typeof raw.description!=='string')throw new Error('Invalid AI response.');
 const allowed=new Set(selected.map(p=>p.id)), seen=new Set();
 if(raw.stops.length!==selected.length)throw new Error('AI omitted stops.');
 const stops=raw.stops.map(s=>{
   const p=getPlace(s.placeId);
   if(!p||!allowed.has(s.placeId)||seen.has(s.placeId)||typeof s.clue!=='string'||s.clue.length<10||s.clue.length>400||typeof s.question!=='string'||s.question.length<8||!Array.isArray(s.options)||s.options.length!==4||!s.options.every(o=>typeof o==='string'&&o.length>0&&o.length<160)||!Number.isInteger(s.answer)||s.answer<0||s.answer>3)throw new Error('Invalid AI stop.');
   // Ground truth: quiz must be based on curated questions; AI can write clues, not create unverifiable history questions.
   seen.add(s.placeId);
   return {placeId:p.id,clue:s.clue,question:p.question,options:p.options,answer:p.answer};
 });
 return {title:String(raw.title).slice(0,90),description:String(raw.description).slice(0,350),stops};
}
export function initialProgress(trail){return {trailId:trail.id,completed:[],arrived:[],finished:false};}
export function markArrived(progress,index){return {...progress,arrived:[...new Set([...progress.arrived,index])]};}
export function completeStop(progress,trail,index,choice){
 if(index!==progress.completed.length || !progress.arrived.includes(index))return {progress,correct:false,reason:'Complete earlier stops and confirm arrival first.'};
 if(choice!==trail.stops[index].answer)return {progress,correct:false,reason:'Not quite. Try another answer.'};
 const completed=[...progress.completed,index];
 return {progress:{...progress,completed,finished:completed.length===trail.stops.length},correct:true};
}
export function calculateXP(records){
 const counted=new Set();let xp=0,complete=0;
 for(const {trail,progress} of records){if(!trail||!progress)continue;
 for(const index of progress.completed){const key=trail.id+':'+index;if(!counted.has(key)&&trail.stops[index]){xp+=XP_PER_STOP;counted.add(key);}}
 if(progress.finished && progress.completed.length===trail.stops.length){const key=trail.id+':bonus';if(!counted.has(key)){xp+=XP_TRAIL_BONUS;complete++;counted.add(key);}}
 }return {xp,complete,stops:[...counted].filter(x=>!x.endsWith(':bonus')).length};
}
