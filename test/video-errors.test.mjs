import test from 'node:test';
import assert from 'node:assert/strict';
import { geminiRequestError } from '../video/gemini-errors.mjs';
test('Gemini request errors classify only safe fields and do not blame a key for an unknown HTTP 400',async()=>{
  for(const [status,message,category]of [[400,'Your input schema produces a constraint that has too many states','schema'],[400,'input token count exceeds limit','input'],[400,'API key not valid','key'],[400,'Unspecified invalid argument','request'],[403,'Not allowed','permission'],[404,'Not found','model']]){
    const error=await geminiRequestError(new Response(JSON.stringify({error:{message:message+' PRIVATE-KEY-CONTENT'}}),{status}));
    assert.equal(error.apiRequestError.category,category);assert.equal(error.apiRequestError.status,status);assert(!JSON.stringify(error).includes('PRIVATE'));assert(!error.message.includes('PRIVATE'));
    if(category==='request')assert(!error.message.includes('API 키'));
  }
  const field=await geminiRequestError(new Response(JSON.stringify({error:{message:'Invalid argument',details:[{fieldViolations:[{field:'generation_config.response_json_schema.properties.cues.minItems',description:'PRIVATE'}]}]}}),{status:400}));assert.equal(field.apiRequestError.category,'schema');
  assert.equal((await geminiRequestError(new Response('not JSON',{status:400}))).apiRequestError.category,'request');
});
