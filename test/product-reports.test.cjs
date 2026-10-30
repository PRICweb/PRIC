const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const reports=require('../product-reports'),receipts=require('../turn-receipts');
test('turn and class products are counted once across partial payments and annulments',()=>{
 const r={id:'r',fecha:'2026-10-27',consumos:[{nombre:'Agua',precio:100},{nombre:'Agua',precio:100}]};
 const first=receipts.record({id:'a',r,date:r.fecha,cash:50,transfer:50});r.consumosCobrados={Agua:100};
 const second=receipts.record({id:'b',r,date:r.fecha,cash:100,transfer:300});r.consumosCobrados={Agua:200};
 const third=receipts.record({id:'c',r,date:r.fecha,cash:500});
 const rows=reports.productIncome([{tipo:'venta_producto',monto:40,efectivo:40}], [first,second,third,{...first,id:'annulled',anulado:true}]);
 assert.equal(rows.reduce((sum,x)=>sum+x.monto,0),240);
 assert.deepEqual([first,second,third].map(x=>reports.splitReceipt(x).products.monto),[100,100,0]);
 for(const receipt of [first,second,third]){const {products,service}=reports.splitReceipt(receipt);for(const field of ['efectivo','transferencia','monto'])assert.equal(Math.round((products[field]+service[field])*100),Math.round(receipt[field]*100));}
 const classroom={...first,tipo:'clase'};assert.equal(reports.productIncome([], [classroom])[0].monto,100);
});
test('margin preserves product IDs, sale price and historical unit costs, without current inventory values',()=>{
 const occurrence={id:'r@2026-10-27',reservaId:'r',fecha:'2026-10-27',total:1000,consumos:[{prodId:'water',nombre:'Agua',precio:100,costoUnitario:40},{prodId:'water',nombre:'Agua',precio:150,costoUnitario:50},{prodId:'missing',nombre:'Sin costo',precio:100}]};
 const lines=reports.turnLines([occurrence,occurrence]);assert.equal(lines.length,3);assert.equal(lines.reduce((sum,x)=>sum+x.cantidad,0),3);assert.equal(lines.reduce((sum,x)=>sum+x.monto,0),350);assert.equal(lines[0].productoId,'water');assert.equal(lines[0].costoUnitario,40);assert.equal(lines[2].costoUnitario,null);
 const discounted=reports.turnLines([{...occurrence,total:100}]);assert.equal(discounted.reduce((sum,x)=>sum+Math.round(x.monto*100),0),10000);
 assert.equal(reports.turnLines([{...occurrence,consumos:[]}]).length,0);
});
test('numeric income reports separate product money from court and teacher receipts',()=>{
 const window={PricProductReports:reports},document={addEventListener(){}};let source=fs.readFileSync(__dirname+'/../numeric-reports.js','utf8').replace("document.addEventListener('DOMContentLoaded'","window.testRows=rowsFor;document.addEventListener('DOMContentLoaded'");vm.runInNewContext(source,{window,document,Intl});
 const data={movimientos:[{tipo:'venta_producto',efectivo:30,transferencia:70}],pagos:[{tipo:'turno',efectivo:300,transferencia:700,consumosAgrupados:[{nombre:'Agua',total:200}]},{tipo:'clase',efectivo:100,transferencia:100,consumosAgrupados:[{nombre:'Agua',total:100}]},{tipo:'turno',anulado:true,efectivo:50,consumosAgrupados:[{total:50}]}]};
 const total=key=>window.testRows(data,key).reduce((sum,x)=>sum+Number(x.efectivo||0)+Number(x.transferencia||0),0);
 assert.equal(total('ventas'),400);assert.equal(total('turnos'),800);assert.equal(total('profesores'),100);assert.equal(total('ventas')+total('turnos')+total('profesores'),1300);
 const legacy=window.testRows({movimientos:[{tipo:'venta_producto',monto:125,efectivo:0,transferencia:0},{tipo:'venta_producto',monto:900,anulado:true}],pagos:[]},'ventas')[0];assert.equal(legacy.monto,125);assert.equal(legacy.efectivo,0);assert.equal(legacy.transferencia,0);assert.equal(legacy.sinDesglose,true);
});
test('annulled receipts contribute neither service nor product income',()=>{
 const result=reports.splitReceipt({anulado:true,efectivo:400,transferencia:600,consumosAgrupados:[{total:200}]});
 for(const row of Object.values(result))for(const field of ['efectivo','transferencia','monto'])assert.equal(row[field],0);
});

test('credit sale has margin value but is only cash income when collected',()=>{const movements=[{tipo:'venta_producto',esVentaCredito:true,monto:0,importeVenta:180,cantidad:2},{tipo:'ingreso_libre',subtipoAjuste:'cobro_cuenta_corriente',monto:200,efectivo:80,transferencia:120,importeProductos:150,importeTurnos:50}];const rows=reports.productIncome(movements,[]);assert.equal(rows.length,1);assert.equal(rows[0].monto,150);assert.equal(rows[0].efectivo,60);assert.equal(rows[0].transferencia,90);assert.equal(reports.collectionPart(movements[1],'importeTurnos').monto,50);});
