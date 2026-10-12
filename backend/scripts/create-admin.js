'use strict';
const bcrypt=require('bcryptjs');
async function provisionConfiguredAccount({pool,env=process.env}){
 const email=String(env.PROVISION_ADMIN_EMAIL||env.ADMIN_EMAIL||'').trim().toLowerCase();
 const password=String(env.PROVISION_ADMIN_PASSWORD||env.ADMIN_PASSWORD||'');
 const name=String(env.PROVISION_ADMIN_NAME||'Runtime Administrator').trim();
 if(!/^\S+@\S+\.\S+$/.test(email)||password.length<12||!name)throw Error('Valid configured administrator credentials are required');
 const client=await pool.connect();try{await client.query('BEGIN');
  const existing=(await client.query('SELECT * FROM users WHERE email=$1 FOR UPDATE',[email])).rows[0];
  if(existing){if(!await bcrypt.compare(password,existing.password))throw Error('Configured credentials do not match the existing account. Password, role, verification and profile were preserved.');await client.query('COMMIT');return{created:false,id:existing.id};}
  if(env.NODE_ENV==='production'||env.ENABLE_DEMO_CREDENTIAL_AUTOFILL==='false')throw Error('Development account provisioning is disabled');
  const row=(await client.query("INSERT INTO users(email,password,name,role,email_verified) VALUES($1,$2,$3,'admin',TRUE) RETURNING id",[email,await bcrypt.hash(password,12),name])).rows[0];
  await client.query('COMMIT');return{created:true,id:row.id};
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
}
module.exports={provisionConfiguredAccount};
if(require.main===module){const pool=require('../config/database');provisionConfiguredAccount({pool}).then(value=>console.log(value.created?'Configured native development account created.':'Existing configured account verified; password, role and profile preserved.')).catch(()=>{console.error('Configured native account could not be verified. Existing accounts were preserved.');process.exitCode=1;}).finally(()=>pool.end());}
