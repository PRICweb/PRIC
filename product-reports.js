(function(root){
 'use strict';
 const proportion=(amount,weight,total)=>total?Number((BigInt(amount)*BigInt(weight)+BigInt(Math.floor(total/2)))/BigInt(total)):0;

 const cents=value=>Math.round((Number(value)||0)*100);
 const amount=row=>Number(row.monto??row.importe??(Number(row.efectivo||0)+Number(row.transferencia||0)));
 function splitReceipt(receipt){
  const cash=receipt.anulado?0:Math.max(0,cents(receipt.efectivo)),transfer=receipt.anulado?0:Math.max(0,cents(receipt.transferencia)),total=cash+transfer;
  const goods=receipt.anulado?0:Math.min(total,Math.max(0,(receipt.consumosAgrupados||[]).reduce((sum,item)=>sum+Math.max(0,cents(item.total)),0)));
  const productCash=total?Math.min(cash,proportion(goods,cash,total)):0,productTransfer=goods-productCash;
  const adjustment=receipt.anulado?0:Math.min(total-goods,Math.max(0,cents(receipt.importeAjuste))),service=total-goods-adjustment,serviceCash=total?proportion(goods+service,cash,total)-productCash:0;
  return {products:{...receipt,tipo:'venta_producto',efectivo:productCash/100,transferencia:productTransfer/100,monto:goods/100},service:{...receipt,efectivo:serviceCash/100,transferencia:(service-serviceCash)/100,monto:service/100},adjustment:{...receipt,tipo:'ingreso_libre',ajusteVenta:true,efectivo:(cash-productCash-serviceCash)/100,transferencia:(transfer-productTransfer-service+serviceCash)/100,monto:adjustment/100}};
 }
 function turnLines(occurrences){
  const result=[],seen=new Set();
  for(const occurrence of occurrences||[]){
   const key=occurrence.id||occurrence.reservaId+'@'+occurrence.fecha;if(seen.has(key))continue;seen.add(key);
   const products=occurrence.consumos||[],gross=products.reduce((sum,item)=>sum+Math.max(0,cents(item.precio)),0);
   // Receipts allocate collections to goods first: a general discount reduces
   // the court charge first, and only its excess reduces product revenue.
   const adjustedGross=Math.max(0,gross-cents(occurrence.descuentoConsumosCtaCte));const net=Number.isFinite(Number(occurrence.total))?Math.min(adjustedGross,Math.max(0,cents(occurrence.total))):adjustedGross;
   let allocated=0,accumulated=0;
   products.forEach((item,index)=>{
    const quantity=Number(item.cantidad||1);if(quantity<=0)return;
    accumulated+=Math.max(0,cents(item.precio));const target=gross?proportion(net,accumulated,gross):0,amount=target-allocated;allocated=target;
    result.push({id:'turn-product:'+key+':'+index,tipo:'venta_producto',origen:'consumo_turno',reservaId:occurrence.reservaId,fecha:occurrence.fecha,productoId:item.prodId||undefined,productoNombre:item.nombre||'Producto',cantidad:quantity,monto:amount/100,costoUnitario:item.costoUnitario??null});
   });
  }
  return result;
 }
 function collectionPart(row,field){const names=['importeProductos','importeTurnos','importeClases','importeOtros'],key=({importeProductos:'productos',importeTurnos:'turnos',importeClases:'clases',importeOtros:'otros'})[field],exact=row.desgloseCtaCte?.[key];if(exact)return {...row,efectivo:exact.efectivoCentavos/100,transferencia:exact.transferenciaCentavos/100,monto:exact.montoCentavos/100};const total=cents(row.monto),cash=cents(row.efectivo),index=names.indexOf(field),before=Math.min(total,names.slice(0,index).reduce((sum,k)=>sum+Math.max(0,cents(row[k])),0)),part=Math.max(0,Math.min(total-before,cents(row[field]))),productCash=total?proportion(before+part,cash,total)-proportion(before,cash,total):0;return {...row,efectivo:productCash/100,transferencia:(part-productCash)/100,monto:part/100};}
 function counterIncome(movements){const groups=new Map();for(const row of movements||[])if(!row.anulado&&row.tipo==='venta_producto'&&!row.esVentaCredito){const key=row.ventaId||row.id||row;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}const result=[];for(const [key,rows]of groups){const adjustments=(movements||[]).filter(x=>!x.anulado&&x.ajusteVenta&&x.ventaId===key),invoice=rows.reduce((s,x)=>s+cents(amount(x)),0);if(!adjustments.length||!rows.every(x=>Math.abs(cents(amount(x))-cents(x.efectivo)-cents(x.transferencia))<=1)){result.push(...rows);continue;}const signed=(x,k)=>(x.tipo==='egreso'?-1:1)*cents(x[k]),cash=rows.reduce((s,x)=>s+cents(x.efectivo),0)+adjustments.reduce((s,x)=>s+signed(x,'efectivo'),0),transfer=rows.reduce((s,x)=>s+cents(x.transferencia),0)+adjustments.reduce((s,x)=>s+signed(x,'transferencia'),0),actual=cash+transfer,net=Math.min(invoice,Math.max(0,actual)),netCash=actual?proportion(net,cash,actual):0;let acc=0,allocated=0,cashAllocated=0;for(const row of rows){acc+=cents(amount(row));const next=invoice?proportion(net,acc,invoice):0,value=next-allocated,nextCash=net?proportion(next,netCash,net):0;result.push({...row,monto:value/100,efectivo:(nextCash-cashAllocated)/100,transferencia:(value-nextCash+cashAllocated)/100});allocated=next;cashAllocated=nextCash;}}return result;}
 function cashSummary(incomes,expenses,receipts){const valid=x=>!x.anulado&&!x.esVentaCredito&&x.tipo!=='deuda_ctacte',ins=(incomes||[]).filter(valid),outs=(expenses||[]).filter(valid),adjustments=outs.filter(x=>x.ajusteVenta),costs=outs.filter(x=>!x.ajusteVenta),paid=(receipts||[]).filter(x=>!x.anulado&&(!x.tipo||['turno','clase'].includes(x.tipo)));const sum=(rows,k)=>rows.reduce((s,x)=>s+(k==='monto'?cents(amount(x)):cents(x[k])),0);return{income:(sum(ins,'monto')+sum(paid,'monto')-sum(adjustments,'monto'))/100,cash:(sum(ins,'efectivo')+sum(paid,'efectivo')-sum(adjustments,'efectivo'))/100,transfer:(sum(ins,'transferencia')+sum(paid,'transferencia')-sum(adjustments,'transferencia'))/100,expenses:sum(costs,'monto')/100};}
 function productIncome(movements,receipts){
  const rows=counterIncome(movements);for(const row of movements||[])if(!row.anulado&&row.importeProductos>0)rows.push({...collectionPart(row,'importeProductos'),tipo:'venta_producto'});
  for(const receipt of receipts||[])if(!receipt.anulado&&['turno','clase'].includes(receipt.tipo)){const product=splitReceipt(receipt).products;if(product.monto)rows.push(product);}
  return rows;
 }
 const api={counterIncome,cashSummary,collectionPart,splitReceipt,turnLines,productIncome,amount};
 if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.PricProductReports=api;
})(typeof window==='object'?window:null);
