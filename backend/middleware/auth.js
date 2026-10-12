const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters');
}

const authMiddleware = async(req,res,next)=>{
 try{const header=String(req.headers.authorization||'');if(!/^Bearer\s+\S+$/i.test(header))return res.status(401).json({error:'Authentication required'});const token=jwt.verify(header.replace(/^Bearer\s+/i,''),JWT_SECRET,{algorithms:['HS256']});if(!Number.isSafeInteger(Number(token.id))||Number(token.id)<=0)return res.status(401).json({error:'Authentication required'});const actor=(await require('../config/database').query('SELECT id,email,role FROM users WHERE id=$1',[token.id])).rows[0];if(!actor||actor.email!==token.email||actor.role!==token.role)return res.status(401).json({error:'Your account identity has changed. Sign in again.'});req.user=token;next();}catch(error){res.status(error.name?.includes('JsonWebToken')||error.name==='TokenExpiredError'?401:503).json({error:error.name?.includes('JsonWebToken')||error.name==='TokenExpiredError'?'Invalid or expired token':'Your current account could not be loaded. Retry.'});}
};

const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
  } catch (error) {
    req.user = null;
  }

  next();
};

module.exports = { authMiddleware, optionalAuth };
