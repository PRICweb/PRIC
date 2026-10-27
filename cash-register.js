(function(root){
  'use strict';
  const cents=value=>{const number=Number(value);if(!Number.isFinite(number)||number<0||number>1e10)throw Error('Ingresá un importe válido, mayor o igual a cero.');return Math.round(number*100);};
  const money=value=>'$'+(value/100).toLocaleString('es-AR',{minimumFractionDigits:0,maximumFractionDigits:2});
  function lines(selection,products){
    const counts=new Map();
    for(const item of selection||[]){const id=String(item.id||''),quantity=Number(item.cantidad);if(!id||!Number.isSafeInteger(quantity)||quantity<1||quantity>1000)throw Error('La cantidad debe ser un número entero entre 1 y 1000.');counts.set(id,(counts.get(id)||0)+quantity);}
    if(counts.size>100)throw Error('Podés registrar hasta 100 productos distintos por operación.');
    return [...counts].map(([id,cantidad])=>{const product=(products||[]).find(p=>String(p.id)===id);if(!product)throw Error('Uno de los productos ya no existe.');if(cantidad>1000||cantidad>Number(product.stock||0))throw Error('Stock insuficiente para '+product.nombre+'. Disponible: '+Number(product.stock||0)+'.');return{id,cantidad,nombre:String(product.nombre||'Producto'),unitario:cents(product.precio||0),total:cents(product.precio||0)*cantidad};});
  }
  function allocate(items,cash,transfer){
    const total=items.reduce((sum,item)=>sum+item.total,0),efectivo=cents(cash||0),transferencia=cents(transfer||0);
    if(total<=0)throw Error('La venta debe tener un total mayor que cero.');
    if(efectivo+transferencia!==total)throw Error('Efectivo y transferencia deben sumar exactamente '+money(total)+'.');
    // Distribute cash without losing cents; line totals and both payment totals stay exact.
    let available=efectivo;
    return items.map(item=>{const cashLine=Math.min(available,item.total);available-=cashLine;return{...item,efectivo:cashLine/100,transferencia:(item.total-cashLine)/100,monto:item.total/100};});
  }
  function consumptionGroups(items){const groups=new Map();(items||[]).forEach((item,index)=>{const prodId=String(item.prodId||item.id||''),key=prodId?'id:'+prodId:'name:'+String(item.nombre||'Producto');if(!groups.has(key))groups.set(key,{key,prodId,nombre:String(item.nombre||'Producto'),cantidad:0,total:0,indices:[]});const group=groups.get(key);group.cantidad++;group.total+=cents(item.precio||0);group.indices.push(index);});return [...groups.values()];}
  function controls(name,minus,plus,remove){const safe=String(name).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));return '<div class="pric-quantity-actions"><button type="button" aria-label="Restar una unidad de '+safe+'" data-action="'+minus+'">−</button><button type="button" aria-label="Sumar una unidad de '+safe+'" data-action="'+plus+'">+</button><button type="button" class="pric-remove-product" aria-label="Borrar todo '+safe+'" title="Borrar todo" data-action="'+remove+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/></svg></button></div>';}
  function discountedLines(items,discount=0){const gross=items.reduce((sum,item)=>sum+item.total,0),rebate=cents(discount||0);if(rebate>gross)throw Error('El descuento no puede superar el total de productos.');let cumulative=0,allocated=0;return items.map(item=>{cumulative+=item.total;const next=gross?Math.round(rebate*cumulative/gross):0,descuento=next-allocated;allocated=next;return {...item,subtotal:item.total,descuento,total:item.total-descuento};});}
  function settlement(items,cash,transfer,discount=0){items=discountedLines(items,discount);const total=items.reduce((sum,item)=>sum+item.total,0),paidCash=cents(cash||0),paidTransfer=cents(transfer||0),paid=paidCash+paidTransfer;if(total<0)throw Error('La venta debe tener un total válido.');const baseCash=paid?Math.round(total*paidCash/paid):total,baseTransfer=total-baseCash;return {items:total?allocate(items,baseCash/100,baseTransfer/100):items.map(item=>({...item,efectivo:0,transferencia:0,monto:0})),cashAdjustment:paidCash-baseCash,transferAdjustment:paidTransfer-baseTransfer,difference:paid-total};}
  const api={cents,money,lines,allocate,discountedLines,settlement,consumptionGroups,controls};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(!root||!root.document)return;
  root.PricSaleTools=api;
  let active=false;
  root.PricProductPicker={open({products,selection=[],title='Elegir productos'}){
    if(active)return Promise.resolve(null);
    active=true;
    return new Promise(resolve=>{
      const dialog=document.createElement('dialog');dialog.className='pric-product-picker';
      const heading=document.createElement('h2');heading.textContent=title;heading.id='pric-product-picker-title';heading.tabIndex=-1;heading.setAttribute('autofocus','');dialog.setAttribute('aria-labelledby',heading.id);
      const help=document.createElement('p');help.className='panel-muted';help.textContent='Indicá cuántas unidades querés de cada producto.';
      const searchButton=document.createElement('button');searchButton.type='button';searchButton.className='pric-media-button';searchButton.textContent='Buscar';
      const search=document.createElement('input');search.type='search';search.className='input-form';search.placeholder='Buscar por producto o categoría';search.setAttribute('aria-label','Buscar productos');search.hidden=true;
      const list=document.createElement('div');list.className='pric-product-picker-list';const quantities=new Map();
      const ordered=[...(products||[])].sort((a,b)=>String(a.categoria||'').localeCompare(String(b.categoria||''),'es')||String(a.nombre||'').localeCompare(String(b.nombre||''),'es'));
      for(const product of ordered){
        const row=document.createElement('label');row.className='pric-product-picker-row';
        const text=document.createElement('span'),name=document.createElement('strong'),detail=document.createElement('small');name.textContent=product.nombre||'Producto';detail.textContent=(product.categoria||'Sin categoría')+' · '+money(cents(product.precio||0))+' · Stock '+Number(product.stock||0);text.append(name,detail);
        const input=document.createElement('input');input.className='input-form';input.type='number';input.min='0';input.max=String(Math.min(1000,Math.max(0,Number(product.stock||0))));input.step='1';input.value=String(Number(product.stock||0)>0?(selection.find(item=>String(item.id)===String(product.id))?.cantidad||0):0);input.disabled=Number(product.stock||0)<=0;input.setAttribute('aria-label','Cantidad de '+product.nombre);quantities.set(String(product.id),input);row.append(text,input);row.dataset.search=(String(product.nombre||'')+' '+String(product.categoria||'')).toLocaleLowerCase('es');list.append(row);
      }
      if(!ordered.length){const empty=document.createElement('p');empty.textContent='No hay productos cargados.';list.append(empty);}
      const status=document.createElement('p');status.className='pric-product-picker-status';status.setAttribute('aria-live','polite');
      const error=document.createElement('p');error.className='pric-product-picker-error';error.setAttribute('role','alert');
      const footer=document.createElement('div');footer.className='pric-product-picker-actions';
      const cancel=document.createElement('button');cancel.type='button';cancel.className='pric-media-button';cancel.textContent='Cerrar';
      const apply=document.createElement('button');apply.type='button';apply.className='btn-modal btn-guardar';apply.textContent='Agregar productos';footer.append(cancel,apply);
      const getSelection=()=>[...quantities].filter(([,input])=>input.value!==''&&Number(input.value)!==0).map(([id,input])=>({id,cantidad:Number(input.value)}));
      const refresh=()=>{try{const selected=lines(getSelection(),products);status.textContent='Total de productos: '+money(selected.reduce((sum,item)=>sum+item.total,0));error.textContent='';apply.disabled=!selected.length;}catch(e){error.textContent=e.message;apply.disabled=true;}};
      list.addEventListener('input',refresh);searchButton.onclick=()=>{search.hidden=false;search.focus();};search.oninput=()=>{const query=search.value.trim().toLocaleLowerCase('es');for(const row of list.querySelectorAll('[data-search]'))row.hidden=!row.dataset.search.includes(query);};
      let result=null;cancel.onclick=()=>dialog.close();apply.onclick=()=>{try{result=lines(getSelection(),products).map(item=>({id:item.id,cantidad:item.cantidad}));if(result.length)dialog.close();}catch(e){error.textContent=e.message;}};
      dialog.addEventListener('keydown',event=>{if(event.key!=='Enter'||event.isComposing||event.repeat||event.ctrlKey||event.altKey||event.metaKey||event.shiftKey)return;if(event.target.closest?.('button')&&event.target!==apply)return;event.preventDefault();event.stopPropagation();refresh();if(!apply.disabled)apply.click();});
      dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom){event.preventDefault();event.stopImmediatePropagation();dialog.close();}});
      dialog.addEventListener('close',()=>{active=false;dialog.remove();resolve(result);},{once:true});
      const content=document.createElement('div');content.className='pric-product-picker-content';content.append(heading,help,searchButton,search,list,status,error);dialog.append(content,footer);document.body.append(dialog);refresh();dialog.showModal();heading.focus({preventScroll:true});
    });
  }};
})(typeof window!=='undefined'?window:null);
