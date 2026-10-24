(function(root){
 'use strict';
 const cents=v=>{const n=Number(v??0),result=Math.round(n*100);if(!Number.isFinite(n)||!Number.isSafeInteger(result))throw Error('Importe inválido.');return result;};
 function timeOf(value){if(!value)return '—';if(/^\d{2}:\d{2}(?::\d{2})?$/.test(String(value)))return String(value).slice(0,5);const date=new Date(value);return Number.isNaN(date.getTime())?'—':new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(date);}
 // Account families are reusable; product and concept subaccounts retain their own names.
 const accountTypes=Object.freeze({Activo:'debe',Pasivo:'haber',Capital:'haber',Ganancia:'haber','Pérdida':'debe',RegularizadoraActivo:'haber',RegularizadoraPasivo:'debe',Pendiente:'debe'});
 const catalog=Object.freeze([
  ['caja','Caja','Activo'],['bancos','Transferencia / Bancos','Activo'],['clientes','Créditos por ventas','Activo'],['mercaderias','Mercaderías','Activo'],['anticipos_proveedores','Anticipos a proveedores','Activo'],['bienes_uso','Bienes de uso','Activo'],['amortizacion_acumulada','Amortización acumulada','RegularizadoraActivo'],['creditos_fiscales','Créditos fiscales','Activo'],
  ['proveedores','Proveedores','Pasivo'],['obligaciones','Obligaciones por pagar','Pasivo'],['prestamos','Préstamos por pagar','Pasivo'],['anticipos_clientes','Anticipos de clientes','Pasivo'],['impuestos_pagar','Impuestos por pagar','Pasivo'],['remuneraciones_pagar','Remuneraciones por pagar','Pasivo'],
  ['capital','Capital aportado','Capital'],['resultados_acumulados','Resultados acumulados','Capital'],['retiros','Retiros de capital','Capital'],
  ['ventas','Ventas','Ganancia'],['turnos','Ingresos por turnos','Ganancia'],['clases','Ingresos por clases','Ganancia'],['otros_ingresos','Ingresos','Ganancia'],['ajuste_positivo','Ajustes positivos de venta','Ganancia'],['intereses_ganados','Intereses ganados','Ganancia'],
  ['costo_ventas','Costo de ventas','Pérdida'],['egresos','Egresos','Pérdida'],['ajuste_negativo','Ajustes negativos de venta','Pérdida'],['alquiler','Alquileres','Pérdida'],['servicios','Servicios','Pérdida'],['sueldos','Sueldos','Pérdida'],['mantenimiento','Mantenimiento','Pérdida'],['comisiones','Comisiones y costos de cobro','Pérdida'],['impuestos','Impuestos y tasas','Pérdida'],['intereses_perdidos','Intereses perdidos','Pérdida'],['amortizaciones','Amortizaciones','Pérdida'],['mermas','Mermas y pérdidas de mercaderías','Pérdida'],['devoluciones','Devoluciones y bonificaciones','Pérdida'],
  ['ajuste_efectivo_positivo','Ajuste positivo en efectivo','Ganancia'],['ajuste_efectivo_negativo','Ajuste negativo en efectivo','Pérdida'],['ajuste_transferencia_positivo','Ajuste positivo en transferencia','Ganancia'],['ajuste_transferencia_negativo','Ajuste negativo en transferencia','Pérdida'],
  ['pendiente','Medio de pago pendiente de clasificación','Pendiente']
 ].map(([id,nombre,tipo])=>Object.freeze({id,nombre,tipo,naturaleza:accountTypes[tipo]})));
 function posting(accountId,change,amount,detail=''){
  const account=catalog.find(a=>a.id===accountId);if(!account)throw Error('Cuenta desconocida.');if(!['aumento','disminucion'].includes(change))throw Error('Variación de cuenta inválida.');if(!Number.isSafeInteger(amount)||amount<=0)throw Error('El importe debe ser positivo y estar expresado en centavos.');
  const lado=change==='aumento'?account.naturaleza:account.naturaleza==='debe'?'haber':'debe';
  return {cuenta:account.nombre+(detail?' · '+detail:''),cuentaId:account.id,tipo:account.tipo,naturaleza:account.naturaleza,lado,debe:lado==='debe'?amount:0,haber:lado==='haber'?amount:0};
 }
 const accountLabel=line=>line.cuenta.startsWith('Ventas · ')?'Mercadería · '+line.cuenta.slice('Ventas · '.length):/^Ajuste (positivo|negativo) en /.test(line.cuenta)?line.cuenta.replace(/^Ajuste (positivo|negativo) en /,'Ajuste '):line.cuenta.replace(/^Mercaderías · /,'Mercadería · ');
 function financeGroups(transactions){const groups=new Map(),result=[];for(const t of transactions){if(!t.reservaId||!['turno','clase'].includes(t.tipo)){result.push({item:t,children:[]});continue;}const key=t.reservaId+'|'+t.fechaTurno;if(!groups.has(key)){const court=t.cancha||String(t.turnoReferencia||t.detalle||'').match(/Cancha\s+([^·]+)/i)?.[1]?.trim()||'sin identificar';const reference=String(t.turnoReferencia||t.detalle||'').replace(/\s*·\s*Cancha\s+[^·]+/i,'');const group={item:{...t,id:'group-'+key,detalle:(t.tipo==='clase'?'Pago clase · cancha ':'Pago cancha ')+court+(reference?' · '+reference:''),efectivo:0,transferencia:0,monto:0},children:[]};groups.set(key,group);result.push(group);}const group=groups.get(key);group.children.push(t);for(const field of ['efectivo','transferencia','monto'])group.item[field]=(cents(group.item[field])+cents(t[field]))/100;}return result;}
 function ordered(items,direction='desc'){
  const groups=new Map();
  for(const item of items){const key=String(item.fecha||'')+'|'+(item.ventaId?'sale:'+item.ventaId:'row:'+item.id);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);}
  const stamp=t=>{const hour=timeOf(t.horaAsiento||t.fechaRegistro||t.fechaPagoRegistro);const parsed=Date.parse(t.fechaRegistro||t.fechaPagoRegistro||'');return {hour:hour==='—'?'':hour,parsed:Number.isFinite(parsed)?parsed:0};};
  const anchor=group=>group.find(t=>!t.ajusteVenta)||group[0];
  return [...groups.values()].sort((a,b)=>{const x=anchor(a),y=anchor(b),sx=stamp(x),sy=stamp(y);const result=String(x.fecha).localeCompare(String(y.fecha))||sx.hour.localeCompare(sy.hour)||(sx.parsed&&sy.parsed?sx.parsed-sy.parsed:0)||String(x.ventaId||x.id).localeCompare(String(y.ventaId||y.id));return direction==='asc'?result:-result;}).flatMap(group=>group.sort((a,b)=>Number(!!a.ajusteVenta)-Number(!!b.ajusteVenta)||String(a.id).localeCompare(String(b.id))));
 }
 function build(transactions,date){
  const entries=[],warnings=new Set();let source=null;
  const add=(id,description,lines,margin=null)=>{const filtered=lines.filter(line=>line.debe||line.haber).sort((a,b)=>Number(a.lado==='haber')-Number(b.lado==='haber'));if(!filtered.length)return;const debit=filtered.reduce((s,l)=>s+l.debe,0),credit=filtered.reduce((s,l)=>s+l.haber,0);if(debit!==credit)throw Error('Asiento desbalanceado: '+description);entries.push({id,description,time:timeOf(source?.horaAsiento||source?.fechaRegistro||source?.fechaPagoRegistro),lines:filtered,debit,credit,margin});};
  const line=(cuenta,tipo,debe=0,haber=0)=>{if(!Number.isSafeInteger(debe)||!Number.isSafeInteger(haber)||debe<0||haber<0||(debe&&haber))throw Error('Cargo o abono inválido.');const account=catalog.find(a=>cuenta===a.nombre||cuenta.startsWith(a.nombre+' · '));if(!account)throw Error('Cuenta sin definir: '+cuenta);return {cuenta,cuentaId:account.id,tipo:account.tipo,naturaleza:account.naturaleza,lado:debe?'debe':'haber',debe,haber};};
  const payment=(t,out)=>{const total=Math.abs(cents(t.monto)),cash=Math.abs(cents(t.efectivo)),transfer=Math.abs(cents(t.transferencia));const result=[line('Caja','Activo',out?0:cash,out?cash:0),line('Transferencia / Bancos','Activo',out?0:transfer,out?transfer:0)];const remainder=total-cash-transfer;if(remainder<0)throw Error('Los medios de pago superan el monto: '+t.detalle);if(remainder){warnings.add('Hay movimientos sin medio de pago registrado: su contrapartida queda pendiente de clasificación.');result.push(line('Medio de pago pendiente de clasificación','Pendiente',out?0:remainder,out?remainder:0));}return result;};
  const reference=t=>t.turnoReferencia||[String(t.detalle||'').replace(/^Turno:\s*/,''),t.fechaTurno,t.horaTurno].filter(Boolean).join(' · ')||t.id;
  const revenue=(t,amount)=>{let remaining=amount;const result=[];for(const group of t.consumosAgrupados||[]){const value=Math.min(remaining,Math.abs(cents(group.total)));if(value)result.push(line('Ventas · '+group.nombre,'Ganancia',0,value));remaining-=value;}if(remaining)result.push(line((t.tipo==='clase'?'Ingresos por clases':'Ingresos por turnos')+' · '+reference(t),'Ganancia',0,remaining));return result;};
  const rows=ordered(transactions,'asc').filter(t=>t.fecha===date);
  const saleGroups=new Map(),processedSales=new Set();for(const t of rows)if(t.ventaId){if(!saleGroups.has(t.ventaId))saleGroups.set(t.ventaId,[]);saleGroups.get(t.ventaId).push(t);}
  const releases=transactions.filter(t=>(t.tipo==='turno'||t.tipo==='clase')&&t.fecha<date&&t.fechaTurno===date).map(t=>({...t,id:t.id+'-devengo',tipo:'aplicacion_anticipo',tipoOrigen:t.tipo,fecha:date,horaAsiento:t.horaTurno||null,fechaRegistro:null,fechaPagoRegistro:null}));
  for(const t of ordered([...rows,...releases],'asc')){
   source=t;
   const amount=Math.abs(cents(t.monto)),expense=Number(t.monto)<0,description=t.detalle||t.titulo||'Movimiento',id=t.id,product=t.productoNombre||t.nombreProducto||description.replace(/^Venta mostrador:\s*/,'').replace(/ x\d+$/,'');
   if(t.ventaId){const group=saleGroups.get(t.ventaId),sales=group.filter(p=>p.tipo==='venta_producto'&&!p.ajusteVenta);if(sales.length){if(processedSales.has(t.ventaId))continue;processedSales.add(t.ventaId);const changes=group.filter(p=>p.ajusteVenta),change=channel=>changes.reduce((sum,p)=>sum+(Number(p.monto)<0?-1:1)*Math.abs(cents(p[channel])),0),cashChange=change('efectivo'),transferChange=change('transferencia'),cash=sales.reduce((s,p)=>s+Math.abs(cents(p.efectivo)),0)+cashChange,transfer=sales.reduce((s,p)=>s+Math.abs(cents(p.transferencia)),0)+transferChange;
    if(cash<0||transfer<0)throw Error('La venta tiene un ajuste incompatible con sus pagos.');const lines=[line('Caja','Activo',cash),line('Transferencia / Bancos','Activo',transfer)];let margin=0,known=true;
    for(const item of sales){const name=item.productoNombre||item.nombreProducto||String(item.detalle||item.titulo||'Producto').replace(/^Venta mostrador:\s*/,'').replace(/ x\d+$/,''),value=Math.abs(cents(item.monto)),quantity=Number(item.cantidad??1);if(!Number.isSafeInteger(quantity)||quantity<1)throw Error('Cantidad vendida inválida.');lines.push(line('Ventas · '+name,'Ganancia',0,value));if(item.costoUnitario!==undefined&&item.costoUnitario!==null&&Number.isFinite(Number(item.costoUnitario))&&Number(item.costoUnitario)>=0){const cost=cents(item.costoUnitario)*quantity;lines.push(line('Costo de ventas · '+name,'Pérdida',cost),line('Mercaderías · '+name,'Activo',0,cost));margin+=value-cost;}else{known=false;warnings.add('Hay ventas sin costo histórico: el margen de esos productos no se puede determinar.');}}
    for(const [channel,delta]of [['efectivo',cashChange],['transferencia',transferChange]])if(delta)lines.push(line('Ajuste '+(delta>0?'positivo':'negativo')+' en '+channel,delta>0?'Ganancia':'Pérdida',delta<0?-delta:0,delta>0?delta:0));source=sales[0];add(sales[0].id,sales.map(s=>s.detalle||s.titulo).join(' · '),lines,known?margin:null);continue;
   }}
   if(t.tipo==='consumo_costo'){
    if(t.costoUnitario===undefined||t.costoUnitario===null){warnings.add('Hay consumos sin costo histórico: su costo y margen no se pueden determinar.');continue;}
    const quantity=Number(t.cantidad??1);if(!Number.isSafeInteger(quantity)||quantity===0||(!t.esReversion&&quantity<0))throw Error('Cantidad de consumo inválida.');const cost=cents(t.costoUnitario)*Math.abs(quantity);add(id,description,quantity<0?[line('Mercaderías · '+t.productoNombre,'Activo',cost),line('Costo de ventas · '+t.productoNombre,'Pérdida',0,cost)]:[line('Costo de ventas · '+t.productoNombre,'Pérdida',cost),line('Mercaderías · '+t.productoNombre,'Activo',0,cost)]);continue;
   }
   if(t.tipo==='aplicacion_anticipo'){const original={...t,tipo:t.tipoOrigen};add(id,description+' · aplicación del anticipo',[line('Anticipos de clientes · '+reference(t),'Pasivo',amount),...revenue(original,amount)]);continue;}
   if(!amount&&t.tipo!=='venta_producto')continue;
   if(t.tipo==='stock'){
    add(id,description,[line('Mercaderías · '+(t.productoNombre||t.productoId||description.replace(/^Reposición:\s*/,'')),'Activo',amount),...payment(t,true)]);continue;
   }
   if(t.tipo==='venta_producto'){
    const lines=[...payment(t,false),line('Ventas · '+product,'Ganancia',0,amount)];let margin=null;
    const quantity=Number(t.cantidad??1);if(!Number.isSafeInteger(quantity)||quantity<1)throw Error('Cantidad vendida inválida.');
    if(t.costoUnitario!==undefined&&t.costoUnitario!==null&&Number.isFinite(Number(t.costoUnitario))&&Number(t.costoUnitario)>=0){const cost=cents(t.costoUnitario)*quantity;lines.push(line('Costo de ventas · '+product,'Pérdida',cost),line('Mercaderías · '+product,'Activo',0,cost));margin=amount-cost;}
    else warnings.add('Hay ventas sin costo histórico: el margen de esos productos no se puede determinar.');
    add(id,description,lines,margin);continue;
   }
   if((t.tipo==='turno'||t.tipo==='clase')&&t.fechaTurno>date){
    add(id,description+' · cobro anticipado',[...payment(t,false),line('Anticipos de clientes · '+reference(t),'Pasivo',0,amount)]);continue;
   }
   if(t.tipo==='turno'||t.tipo==='clase'){add(id,description,[...payment(t,false),...revenue(t,amount)]);continue;}
   const selected=t.cuentaContable?catalog.find(a=>a.id===t.cuentaContable):null;if(t.cuentaContable&&!selected)throw Error('Cuenta contable desconocida en '+description);
   const account=t.ajusteVenta?(expense?'Ajustes negativos de venta':'Ajustes positivos de venta'):selected?selected.nombre+' · '+description:expense?'Egresos · '+description:'Ingresos · '+description;
   add(id,description,expense?[line(account,'Pérdida',amount),...payment(t,true)]:[...payment(t,false),line(account,'Ganancia',0,amount)]);
  }
  const lines=entries.flatMap(e=>e.lines),debit=lines.reduce((s,l)=>s+l.debe,0),credit=lines.reduce((s,l)=>s+l.haber,0),income=lines.filter(l=>l.tipo==='Ganancia').reduce((s,l)=>s+l.haber-l.debe,0),loss=lines.filter(l=>l.tipo==='Pérdida').reduce((s,l)=>s+l.debe-l.haber,0);
  const netAccount=id=>lines.filter(l=>l.cuentaId===id).reduce((s,l)=>s+l.debe-l.haber,0);
  return {entries,warnings:[...warnings],debit,credit,income,loss,result:income-loss,complete:warnings.size===0,cash:netAccount('caja'),transfer:netAccount('bancos'),productSales:lines.filter(l=>l.cuentaId==='ventas').reduce((s,l)=>s+l.haber-l.debe,0),turnCollections:rows.filter(t=>t.tipo==='turno').reduce((s,t)=>s+cents(t.monto),0),classCollections:rows.filter(t=>t.tipo==='clase').reduce((s,t)=>s+cents(t.monto),0)};
 }
 const api={ordered,build,catalog,accountTypes,posting,accountLabel,timeOf,financeGroups};if(typeof module!=='undefined'&&module.exports)module.exports=api;if(root)root.PricJournal=api;
})(typeof window!=='undefined'?window:null);
