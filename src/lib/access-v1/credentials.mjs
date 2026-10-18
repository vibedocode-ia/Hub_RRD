import bcrypt from 'bcryptjs';
import {scrypt as scryptCallback,randomBytes,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback);
export function validatePassword(password,side){
 if(typeof password!=='string'||!password.trim()||(side==='central'&&Buffer.byteLength(password)>72))throw Object.assign(new Error('invalid_password'),{status:422});
}
export async function hashPassword(password,side){
 validatePassword(password,side);
 if(side==='central')return bcrypt.hash(password,10);
 const salt=randomBytes(16).toString('hex');const key=await scrypt(password,salt,64);return salt+':'+key.toString('hex');
}
export async function verifyPassword(password,hash,side){
 try{validatePassword(password,side);if(side==='central')return await bcrypt.compare(password,hash||'');
 if(!/^[a-f0-9]{32}:[a-f0-9]{128}$/.test(hash||''))return false;
 const [salt,key]=hash.split(':');const candidate=await scrypt(password,salt,64);return timingSafeEqual(candidate,Buffer.from(key,'hex'));}catch{return false;}
}
