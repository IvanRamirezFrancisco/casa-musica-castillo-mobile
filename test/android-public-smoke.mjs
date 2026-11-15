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

let offline=false;
async function hideKeyboard(){const state=adb('shell','dumpsys','input_method').toString();if(/mInputShown=true|isInputViewShown=true/.test(state)){adb('shell','input','keyevent','4');await sleep(500);}}
try {
 await wait(`location.pathname==='/main/home'&&document.body.textContent.includes('Novedades')`);await capture('inicio');
 await tap('app-public-home a[aria-label="Ver Jaranas en el catálogo"]');await wait(`location.pathname==='/main/catalog'&&document.querySelector('app-public-catalog .product-card')!==null`);await capture('catalogo');
 await tap('app-public-catalog button[aria-label="Abrir filtros y ordenamiento"]');await wait(`document.querySelector('.filter-sheet')?.getBoundingClientRect().width>0`);await capture('filtros');
 await tap('.filter-sheet fieldset:nth-of-type(2) label:nth-of-type(2) input');await tap('.sheet-actions .primary');await wait(`performance.getEntriesByType('resource').some(e=>e.name.includes('sortBy=price_asc')&&e.responseStatus===200)`);await capture('orden');
 await tap('#catalog-search');adb('shell','input','text','Jarana');await wait(`performance.getEntriesByType('resource').some(e=>e.name.includes('keyword=Jarana')&&e.responseStatus===200)`);await hideKeyboard();await capture('busqueda');
 await tap('app-public-catalog .product-card .detail-btn');await wait(`location.pathname.startsWith('/products/')&&document.body.textContent.includes('SKU:')`);await capture('detalle');
 if(await point('.gallery-thumb:nth-child(2)')){await tap('.gallery-thumb:nth-child(2)');await capture('galeria');}
 await tap('cmc-product-reviews button');await wait(`document.body.textContent.includes('opiniones publicadas')`);await capture('opiniones');
 await tap('cmc-quantity button[aria-label="Aumentar cantidad"]');await wait(`document.querySelector('cmc-quantity output')?.textContent.trim()==='2'`);await capture('cantidad');
 await tap('app-public-product-detail cmc-button');await wait(`location.pathname==='/login'`);await capture('login');
 await tap('button[aria-label="Mostrar contraseña"]');await wait(`document.querySelector('app-connected-login input[autocomplete="current-password"]')?.type==='text'`);await capture('mostrar-contrasena');await tap('button[aria-label="Ocultar contraseña"]');await hideKeyboard();
 await tap('app-connected-login a[href="/register"]');await wait(`location.pathname==='/register'`);await capture('registro');adb('shell','input','keyevent','4');await wait(`location.pathname==='/login'`);
 await tap('app-connected-login a[href="/forgot-password"]');await wait(`location.pathname==='/forgot-password'`);await capture('recuperacion');await tap('app-connected-forgot-password button.cmc-link');await wait(`document.querySelector('app-connected-forgot-password input[autocomplete="new-password"]')!==null`);await capture('restablecimiento');await tap('app-connected-forgot-password button[aria-label="Volver a iniciar sesión"]');await wait(`location.pathname==='/login'`);
 await tap('app-connected-login .auth-help summary');await tap('app-connected-login a[href="/verify-email"]');await wait(`location.pathname==='/verify-email'`);await capture('verificacion');adb('shell','input','keyevent','4');await wait(`location.pathname==='/login'`);
 await tap('app-connected-login a[href="/main/home"]');await wait(`location.pathname==='/main/home'`);await tap('app-public-home a[href="/favorites"]');await wait(`location.pathname==='/login'`);const favoriteGuard=await capture('favoritos-protegidos');if(favoriteGuard.returnUrl!=='/favorites')throw Error('Favorite guard lost destination');
 await tap('app-connected-login a[href="/main/home"]');await wait(`location.pathname==='/main/home'`);
 for(const target of ['cart','orders','profile']){await tap('ion-tab-button[tab="'+target+'"]');await wait(`location.pathname==='/login'`);await capture(target+'-protegido');await tap('app-connected-login a[href="/main/home"]');await wait(`location.pathname==='/main/home'`);}
 await rpc('Network.enable');await rpc('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:-1,uploadThroughput:-1});offline=true;
 await tap('app-public-home a.store-button[href="/main/catalog"]');await wait(`document.body.textContent.includes('No pudimos cargar el catálogo')`);await capture('sin-conexion');
 await rpc('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});offline=false;
 await tap('app-public-catalog cmc-error-state button');await wait(`document.querySelector('app-public-catalog .product-card')!==null`);await capture('reintento');
 fs.writeFileSync(dir+'android-journey.json',JSON.stringify({status:'passed',observations},null,2));
}catch(error){fs.writeFileSync(dir+'android-journey.json',JSON.stringify({status:'partial',error:error.message,observations},null,2));throw error;}
finally{if(offline)await rpc('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1}).catch(()=>{});ws.close();}
