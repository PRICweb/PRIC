(function(){
 'use strict';
 const $=id=>document.getElementById(id),money=n=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS'}).format(n);
 let lines=[],saving=false,requestId=null,club=null;
 function total(){return lines.reduce((sum,x)=>sum+Math.round(x.costo*100)*x.cantidad,0)/100;}
 function update(){
  if(!lines.length)return;
  $('compra-total').textContent=money(total());
  const paid=Number($('compra-efectivo').value||0)+Number($('compra-transferencia').value||0);
  const remaining=Math.round((total()-paid)*100)/100;
  $('compra-restante').textContent=remaining<0?'El pago supera el total por '+money(-remaining):'Falta completar: '+money(remaining);
 }
 function render(){
  const body=$('compra-carrito');body.replaceChildren();
  lines.forEach((line,i)=>{
   const tr=document.createElement('tr');
   for(const [label,value] of [['Producto',line.nombre],['Cantidad',line.cantidad],['Costo unitario',money(line.costo)],['Subtotal',money(line.costo*line.cantidad)]]){
    const td=document.createElement('td');td.textContent=value;td.dataset.mobileLabel=label;tr.append(td);
   }
   const td=document.createElement('td'),remove=document.createElement('button');remove.type='button';remove.className='pric-stock-action';remove.textContent='×';remove.disabled=saving;remove.setAttribute('aria-label','Quitar '+line.nombre);
   remove.onclick=()=>{if(saving)return;lines.splice(i,1);requestId=null;render();window.actualizarTotalCompra();};
   td.append(remove);tr.append(td);body.append(tr);
  });
  $('compra-carrito-wrap').hidden=!lines.length;update();
 }
 function clear(){lines=[];requestId=null;if($('compra-carrito'))render();}
 async function submit(){
  if(saving)return;
  if(Number($('compra-cantidad').value||0)>0){await window.webAlert('Agregá el producto pendiente a la compra o vaciá su cantidad antes de registrar.');return;}
  if(!requestId)requestId='compra_'+crypto.randomUUID();
  saving=true;$('btn-registrar-compra').disabled=true;$('compra-agregar').disabled=true;render();
  try{
   await window.registrarCompraMultiple(lines.map(x=>({...x})),requestId);
   clear();for(const id of ['compra-cantidad','compra-efectivo','compra-transferencia'])$(id).value='';
   window.actualizarTotalCompra();
   await window.webAlert('Compra registrada. Se actualizaron todos los productos y el total pagado.');
  }catch(e){await window.webAlert(e.message||'No se pudo registrar la compra.');}
  finally{saving=false;$('btn-registrar-compra').disabled=false;$('compra-agregar').disabled=false;render();}
 }
 window.PricPurchaseCart={hasItems:()=>lines.length>0,isSaving:()=>saving,discard:()=>{if(!saving)clear();},submit};
 document.addEventListener('DOMContentLoaded',()=>{
  const box=$('pric-inventory-purchases');if(!box)return;
  const add=document.createElement('button');add.type='button';add.id='compra-agregar';add.className='btn-modal btn-guardar';add.textContent='Agregar a la compra';
  const wrap=document.createElement('div');wrap.id='compra-carrito-wrap';wrap.hidden=true;wrap.innerHTML='<h3>Resumen de la compra</h3><table class="pric-admin-data-table"><thead><tr><th>Producto</th><th>Cantidad</th><th>Costo unitario</th><th>Subtotal</th><th></th></tr></thead><tbody id="compra-carrito"></tbody></table>';
  const totalNode=box.querySelector('.pric-purchase-total');totalNode.before(add,wrap);
  const original=window.actualizarTotalCompra;
  window.actualizarTotalCompra=()=>{original();update();};
  add.onclick=()=>{
   if(saving)return;
   try{
    const id=$('compra-producto').value,cantidad=Number($('compra-cantidad').value),costo=Number($('compra-precio').value),venta=Number($('compra-venta').value);
    if(!id||$('compra-precio').value===''||$('compra-venta').value==='')throw Error('Completá el producto, costo, cantidad y precio de venta.');
    const item={id,cantidad,costo,venta,nombre:$('compra-producto').selectedOptions[0].textContent};
    const amount=Math.round(costo*100)*cantidad;
    window.PricPurchaseBatch.prepare([item],amount/100,0);
    if(lines.length>=50)throw Error('La compra admite hasta 50 renglones.');
    lines.push(item);club=window.CLUB_DOC_ID_ACTUAL;requestId=null;$('compra-cantidad').value='';render();
   }catch(e){window.webAlert(e.message);}
  };
  box.addEventListener('input',()=>{if(!saving)requestId=null;update();});
  window.addEventListener('pric-session-ended',clear);
  window.addEventListener('pric-view-change',()=>{if(club&&club!==window.CLUB_DOC_ID_ACTUAL)clear();});
 });
})();
