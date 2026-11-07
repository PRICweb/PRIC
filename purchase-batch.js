(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.PricPurchaseBatch=api;
})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 function cents(value){
  const number=Number(value),rounded=Math.round(number*100);
  if(!Number.isFinite(number)||number<0||!Number.isSafeInteger(rounded)||number>1e9)throw Error('Importe de compra inválido.');
  return rounded;
 }
 function prepare(lines,cash,transfer){
  if(!Array.isArray(lines)||!lines.length||lines.length>50)throw Error('Agregá entre uno y 50 productos a la compra.');
  const items=lines.map(line=>{
   const quantity=Number(line.cantidad),id=String(line.id||'');
   if(!id||id.includes('/')||!Number.isInteger(quantity)||quantity<1||quantity>1000000)throw Error('Producto o cantidad inválidos.');
   const cost=cents(line.costo),price=cents(line.venta);
   return {id,cantidad:quantity,costo:cost/100,venta:price/100,total:cost*quantity};
  });
  const total=items.reduce((sum,line)=>sum+line.total,0),cashCents=cents(cash),transferCents=cents(transfer);
  if(!Number.isSafeInteger(total)||total>1e11||cashCents+transferCents!==total)throw Error('Completá el total exacto entre efectivo y transferencia.');
  let cumulative=0,allocated=0;
  for(const item of items){
   cumulative+=item.total;
   const target=total?Number((BigInt(cumulative)*BigInt(cashCents)+BigInt(Math.floor(total/2)))/BigInt(total)):0;
   item.efectivo=(target-allocated)/100;
   item.transferencia=(item.total-target+allocated)/100;
   allocated=target;
  }
  return {items,total:total/100,fingerprint:JSON.stringify([items,cashCents,transferCents])};
 }
 async function save({db,clubId,lines,cash,transfer,id,stamp,day,stockTools,metadata={}}){
  const prepared=prepare(lines,cash,transfer);
  if(!/^compra_[a-zA-Z0-9_-]+$/.test(id))throw Error('Identificador de compra inválido.');
  const base=db.collection('clubs').doc(clubId),productIds=[...new Set(prepared.items.map(x=>x.id))];
  return db.runTransaction(async tx=>{
   const movementRefs=prepared.items.map((_,i)=>base.collection('movimientos').doc(id+'_'+i));
   const previous=[];
   for(const ref of movementRefs)previous.push(await tx.get(ref));
   const products=new Map();
   for(const productId of productIds){
    const ref=base.collection('inventario').doc(productId),snapshot=await tx.get(ref);
    if(!snapshot.exists)throw Error('El producto ya no existe.');
    products.set(productId,{ref,product:{...snapshot.data(),id:productId}});
   }
   if(previous.some(x=>x.exists)){
    if(!previous.every(x=>x.exists&&x.data().compraFingerprint===prepared.fingerprint))throw Error('La solicitud ya se usó para otra compra.');
    return {productos:[...products.values()].map(x=>x.product),gastos:previous.map(x=>x.data()),repetido:true};
   }
   const expenses=prepared.items.map((item,i)=>{
    const {product}=products.get(item.id);
    stockTools.add(product,item.cantidad,item.costo,id+'_'+i,stamp);
    product.precio=Math.max(Number(product.precio||0),item.venta);
    return {id:id+'_'+i,compraId:id,compraFingerprint:prepared.fingerprint,fecha:day,fechaRegistro:stamp,tipo:'stock',titulo:'Compra de mercadería: '+product.nombre,productoId:item.id,productoNombre:product.nombre,cantidad:item.cantidad,costoUnitario:item.costo,subtotal:item.total/100,importe:item.total/100,monto:item.total/100,efectivo:item.efectivo,transferencia:item.transferencia};
   });
   for(const {ref,product} of products.values())tx.set(ref,{...product,...metadata},{merge:true});
   expenses.forEach((expense,i)=>tx.set(movementRefs[i],expense));
   return {productos:[...products.values()].map(x=>x.product),gastos:expenses};
  });
 }
 return {prepare,save};
});
