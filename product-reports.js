(function(root){
 'use strict';
 const cents=value=>Math.round((Number(value)||0)*100);
 const amount=row=>Number(row.monto??row.importe??(Number(row.efectivo||0)+Number(row.transferencia||0)));
 function splitReceipt(receipt){
  const cash=receipt.anulado?0:Math.max(0,cents(receipt.efectivo)),transfer=receipt.anulado?0:Math.max(0,cents(receipt.transferencia)),total=cash+transfer;
  const goods=receipt.anulado?0:Math.min(total,Math.max(0,(receipt.consumosAgrupados||[]).reduce((sum,item)=>sum+Math.max(0,cents(item.total)),0)));
  const productCash=total?Math.min(cash,Math.round(goods*cash/total)):0,productTransfer=goods-productCash;
  return {products:{...receipt,tipo:'venta_producto',efectivo:productCash/100,transferencia:productTransfer/100,monto:goods/100},service:{...receipt,efectivo:(cash-productCash)/100,transferencia:(transfer-productTransfer)/100,monto:(total-goods)/100}};
 }
 function turnLines(occurrences){
  const result=[],seen=new Set();
  for(const occurrence of occurrences||[]){
   const key=occurrence.id||occurrence.reservaId+'@'+occurrence.fecha;if(seen.has(key))continue;seen.add(key);
   const products=occurrence.consumos||[],gross=products.reduce((sum,item)=>sum+Math.max(0,cents(item.precio)),0);
   // Receipts allocate collections to goods first: a general discount reduces
   // the court charge first, and only its excess reduces product revenue.
   const net=Number.isFinite(Number(occurrence.total))?Math.min(gross,Math.max(0,cents(occurrence.total))):gross;
   let allocated=0,accumulated=0;
   products.forEach((item,index)=>{
    const quantity=Number(item.cantidad||1);if(quantity<=0)return;
    accumulated+=Math.max(0,cents(item.precio));const target=gross?Math.round(net*accumulated/gross):0,amount=target-allocated;allocated=target;
    result.push({id:'turn-product:'+key+':'+index,tipo:'venta_producto',origen:'consumo_turno',reservaId:occurrence.reservaId,fecha:occurrence.fecha,productoId:item.prodId||undefined,productoNombre:item.nombre||'Producto',cantidad:quantity,monto:amount/100,costoUnitario:item.costoUnitario??null});
   });
  }
  return result;
 }
 function productIncome(movements,receipts){
  const rows=(movements||[]).filter(row=>row.tipo==='venta_producto'&&!row.anulado);
  for(const receipt of receipts||[])if(!receipt.anulado&&['turno','clase'].includes(receipt.tipo)){const product=splitReceipt(receipt).products;if(product.monto)rows.push(product);}
  return rows;
 }
 const api={splitReceipt,turnLines,productIncome,amount};
 if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.PricProductReports=api;
})(typeof window==='object'?window:null);
