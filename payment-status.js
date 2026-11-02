(function(root){
  function confirmationText(reservation){
    const r=reservation||{},name=String(r.canchaNombre||r.cancha||'').trim().replace(/^cancha\s+/i,''),hour=String(r.hora||'').trim();
    return 'Reserva confirmada en Cancha '+name+' a las '+hour+'hs. Si no recibís el aviso por WhatsApp, la reserva sigue siendo válida. Ante cualquier duda sobre tu turno, contactá al club.';
  }
  function message(reservation, result){
    const r=reservation||{};
    const states=[r.estadoPago,r.estado,r.status].map(v=>String(v||'').toLowerCase());
    if(states.includes('pago_requiere_revision')||states.includes('pago_monto_invalido'))return {type:'pending',title:'Pago en revisión',text:'El pago requiere revisión del club. Tu turno todavía no está confirmado. Contactá al club antes de realizar otro pago.'};
    if(states.some(s=>['cancelada','cancelado','pago_no_aprobado'].includes(s)))return {type:'failure',title:'Reserva sin confirmar',text:'La reserva no está confirmada. Si realizaste un pago, contactá al club antes de volver a pagar.'};
    if(reservation&&(r.senaPagada===true||states.includes('sena_pagada')||states.includes('confirmado')))return {type:'success',title:'Reserva confirmada',text:confirmationText(r)};
    if(states.includes('vencida'))return {type:'pending',title:'Plazo de reserva vencido',text:'El turno no está confirmado. Si realizaste el pago, contactá al club antes de volver a pagar.'};
    if(states.includes('pago_no_aprobado')||result==='failure')return {type:'failure',title:'Reserva sin confirmar',text:'No tenemos confirmación de la reserva. Si se debitó el pago, contactá al club antes de volver a pagar.'};
    return {type:'pending',title:'Verificando tu reserva',text:'Estamos verificando tu pago. La confirmación se mostrará en esta pantalla cuando se acredite el pago. No realices otro pago. Ante cualquier inconveniente, escribile al club.'};
  }
  root.PRICPaymentStatus={message,confirmationText};
  if(typeof module==='object'&&module.exports)module.exports={message,confirmationText};
})(typeof window==='object'?window:globalThis);
