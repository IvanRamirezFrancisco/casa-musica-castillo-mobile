import fs from 'node:fs';
const paths=['/actuator/health','/api/public/categories/active','/api/public/products/featured?page=0&size=6','/api/public/products/latest','/api/public/products/313','/api/reviews/product/313?page=0&size=10&sortBy=RECENT'];
const results=[];
for(const path of paths){try{const response=await fetch('http://127.0.0.1:8080'+path,{signal:AbortSignal.timeout(6000)});const raw=await response.json();results.push({path,status:response.status,keys:Array.isArray(raw)?null:Object.keys(raw),count:Array.isArray(raw)?raw.length:raw.totalReviews??raw.totalElements??null,sample:Array.isArray(raw)&&!path.includes('reviews')?raw.slice(0,2).map(p=>({id:p.id,name:p.name,stock:p.stock??null})):undefined});}catch(error){results.push({path,error:error.name,code:error.cause?.code});}}
fs.writeFileSync('reports/activity4-close/api-'+Date.now()+'.json',JSON.stringify({checkedAtUtc:new Date().toISOString(),results},null,2));
fs.writeFileSync('reports/activity4-close/public-api.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
