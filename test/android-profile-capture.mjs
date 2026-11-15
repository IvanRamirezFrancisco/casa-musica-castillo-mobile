// Real Debug APK / emulator-5554 public journey only. No credentials or authenticated writes.
// Requires adb on PATH (or ADB env), Node WebSocket support, installed/launched Debug APK and local API.
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const adbExe=process.env.ADB ?? 'adb';
const dir='reports/activity4-close/';
fs.mkdirSync(dir,{recursive:true});
const adb=(...args)=>execFileSync(adbExe,['-s','emulator-5554',...args],{timeout:20000,maxBuffer:16*1024*1024});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let socket;
for(let attempt=0;attempt<50&&!socket;attempt++){
 try{const pid=adb('shell','pidof','com.casademusicacastillo.app').toString().trim().split(' ')[0];
 socket=adb('shell','cat','/proc/net/unix').toString().split('\n').find(s=>s.trim().endsWith('@webview_devtools_remote_'+pid))?.trim().split(' ').at(-1)?.slice(1);}catch{}
 if(!socket)await sleep(400);
}
if(!socket)throw Error('App Debug WebView socket is not available');
adb('forward','tcp:9227','localabstract:'+socket);
let tabs;
for(let attempt=0;attempt<20&&!tabs;attempt++){try{tabs=await (await fetch('http://127.0.0.1:9227/json',{headers:{Connection:'close'}})).json();if(!tabs.length)tabs=null;}catch{}if(!tabs)await sleep(400);}
if(!tabs)throw Error('App Debug target unavailable');
const tab=tabs.find(t=>t.url.startsWith('https://localhost/'));if(!tab)throw Error('App target not found');
const ws=new WebSocket(tab.webSocketDebuggerUrl);await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true});});
let id=0;const pending=new Map();
ws.addEventListener('message',event=>{const response=JSON.parse(event.data);if(pending.has(response.id)){pending.get(response.id)(response);pending.delete(response.id);}});
async function rpc(method,params={}){const rid=++id;const response=await new Promise((ok,bad)=>{const timer=setTimeout(()=>{pending.delete(rid);bad(Error('Debug command timeout: '+method));},15000);pending.set(rid,r=>{clearTimeout(timer);ok(r);});ws.send(JSON.stringify({id:rid,method,params}));});if(response.error)throw Error(response.error.message);return response.result;}
async function read(expression){const response=await rpc('Runtime.evaluate',{expression:'JSON.stringify('+expression+')',returnByValue:true});if(response.exceptionDetails)throw Error('DOM observation failed');return JSON.parse(response.result.value);}
async function wait(expression){const start=Date.now();while(Date.now()-start<20000){if(await read(expression))return;await sleep(250);}throw Error('UI condition not reached: '+expression);}
const observations=[];
async function capture(name){const data=await read(`({route:location.pathname,returnUrl:new URL(location.href).searchParams.get('returnUrl'),viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},documentWidth:document.documentElement.scrollWidth,safeArea:{top:getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top'),bottom:getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom')},headings:[...document.querySelectorAll('h1,h2,h3')].filter(e=>e.getBoundingClientRect().width).map(e=>e.textContent.trim()),fields:[...document.querySelectorAll('input')].filter(e=>e.getBoundingClientRect().width).map(e=>({type:e.type,fontSize:getComputedStyle(e).fontSize,width:e.getBoundingClientRect().width})),scrollers:[...document.querySelectorAll('ion-content')].filter(e=>e.getBoundingClientRect().width).map(e=>{const s=e.shadowRoot?.querySelector('.inner-scroll');return s?{width:s.clientWidth,scrollWidth:s.scrollWidth,height:s.clientHeight,scrollHeight:s.scrollHeight,scrollTop:s.scrollTop}:null}),publicRequests:performance.getEntriesByType('resource').filter(e=>(e.name.includes('/api/public/')||e.name.includes('/api/reviews/product/'))).map(e=>({url:e.name,status:e.responseStatus,duration:e.duration}))})`);
fs.writeFileSync(dir+name+'.json',JSON.stringify(data,null,2));fs.writeFileSync(dir+name+'.png',adb('exec-out','screencap','-p'));observations.push({name,...data});console.log(name+': '+data.route+' '+data.viewport.width+'x'+data.viewport.height);return data;}
async function point(selector){return read(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(selector)})].find(e=>e.getBoundingClientRect().width&&getComputedStyle(e).visibility!=='hidden'&&!e.closest('.ion-page-hidden,[aria-hidden="true"]'));if(!e)return null;const r=e.getBoundingClientRect();return {x:Math.round((r.x+r.width/2)*devicePixelRatio),y:Math.round((r.y+r.height/2)*devicePixelRatio),top:r.top,bottom:r.bottom,height:innerHeight,dpr:devicePixelRatio,width:innerWidth,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))};})()`);}
async function tap(selector){for(let attempt=0;attempt<10;attempt++){const p=await point(selector);if(!p){await sleep(500);continue;}if(p.hit&&p.y/p.dpr>=0&&p.y/p.dpr<p.height-20){adb('shell','input','tap',String(p.x),String(p.y));await sleep(700);return;}
adb('shell','input','swipe',String(Math.round(p.width*p.dpr/2)),String(Math.round(p.height*p.dpr*(p.top<0?.35:.75))),String(Math.round(p.width*p.dpr/2)),String(Math.round(p.height*p.dpr*(p.top<0?.75:.35))),'350');await sleep(1400);}throw Error('Target remains covered: '+selector);}


const label=process.argv[2];
try {
 await wait(`location.pathname==='/main/home'&&document.body.textContent.includes('Novedades')`);
 await capture(label+'-inicio');
 await tap('app-public-home a[aria-label="Ver Jaranas en el catálogo"]');
 await wait(`location.pathname==='/main/catalog'&&document.querySelector('app-public-catalog .product-card')!==null`);
 await capture(label+'-catalogo');
 await tap('app-public-catalog .product-card:has([data-status="available"]) .detail-btn');
 await wait(`location.pathname.startsWith('/products/')&&document.body.textContent.includes('SKU:')`);
 await capture(label+'-detalle');
 await tap('app-public-product-detail cmc-button');
 await wait(`location.pathname==='/login'`);
 await capture(label+'-login');
 for(const state of observations)if(state.documentWidth>state.viewport.width||state.scrollers.some(s=>s&&s.scrollWidth>s.width))throw Error('Horizontal overflow');
 fs.writeFileSync(dir+label+'-layout.json',JSON.stringify({status:'geometry-passed-awaiting-visual-review',observations},null,2));
}finally{ws.close();}
