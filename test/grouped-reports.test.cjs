const{test}=require('node:test'),assert=require('node:assert/strict'),R=require('../grouped-reports'),P=require('../product-reports');
const data={ocurrencias:[{id:'p@2026-11-03',reservaId:'p',fecha:'2026-11-03',modalidad:'outdoor',jugador:'Cliente',hora:'17:00',cancha:'7',duracion:90,esClase:false},{id:'t@2026-11-03',reservaId:'t',fecha:'2026-11-03',modalidad:'tenis_outdoor',jugador:'Profe',hora:'18:00',cancha:'3',duracion:60,esClase:true}],pagos:[{tipo:'turno',reservaId:'p',fechaTurno:'2026-11-03',fecha:'2026-11-03',monto:1300,efectivo:300,transferencia:1000,consumosAgrupados:[{total:500}]},{tipo:'clase',reservaId:'t',fechaTurno:'2026-11-03',fecha:'2026-11-03',monto:900,efectivo:900,consumosAgrupados:[{total:100}]}],movimientos:[{tipo:'ingreso_libre',subtipoAjuste:'cobro_cuenta_corriente',cobroCtaCteId:'cc',fecha:'2026-11-03',monto:300,efectivo:100,transferencia:200,operaciones:['turn:p@2026-11-03'],importeProductos:100,importeTurnos:200,desgloseCtaCte:{productos:{montoCentavos:10000,efectivoCentavos:0,transferenciaCentavos:10000},turnos:{montoCentavos:20000,efectivoCentavos:10000,transferenciaCentavos:10000}}},{tipo:'venta_producto',fecha:'2026-11-03',productoId:'p',productoNombre:'Agua',monto:200,efectivo:200},{tipo:'venta_producto',esVentaCredito:true,fecha:'2026-11-03',monto:999},{tipo:'stock',fecha:'2026-11-03',productoId:'agua',productoNombre:'Agua',cantidad:2,monto:180,efectivo:180},{tipo:'stock',fecha:'2026-11-03',productoId:'agua',productoNombre:'Agua',cantidad:1,monto:120,transferencia:120},{tipo:'stock',fecha:'2026-11-04',productoId:'agua',productoNombre:'Agua',cantidad:1,monto:200,efectivo:200},{tipo:'egreso',subtipoAjuste:'ajuste_caja',fecha:'2026-11-03',titulo:'Faltante',monto:50,efectivo:50},{tipo:'ingreso_libre',fecha:'2026-11-03',titulo:'Evento',monto:40,efectivo:40}]};
const build=key=>R.build(data,key,P);
test('court, combined and teacher groups count each occupied turn once and separate modalities and products',()=>{const service=build('turnos:padel');assert.equal(service.totals.monto,1000);assert.equal(service.totals.turnos,1);assert.equal(service.totals.horas,1.5);assert.equal(service.totals.efectivo+service.totals.transferencia,1000);assert.equal(build('combinado:outdoor').totals.monto,1600);assert.equal(build('turnos:indoor').rows.length,0);const teachers=build('profesores:tenis');assert.equal(teachers.totals.monto,800);assert.equal(teachers.totals.turnos,1);assert.equal(teachers.totals.horas,1);assert.equal(build('turnos:tenis').totals.monto,0);});
test('sales channels exclude unpaid credit and keep credit products out of counter income',()=>{assert.equal(build('ventas:turnos').totals.monto,600);assert.equal(build('ventas:caja').totals.monto,200);assert.equal(build('ventas:ctacte').totals.monto,100);});
test('purchases retain product and day, quantity-weighted net costs and amounts',()=>{const r=build('compras:costo');assert.equal(r.rows.length,2);assert.equal(r.rows[0].unidades,3);assert.equal(r.rows[0].costo,100);assert.equal(r.rows[0].monto,300);assert.equal(r.totals.unidades,4);assert.equal(r.totals.monto,500);assert.equal(r.totals.costo,125);});
test('adjustments show signed amounts and actual concepts without mixing merchandise or credit collections',()=>{const r=build('ajustes:ajuste_caja');assert.equal(r.totals.monto,-50);assert.equal(r.rows[0].concepto,'Faltante');assert.equal(build('ajustes:ingreso_libre').totals.monto,40);});
test('one catalog serves tables and charts and daily chart totals reconcile',()=>{assert.deepEqual(R.groups.map(x=>x.label),['Turnos','Turnos + Ventas','Ocasiones especiales','Ventas','Profesores','Ajustes','Compras','Empleados']);const r=build('combinado:padel'),days=R.daily(r);assert.equal(days[0].monto,r.totals.monto);assert.equal(days[0].turnos,1);assert.equal(days[0].horas,1.5);});

test('credit collections keep the original debt day even if the turn occupies a different day',()=>{const d=structuredClone(data);d.movimientos[0].fecha='2026-11-02';const r=R.build(d,'combinado:padel',P);assert.equal(r.rows.find(x=>x.fecha==='2026-11-02').monto,300);assert.equal(r.rows.find(x=>x.fecha==='2026-11-02').turnos,0);assert.equal(r.rows.find(x=>x.fecha==='2026-11-03').monto,1300);assert.equal(r.totals.turnos,1);assert.equal(r.totals.horas,1.5);});
test('retained credit receipts stay in credit sales rather than shifting to direct turn sales',()=>{const d={...data,movimientos:[],pagos:[{...data.pagos[0],reclasificadoCtaCte:true,fecha:'2026-11-02'}]};assert.equal(R.build(d,'ventas:turnos',P).totals.monto,0);assert.equal(R.build(d,'ventas:ctacte',P).totals.monto,500);assert.equal(R.build(d,'turnos:padel',P).rows.find(x=>x.fecha==='2026-11-02').monto,800);});

test('extraordinary income collected from credit appears only as the other-income portion',()=>{const r={tipo:'ingreso_libre',subtipoAjuste:'cobro_cuenta_corriente',cobroCtaCteId:'p',ventaId:'cc',fecha:'2026-11-03',detalle:'Cobro de evento',monto:100,efectivo:40,transferencia:60,importeOtros:70,importeProductos:30,desgloseCtaCte:{otros:{montoCentavos:7000,efectivoCentavos:2800,transferenciaCentavos:4200},productos:{montoCentavos:3000,efectivoCentavos:1200,transferenciaCentavos:1800}}},d={movimientos:[r],pagos:[],ocurrencias:[]},income=R.build(d,'ajustes:ingreso_libre',P),goods=R.build(d,'ventas:ctacte',P);assert.equal(income.totals.monto,70);assert.equal(income.totals.efectivo,28);assert.equal(income.totals.transferencia,42);assert.equal(goods.totals.monto,30);assert.equal(income.rows[0].concepto,'Cobro de evento');});

test('turn product sales filter by effective modality and use configured court names',()=>{const data={ocurrencias:[{id:'r@2026-11-04',fecha:'2026-11-04',modalidad:'outdoor',cancha:'1',canchaNombre:'Orbit exterior',duracion:60}],pagos:[{reservaId:'r',fecha:'2026-11-04',fechaTurno:'2026-11-04',tipo:'turno',modalidad:'indoor',monto:300,efectivo:300,consumosAgrupados:[{nombre:'Agua',total:100}]}]};const reports=require('../grouped-reports'),products=require('../product-reports');assert.equal(reports.build(data,'ventas:turnos_indoor',products).totals.monto,0);for(const key of ['ventas:turnos_outdoor','ventas:turnos_padel','ventas:turnos']){const result=reports.build(data,key,products);assert.equal(result.totals.monto,100);assert.match(result.rows[0].concepto,/Orbit exterior/);}});

test('indoor sales separate product receipts from court payments and legacy deposits',()=>{
 const date='2026-11-04',base={reservaId:'r',fecha:date,fechaTurno:date,tipo:'turno',modalidad:'indoor'};
 const rows=[{...base,transferencia:400,esSena:true,consumosAgrupados:[{nombre:'Agua',total:400}]},{...base,efectivo:700,consumosAgrupados:[{nombre:'Agua',total:100}]}];
 const report={pagos:rows};
 assert.equal(R.build(report,'ventas:turnos_indoor',P).totals.monto,100);
 assert.equal(R.build(report,'turnos:indoor',P).totals.monto,1000);
 assert.equal(R.build(report,'combinado:indoor',P).totals.monto,1100);
});

test('special occasions and classes do not contribute to regular booking reports',()=>{
 const date='2026-11-04';
 const rows=['Normal','Clases','Especial'].map((tipoEvento,i)=>({id:i+'@'+date,fecha:date,tipoEvento,esClase:i===1,modalidad:'indoor',duracion:60}));
 const pagos=rows.map((o,i)=>({reservaId:String(i),fecha:date,fechaTurno:date,tipo:i===1?'clase':'turno',efectivo:100,modalidad:'indoor'}));
 for(const key of ['turnos:indoor','combinado:indoor','profesores:indoor']){
  const result=R.build({ocurrencias:rows,pagos},key,P);
  assert.equal(result.totals.turnos,1);
  assert.equal(result.totals.monto,100);
 }
});

test('Registros reads each main group once without duplicate modality subtotals',()=>{
 const totals=Object.fromEntries(R.groups.map(g=>[g.label,R.records(data,g.label,P).reduce((s,r)=>s+Math.round(r.monto*100),0)/100]));
 assert.equal(totals.Turnos,1000);assert.equal(totals['Turnos + Ventas'],1600);
 assert.equal(totals.Profesores,800);assert.equal(totals.Ventas,900);
 assert.equal(totals.Compras,500);assert.equal(totals.Ajustes,-10);
 const purchases=R.records(data,'Compras',P);
 assert.equal(purchases[0].unidades,3);assert.equal(purchases[0].costo,100);
 for(const group of R.groups){
  const rows=R.records(data,group.label,P);
  for(const row of rows)assert.equal(Math.round((Number(row.efectivo||0)+Number(row.transferencia||0))*100),Math.round(row.monto*100));
 }
});

test('record summary groups modalities and product costs while retaining full totals beyond the first fifty details',()=>{
 const rows=Array.from({length:57},(_,i)=>({origen:i%2?'Pádel in':'Pádel out',categoriaRegistro:'En turnos',modalidad:i%2?'indoor':'outdoor',concepto:'Cancha '+i,turnos:1,horas:1.5,efectivo:500,transferencia:1000,monto:1500}));
 const summary=R.recordSummary(rows,'Turnos');
 assert.equal(summary.rows.length,2);assert.equal(summary.totals.turnos,57);assert.equal(summary.totals.horas,85.5);assert.equal(summary.totals.monto,85500);
 for(const field of ['efectivo','transferencia','monto','turnos','horas'])assert.equal(summary.rows.reduce((s,r)=>s+r[field],0),summary.totals[field]);
 const purchases=R.recordSummary([{concepto:'Agua',unidades:2,monto:200,efectivo:200},{concepto:'Agua',unidades:1,monto:400,transferencia:400}],'Compras');
 assert.equal(purchases.rows.length,1);assert.equal(purchases.rows[0].costo,200);assert.equal(purchases.rows[0].unidades,3);
 const channels=R.recordSummary([{...rows[0],categoriaRegistro:'En caja'},{...rows[0],categoriaRegistro:'En Cta Cte'}],'Ventas');
 assert.equal(channels.rows.length,2);
});
