(function(root){
 'use strict';
 const modes=['padel_indoor','padel_outdoor','tenis_indoor','tenis_outdoor'];
 function mode(v){return ({indoor:'padel_indoor',outdoor:'padel_outdoor',tennis_indoor:'tenis_indoor',tennis_outdoor:'tenis_outdoor',tenis:'tenis_outdoor'})[v]||v;}
 const hm=s=>{const [h,m]=String(s).split(':').map(Number);return h*60+m;};
 const today=(now=Date.now())=>new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
 function legacy(d,m){m=mode(m);const prefix=m==='padel_indoor'?'Indoor':m==='padel_outdoor'?'Outdoor':'Tenis',specific=d.preciosTenisModalidades?.[m],prices={};for(const duration of [60,90,120]){prices[duration]={};for(const light of ['sinLuz','conLuz']){const cap=light[0].toUpperCase()+light.slice(1);prices[duration][light]=Number(specific?.[duration]?.[light]??d['precio'+prefix+duration+cap]??(Number(d['precio'+prefix+cap]??d['precio'+prefix]??0)*duration/30));}}return {activa:false,horaCambio:'17:00',antes:0,despues:0,precios:prices,horaLuces:d.horaLucesModalidades?.[m]||d.horaLuces||'18:00'};}
 function stamp(r){const raw=r?.fechaRegistro||r?.creadaEn||r?.creadoEn||r?.createdAt;return typeof raw?.toMillis==='function'?raw.toMillis():raw?.seconds?raw.seconds*1000:typeof raw==='number'?raw:Date.parse(raw)||0;}
 function select(d,m,date,r,now=Date.now()){
  const versions=d.tarifasModalidades?.[mode(m)];if(!Array.isArray(versions)||!versions.length)return null;
  const created=r?.fijo||!r||!r.id?Infinity:stamp(r);
  return versions.filter(v=>v.desde<=date&&Number(v.registradoEn)<=created).sort((a,b)=>a.desde.localeCompare(b.desde)||a.registradoEn-b.registradoEn).at(-1)||versions[0];
 }
 function quote(v,hour,duration){if(!v)return null;const start=hm(hour),minutes=Number(duration);if(!Number.isFinite(start)||!Number.isFinite(minutes)||minutes<=0)throw Error('Horario o duración inválidos.');let amount;
  if(v.modelo==='duracion'&&v.activa){const table=(prices)=>prices[minutes]||(()=>{const key=[60,90,120].reduce((best,current)=>Math.abs(current-minutes)<Math.abs(best-minutes)?current:best,90);return {sinLuz:prices[key].sinLuz*minutes/key,conLuz:prices[key].conLuz*minutes/key};})();const before=table(v.precios),after=table(v.preciosDespues),cut=hm(v.horaCambio),lights=hm(v.horaLuces);let total=0;for(let offset=0;offset<minutes;){const current=(start+offset)%1440,end=Math.min(1440,current+minutes-offset),points=[current,...[cut,lights].filter(x=>x>current&&x<end),end].sort((a,b)=>a-b);for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],p=a<cut?before:after;total+=p[a<lights?'sinLuz':'conLuz']*(b-a)/minutes;}offset+=end-current;}amount=Math.floor(total/1000)*1000;}
  else if(v.activa){let before=0;for(let offset=0;offset<minutes;){const current=(start+offset)%1440,chunk=Math.min(minutes-offset,1440-current),cut=hm(v.horaCambio);before+=Math.max(0,Math.min(current+chunk,cut)-current);offset+=chunk;}amount=(before*v.antes+(minutes-before)*v.despues)/60;}
  else{const p=v.precios[minutes]||(()=>{const key=[60,90,120].reduce((best,current)=>Math.abs(current-minutes)<Math.abs(best-minutes)?current:best,90);return {sinLuz:v.precios[key].sinLuz*minutes/key,conLuz:v.precios[key].conLuz*minutes/key};})(),lit=Math.min(minutes,Math.max(0,Math.min(start+minutes,1440)-Math.max(start,hm(v.horaLuces))));amount=Math.floor((p.sinLuz*(minutes-lit)/minutes+p.conLuz*lit/minutes)/1000)*1000;}
  return Math.round(amount*100)/100;
 }
 function schedule(before,after,requests,now=Date.now()){
  const result=JSON.parse(JSON.stringify(before.tarifasModalidades||{}));
  for(const [m,raw]of Object.entries(requests||{})){
   if(!modes.includes(m)||!raw||typeof raw.activa!=='boolean')throw Error('Tarifa de modalidad inválida.');
   const desde=raw.desde==='ahora'?today(now):String(raw.desde||'');if(!/^\d{4}-\d{2}-\d{2}$/.test(desde)||!Number.isFinite(Date.parse(desde+'T12:00:00Z'))||new Date(desde+'T12:00:00Z').toISOString().slice(0,10)!==desde||desde<today(now))throw Error('Elegí desde hoy o una fecha futura para los precios.');
   if(!/^([01]\d|2[0-3]):(00|30)$/.test(raw.horaCambio||''))throw Error('Elegí el horario de cambio de tarifa.');
   for(const key of ['antes','despues'])if(typeof raw[key]!=='number'||!Number.isFinite(raw[key])||raw[key]<0||raw[key]>1e9)throw Error('Completá tarifas por hora válidas.');
   let durationFields={};if(raw.modelo==='duracion'){const validate=(p)=>{if(!p||typeof p!=='object'||Array.isArray(p))throw Error('Completá los precios por duración.');const clean={};for(const d of [60,90,120]){clean[d]={};for(const l of ['sinLuz','conLuz']){const value=p[d]?.[l];if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1e9)throw Error('Precio por duración inválido.');clean[d][l]=value;}}return clean;};durationFields={modelo:'duracion',precios:validate(raw.precios),preciosDespues:validate(raw.preciosDespues)};}
   const next={...legacy(after,m),...durationFields,activa:raw.activa,horaCambio:raw.horaCambio,antes:raw.antes,despues:raw.despues,desde,registradoEn:now};
   const list=result[m]||[{...legacy(before,m),desde:'0000-01-01',registradoEn:0}];
   // Keep older announced versions: existing reservations may still reference them.
   list.push(next);if(list.length>300)throw Error('Se alcanzó el máximo de cambios de tarifa para esta modalidad.');result[m]=list;
  }return result;
 }
 const api={modes,mode,today,legacy,stamp,select,quote,schedule};if(typeof module!=='undefined')module.exports=api;if(root)root.PricCourtTariffs=api;
})(typeof window!=='undefined'?window:null);
