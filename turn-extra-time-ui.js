document.addEventListener('DOMContentLoaded',()=>{
 const products=document.getElementById('btn-agregar-consumo-turno');
 if(!products)return;
 const button=document.createElement('button');button.id='btn-agregar-tiempo-juego';button.type='button';button.className=products.className;button.textContent='Agregar tiempo de juego';button.dataset.action='window.abrirTiempoJuego()';
 const list=document.createElement('ul');list.id='lista-tiempo-extra';list.className='gestion-extra-time';
 products.after(button,list);
});
