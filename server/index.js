import 'dotenv/config';
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { places } from '../shared/places.js';
import { getPlace, makeOfflineTrail, pickPlaces, validateAIContent } from '../shared/trails.js';

const app=express();app.disable('x-powered-by');app.use(express.json({limit:'32kb'}));
const apiKey=process.env.GEMINI_API_KEY;
const model=process.env.GEMINI_MODEL||'gemini-2.5-flash';
const ai=apiKey?new GoogleGenAI({apiKey}):null;
const history=new Map();
const failures={};
app.use('/api',(req,res,next)=>{const ip=req.ip||'unknown';let r=failures[ip]||{count:0,at:Date.now()};if(Date.now()-r.at>60000)r={count:0,at:Date.now()};if(++r.count>35)return res.status(429).json({error:'Please slow down and try again shortly.'});failures[ip]=r;next();});
app.get('/api/status',(_req,res)=>res.json({aiConfigured:!!ai,model:ai?model:null,places:places.length}));
app.get('/api/places',(_req,res)=>res.json(places));
app.post('/api/trails',async(req,res)=>{
 try{
  const input={city:req.body.city,interest:req.body.interest||'All',hours:Number(req.body.hours),budget:Number(req.body.budget)};
  const selected=pickPlaces(input);
  const offline=makeOfflineTrail(input);
  if(!ai)return res.json({...offline,notice:'Gemini API key is not configured. This trail uses curated offline content.'});
  try{
   const response=await ai.models.generateContent({model,contents:`Create a compelling, concise exploration narrative and mystery clues. Do NOT change the place IDs. Do NOT write quiz questions, answers, costs, travel durations, or historical facts beyond the context. Respond with a JSON object with title, description, and stops ordered exactly as given. Each stop needs placeId, clue, question (placeholder), options (four placeholders), answer (0). Ground clues only in the supplied facts. Selected locations: ${JSON.stringify(selected.map(p=>({id:p.id,name:p.name,story:p.story,fact:p.fact})))}`,config:{responseMimeType:'application/json',temperature:0.6}});
   const generated=validateAIContent(JSON.parse(response.text||'{}'),selected);
   return res.json({...offline,...generated,mode:'ai'});
  }catch(err){console.error('Trail AI failed:',err?.message);return res.json({...offline,notice:'AI is temporarily unavailable. Showing a clearly labeled curated offline trail.'});}
 }catch(err){return res.status(400).json({error:err?.message||'Invalid preferences.'});}
});
app.post('/api/ask',async(req,res)=>{
 if(!ai)return res.status(503).json({error:'AI is not configured. Add GEMINI_API_KEY on the server to enable Ask the Place.'});
 const place=getPlace(req.body.placeId),question=String(req.body.question||'').trim();
 if(!place||question.length<2||question.length>700)return res.status(400).json({error:'Select a real place and ask a short question.'});
 try{
  const response=await ai.models.generateContent({model,contents:`You are RAAHI, a friendly bilingual local heritage guide. Answer in the language of the visitor (English, Hindi or Hinglish). Use ONLY the verified source information below for claims about this location. Do not invent facts, dates, entry prices or opening hours. When facts are missing, say you do not have verified information, and share the official source for follow-up. Write in fewer than 180 words. Destination: ${place.name}. Location: ${place.address}. Verified facts: ${place.fact}. Context: ${place.story}. Official source: ${place.source}. Visitor asks: ${question}`,config:{temperature:0.3}});
  return res.json({answer:response.text||'No response was returned.',source:place.source});
 }catch(err){console.error('Ask AI failed:',err?.message);return res.status(502).json({error:'Gemini request failed. Check your API key and quota, then retry.'});}
});
const port=Number(process.env.PORT||3001);
if(process.env.NODE_ENV==='production'){
 const path=await import('node:path'); const {fileURLToPath}=await import('node:url');
 const dir=path.dirname(fileURLToPath(import.meta.url));const dist=path.resolve(dir,'../dist');
 app.use(express.static(dist));app.get('/{*path}',(_req,res)=>res.sendFile(path.join(dist,'index.html')));
}
app.listen(port,()=>console.log(`RAAHI server http://localhost:${port} | AI ${ai?'enabled':'offline mode'}`));
