"use strict";
const fs=require('fs'),path=require('path');
// Existing migration002 is additive: retain accounts and original provider receipts.
async function ensureNativeRuntimeSchema(client){
 await client.query('SELECT pg_advisory_xact_lock($1,$2)',[8325,2]);
 await client.query(fs.readFileSync(path.resolve(__dirname,'../migrations/002_runtime_identity_ai.sql'),'utf8'));
 await client.query(fs.readFileSync(path.resolve(__dirname,'../migrations/005_calendar_instants.sql'),'utf8'));
}
async function prepareNativeRuntimeSchema({pool}){
 const client=await pool.connect();
 try{await client.query('BEGIN');await ensureNativeRuntimeSchema(client);await client.query('COMMIT');return{status:'ready',accountsChanged:0,providerCalls:0};}
 catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
 finally{client.release();}
}
module.exports={ensureNativeRuntimeSchema,prepareNativeRuntimeSchema};
