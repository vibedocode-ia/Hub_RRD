import canonicalize from 'canonicalize';
import {createHash,sign as edSign,verify as edVerify} from 'node:crypto';
import schema from './contract.schema.json' with {type:'json'};
import Ajv from 'ajv/dist/2020.js';
import {parseTree} from 'jsonc-parser';
const ajv=new Ajv({strict:true});
ajv.addSchema(schema);
const validators={message:ajv.getSchema('urn:hvd:access:v1'),proof:ajv.compile({$ref:'urn:hvd:access:v1#/$defs/Proof'}),state:ajv.compile({$ref:'urn:hvd:access:v1#/$defs/AccessState'})};
export const canonical=value=>canonicalize(value);
export const digest=value=>createHash('sha256').update(typeof value==='string'?value:canonical(value)).digest('hex');
export function sign(value,key){const {signature,...unsigned}=value;return {...unsigned,signature:edSign(null,Buffer.from(canonical(unsigned)),key).toString('base64url')};}
export function verify(value,key){try{const {signature,...unsigned}=value;return edVerify(null,Buffer.from(canonical(unsigned)),key,Buffer.from(signature,'base64url'));}catch{return false;}}
export function validate(kind,value){if(!validators[kind]?.(value)) throw Object.assign(new Error('schema_invalid'),{status:422});return value;}
export function parse(text){
 if(Buffer.byteLength(text)>262144) throw Object.assign(new Error('body_too_large'),{status:413});
 const errors=[];const tree=parseTree(text,errors,{disallowComments:true,allowTrailingComma:false});
 if(errors.length||!tree) throw Object.assign(new Error('invalid_json'),{status:400});
 const validString=s=>{for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);if(c>=0xd800&&c<=0xdbff){const d=s.charCodeAt(++i);if(!(d>=0xdc00&&d<=0xdfff))throw new Error('invalid_unicode');}else if(c>=0xdc00&&c<=0xdfff)throw new Error('invalid_unicode');}};
 const visit=node=>{if(node.type==='string')validString(node.value);if(node.type==='object'){const keys=new Set();for(const prop of node.children??[]){const k=prop.children[0].value;if(keys.has(k))throw new Error('duplicate_json_key');keys.add(k);}}for(const child of node.children??[])visit(child);};
 try{visit(tree);}catch{throw Object.assign(new Error('invalid_json'),{status:400});}
 return JSON.parse(text);
}
