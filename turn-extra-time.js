(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.PricTurnExtraTime=api;
})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const options=[30,60,90,120];
 function entries(reservation,date){
  const state=reservation?.fijo&&date!==reservation.fecha?reservation.instancias?.[date]:reservation;
  const list=state?.tiemposExtra||[];
  if(!Array.isArray(list))throw Error('El detalle del tiempo extra no es válido.');
  for(const item of list){
   if(!item.id||!options.includes(item.minutos)||!Number.isFinite(item.importe)||item.importe<0||!Number.isSafeInteger(Math.round(item.importe*100)))throw Error('El tiempo extra contiene un importe inválido.');
  }
  return list;
 }
 function total(reservation,date){
  const amount=entries(reservation,date).reduce((sum,x)=>sum+Math.round(x.importe*100),0);
  if(!Number.isSafeInteger(amount))throw Error('El importe del tiempo extra supera el máximo admitido.');
  return amount/100;
 }
 function intervals(start,minutes){
  if(!Number.isInteger(start)||start<0||!options.includes(minutes))throw Error('Tiempo de juego inválido.');
  const result=[];let remaining=minutes,current=start%1440;
  while(remaining){const used=Math.min(remaining,1440-current);result.push({start:current,minutes:used});remaining-=used;current=0;}
  return result;
 }
 function regularPrice(prices,lightMinute,start,minutes){
  if(!Number.isInteger(lightMinute)||lightMinute<0||lightMinute>=1440)throw Error('Horario de luces inválido.');
  if(!Number.isFinite(prices.sinLuz)||prices.sinLuz<0||!Number.isFinite(prices.conLuz)||prices.conLuz<0)throw Error('Tarifas de cancha inválidas.');
  const lit=intervals(start,minutes).reduce((sum,x)=>sum+Math.max(0,x.start+x.minutes-Math.max(x.start,lightMinute)),0);
  return Math.floor((prices.sinLuz*(minutes-lit)/minutes+prices.conLuz*lit/minutes)/1000)*1000;
 }
 return {options,entries,total,intervals,regularPrice};
});
