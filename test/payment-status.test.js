const {test}=require('node:test');const assert=require('node:assert/strict');const {message}=require('../payment-status');
test('return URL success alone never confirms reservation',()=>assert.equal(message(null,'success').type,'pending'));
test('confirmed server reservation is shown as confirmed',()=>assert.equal(message({senaPagada:true},'pending').type,'success'));
test('late paid reservation needs review even with stale confirmed flag',()=>assert.equal(message({estadoPago:'pago_requiere_revision',status:'confirmado'},'success').title,'Pago en revisión'));
test('expiry does not claim that payment failed',()=>assert.equal(message({estado:'vencida'},'success').title,'Plazo de reserva vencido'));
