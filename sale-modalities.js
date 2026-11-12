(function(root){
'use strict';
const modes=[['indoor','Pádel in','canchasIndoor'],['outdoor','Pádel out','canchasOutdoor'],['tenis_indoor','Tenis in','canchasTenisIndoor'],['tenis_outdoor','Tenis out','canchasTenisOutdoor']];
function active(config={}){return modes.filter(([id,label,field])=>Number(config[field]??(id==='tenis_outdoor'&&!Number(config.canchasTenisIndoor)?config.canchasTenis:0))>0).map(([id,label])=>({id,label}));}
function validate(value,config){if(!active(config).some(m=>m.id===value))throw Error('Seleccioná una modalidad activa para esta venta.');return value;}
const api={active,validate};if(typeof module==='object'&&module.exports)module.exports=api;if(!root)return;root.PricSaleModalities=api;
function refresh(){const select=document.getElementById('mov-modalidad');if(!select)return;const entries=active(root.datosCanchasCierre?.()||{}),signature=JSON.stringify(entries);if(select.dataset.signature===signature)return;const previous=select.value;select.replaceChildren(new Option('Elegí una modalidad',''));for(const item of entries)select.add(new Option(item.label,item.id));select.value=entries.some(x=>x.id===previous)?previous:'';select.dataset.signature=signature;}
document.addEventListener('DOMContentLoaded',()=>{const card=document.querySelector('.pric-cash-sale'),anchor=card?.querySelector('.pric-sale-discount');if(!anchor)return;const label=document.createElement('label');label.className='pric-sale-modality';label.textContent='Modalidad de la venta';const select=document.createElement('select');select.id='mov-modalidad';select.className='input-form';select.dataset.noSearch='true';select.required=true;label.append(select);anchor.before(label);refresh();const options=document.getElementById('select-modalidad-turnero');if(options)new MutationObserver(refresh).observe(options,{childList:true,subtree:true});root.addEventListener('pric-view-change',refresh);});
api.refresh=refresh;
})(typeof window==='object'?window:null);
