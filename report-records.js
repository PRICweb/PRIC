(function(){
'use strict';
const money=n=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2}).format(n||0);
document.addEventListener('DOMContentLoaded',()=>{
 const panel=document.getElementById('panel-metricas-club');
 if(!panel)return;
 const box=document.createElement('details');box.id='pric-report-records';box.className='pric-admin-accordion';
 box.innerHTML='<summary>Registros</summary><div class="panel-card-club"><div class="pric-report-period"><label>Desde<input class="input-form" type="date" name="from"></label><label>Hasta<input class="input-form" type="date" name="to"></label><button class="btn-modal btn-guardar" type="button">Seleccionar</button></div><label>Categoría<select class="input-form" data-no-search="true"></select></label><p role="status"></p><table class="pric-admin-data-table"><thead><tr><th>Fecha</th><th>Detalle</th><th>Modalidad / origen</th><th>Cantidad / horas</th><th>Costo unitario medio</th><th>Efectivo</th><th>Transferencia</th><th>Total</th></tr></thead><tbody></tbody><tfoot></tfoot></table><button class="pric-media-button" type="button" hidden>Mostrar 50 más</button></div>';
 const query=s=>box.querySelector(s),select=query('select'),from=query('[name=from]'),to=query('[name=to]'),buttons=box.querySelectorAll('button'),status=query('[role=status]');
 const groups=window.PricGroupedReports.groups;
 for(const group of groups)select.add(new Option(group.label,group.label));
 const day=new Intl.DateTimeFormat('sv-SE').format(new Date());from.value=day.slice(0,8)+'01';to.value=day;
 panel.insertBefore(box,document.getElementById('pric-sales-margin'));
 let data=null,rows=[],limit=50,version=0,club=null;
 function collect(){
  rows=window.PricGroupedReports.records(data,select.value);
  limit=50;render();
 }
 function render(){
  const body=query('tbody'),foot=query('tfoot');body.replaceChildren();foot.replaceChildren();
  function cells(tr,values){values.forEach((v,i)=>{const td=document.createElement('td');td.textContent=v;td.dataset.mobileLabel=['Fecha','Detalle','Modalidad / origen','Cantidad / horas','Costo unitario medio','Efectivo','Transferencia','Total'][i];tr.append(td);});}
  for(const r of rows.slice(0,limit)){const tr=document.createElement('tr');cells(tr,[r.fecha,r.concepto,r.origen,r.unidades? r.unidades+' unidades':r.turnos? r.turnos+' / '+r.horas+' h':'—',r.unidades?money(r.costo):'—',money(r.efectivo),money(r.transferencia),money(r.monto)]);body.append(tr);}
  const totals=rows.reduce((a,r)=>{for(const k of ['efectivo','transferencia','monto'])a[k]+=Math.round(Number(r[k]||0)*100);return a;},{efectivo:0,transferencia:0,monto:0}),tr=document.createElement('tr');
  cells(tr,['Totales','','','','',money(totals.efectivo/100),money(totals.transferencia/100),money(totals.monto/100)]);foot.append(tr);
  buttons[1].hidden=limit>=rows.length;
  status.textContent='Total de '+rows.length+' registros. Mostrando '+Math.min(limit,rows.length)+'.';
 }
 function clear(){version++;data=null;rows=[];query('tbody').replaceChildren();query('tfoot').replaceChildren();buttons[1].hidden=true;status.textContent='Seleccioná el período.';buttons[0].disabled=false;}
 buttons[0].onclick=async()=>{
  if(!from.value||!to.value||from.value>to.value){status.textContent='Elegí un período válido.';return;}
  data=null;const request=++version;club=window.CLUB_DOC_ID_ACTUAL;const currentClub=club;
  buttons[0].disabled=true;status.textContent='Cargando';
  try{const result=await window.cargarInformeNumerico(from.value,to.value);if(request!==version||currentClub!==window.CLUB_DOC_ID_ACTUAL)return;data=result;collect();}
  catch(e){if(request===version){query('tbody').replaceChildren();query('tfoot').replaceChildren();status.textContent=e.message;}}
  finally{if(request===version)buttons[0].disabled=false;}
 };
 select.onchange=()=>{if(data&&club===window.CLUB_DOC_ID_ACTUAL)collect();};
 buttons[1].onclick=()=>{limit+=50;render();};
 from.onchange=to.onchange=clear;
 window.addEventListener('pric-session-ended',clear);
 window.addEventListener('pric-view-change',()=>{if(club&&club!==window.CLUB_DOC_ID_ACTUAL)clear();});
});
})();
