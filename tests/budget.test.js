import test from 'node:test';import assert from 'node:assert/strict';import {calculateBudget} from '../shared/budget.js';import {places,cities} from '../shared/places.js';import {pickPlaces} from '../shared/trails.js';
test('budget adds costs and contingency',()=>assert.deepEqual(calculateBudget({travelers:2,transport:300,food:200,parking:50,extras:100,contingency:10}),{base:950,reserve:95,total:1045,perPerson:522.5,ticketFeesKnown:false}));
test('budget rejects invalid inputs',()=>assert.throws(()=>calculateBudget({travelers:0})));
test('India city coverage includes Jaipur and Agra',()=>{assert.ok(cities.includes('Agra'));assert.ok(cities.includes('Jaipur'));assert.ok(places.some(p=>p.region==='Rajasthan'))});
test('two-stop Agra trail uses documented places',()=>assert.equal(pickPlaces({city:'Agra',hours:5,budget:1000}).length,2));
