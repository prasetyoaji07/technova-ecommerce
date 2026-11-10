import { get, post } from '../api.js';
import { h, icon, messageState } from '../dom.js';
import { money } from '../format.js';
import { mountLayout, refreshCartCount } from '../layout.js';
import { createField, checkAll } from '../forms.js';

mountLayout('cart');
const root = document.querySelector('[data-checkout-root]');
const steps = document.querySelector('[data-steps]');
let cartData;
let address = {};
let cardFields = [];
let payment = 'card';
let busy = false;
const EMPTY_CART_REDIRECT_MS = 3000;
const CART_PROBLEM_CODES = ['CART_EMPTY', 'STOCK_UNAVAILABLE'];
load();

async function load() {
  root.replaceChildren(messageState('Memuat checkout', 'Menyiapkan ringkasan pesanan...'));
  try {
    cartData = await get('/cart');
    if (!cartData.items?.length) {
      root.replaceChildren(messageState('Keranjang kosong', 'Tambahkan produk sebelum checkout. Kamu akan diarahkan ke katalog.', h('a', { className: 'btn btn-primary', href: '/shop.html' }, 'Belanja sekarang')));
      setTimeout(() => location.assign('/shop.html'), EMPTY_CART_REDIRECT_MS);
      return;
    }
    renderAddress();
  } catch (error) { root.replaceChildren(messageState('Checkout tidak dapat dimuat', error.message, h('button', { className: 'btn btn-outline', onClick: load }, 'Coba lagi'))); }
}

function summary() {
  const subtotal = Number(cartData.subtotal) || 0;
  const shipping = subtotal >= 1000000 ? 0 : 25000;
  return h('aside', { className: 'summary-card' }, h('h2', {}, 'Ringkasan Pesanan'),
    ...cartData.items.map(item => h('div', { className: 'checkout-product' },
      h('img', { src: item.image_url, alt: item.name }), h('div', {}, h('strong', {}, item.name), h('span', {}, `${item.qty} × ${money(item.price)}`)))),
    row('Subtotal', money(subtotal)), row('Ongkir', shipping ? money(shipping) : 'Gratis'),
    h('div', { className: 'summary-total' }, h('strong', {}, 'Total'), h('strong', {}, money(subtotal + shipping))));
}
function row(a, b) { return h('div', { className: 'summary-row' }, h('span', {}, a), h('span', {}, b)); }
function renderAddress() {
  steps.children[0].classList.add('is-active'); steps.children[1].classList.remove('is-active');
  const fields = [
    createField('ship_name', 'Nama penerima', address.ship_name), createField('ship_address', 'Nama jalan, nomor, RT/RW', address.ship_address),
    createField('ship_city', 'Kota', address.ship_city), createField('ship_postal_code', '5 digit, contoh 17530', address.ship_postal_code),
    createField('ship_phone', '081234567890', address.ship_phone)
  ];
  const form = h('form', { className: 'checkout-form', novalidate: true, onSubmit: event => {
    event.preventDefault();
    if (!checkAll(fields)) return;
    address = Object.fromEntries(fields.map(field => [field.input.name, field.value()]));
    renderPayment();
  } }, h('section', { className: 'panel-card' }, h('h2', {}, 'Alamat Pengiriman'), ...fields.map(field => field.node)),
    h('button', { className: 'btn btn-primary btn-block', type: 'submit' }, 'Lanjut ke Pembayaran', icon('arrow-right')));
  root.replaceChildren(h('div', { className: 'checkout-layout' }, form, summary()));
}
function renderPayment() {
  steps.children[1].classList.add('is-active');
  const choices = [['card','Credit / Debit Card'],['paypal','PayPal'],['apple_pay','Apple Pay'],['cod','Cash on Delivery']];
  const radios = h('div', { className: 'payment-options' }, ...choices.map(([value, label]) =>
    h('label', { className: 'payment-option' }, h('input', { type: 'radio', name: 'payment_method', value, checked: payment === value, onChange: () => { payment = value; renderPayment(); } }), h('span', {}, label))));
  cardFields = payment === 'card'
    ? [createField('card_number', '1234 5678 9012 3456'), createField('expiry', 'MM/YY'), createField('cvv', '123')] : [];
  const cardUi = payment === 'card' ? h('div', { className: 'card-ui' },
    h('p', { className: 'muted' }, 'Simulasi tampilan kartu. Informasi kartu tidak dikirim atau disimpan.'),
    cardFields[0].node, h('div', { className: 'form-grid-two' }, cardFields[1].node, cardFields[2].node)) : null;
  const feedback = h('p', { className: 'form-feedback', role: 'alert' });
  const submit = h('button', { className: 'btn btn-primary btn-block', type: 'button', disabled: busy, onClick: placeOrder }, 'Konfirmasi Pesanan', icon('arrow-right'));
  root.replaceChildren(h('div', { className: 'checkout-layout' },
    h('section', { className: 'panel-card' }, h('h2', {}, 'Metode Pembayaran'), radios, cardUi,
      h('div', { className: 'checkout-actions' }, h('button', { className: 'btn btn-outline', onClick: renderAddress, type: 'button' }, 'Kembali'), submit), feedback), summary()));
}
async function placeOrder() {
  if (busy) return;
  if (cardFields.length && !checkAll(cardFields)) return;
  busy = true;
  const button = root.querySelector('.checkout-actions .btn-primary');
  if (button) button.disabled = true;
  const feedback = root.querySelector('[role="alert"]');
  try {
    const result = await post('/orders', { ...address, payment_method: payment });
    renderSuccess(result);
  } catch (error) { showOrderError(feedback, error); busy = false; if (button) button.disabled = false; }
}
function showOrderError(feedback, error) {
  const action = CART_PROBLEM_CODES.includes(error.code)
    ? h('a', { className: 'btn btn-outline', href: '/cart.html' }, 'Periksa keranjang')
    : h('button', { className: 'btn btn-outline', type: 'button', onClick: placeOrder }, 'Coba lagi');
  feedback.replaceChildren(error.message, ' ', action);
}
function renderSuccess(order) {
  refreshCartCount();
  steps.children[2].classList.add('is-active');
  root.replaceChildren(h('section', { className: 'success-panel' }, h('div', { className: 'success-mark' }, icon('check')),
    h('h2', {}, 'Order Placed Successfully'), h('p', { className: 'muted' }, 'Terima kasih. Pesanan kamu berhasil dibuat.'),
    h('p', {}, 'Nomor pesanan'), h('strong', { className: 'order-number' }, order.order_number),
    row('Ongkir', order.shipping_fee ? money(order.shipping_fee) : 'Gratis'), row('Total', money(order.total)),
    h('a', { className: 'btn btn-primary btn-block', href: `/orders.html?n=${encodeURIComponent(order.order_number)}` }, 'Lihat Detail Pesanan'),
    h('a', { className: 'btn btn-outline btn-block', href: '/shop.html' }, 'Lanjutkan Belanja')));
}
