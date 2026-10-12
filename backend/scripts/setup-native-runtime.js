"use strict";
const path=require('path');require('dotenv').config({path:path.resolve(__dirname,'../../.env'),quiet:true});
const{Pool}=require('pg'),{prepareNativeRuntimeSchema}=require('../lib/nativeRuntimeSchema');
async function main(){
 if(!process.env.DATABASE_URL)throw Error('The configured native database is required.');
 const pool=new Pool({connectionString:process.env.DATABASE_URL});
 try{await prepareNativeRuntimeSchema({pool});console.log('Native recommendation storage ready. Existing accounts and records preserved.');}
 finally{await pool.end();}
}
if(require.main===module)main().catch(()=>{console.error('Native recommendation storage setup failed. Check the configured database and retry; no account was created or reset.');process.exitCode=1;});
module.exports={main};
