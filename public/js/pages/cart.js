import { get, patch, remove } from '../api.js';
import { h, icon, messageState } from '../dom.js';
import { money } from '../format.js';
import { mountLayout } from '../layout.js';

mountLayout('cart');
const root = document.querySelector('[data-cart-root]');
const FREE_SHIPPING = 1000000;
const SHIPPING_FEE = 25000;
loadCart();

async function loadCart() {
  root.replaceChildren(messageState('Memuat keranjang', 'Mengambil produk pilihan kamu...'));
  try { renderCart(await get('/cart')); }
  catch (error) { root.replaceChildren(messageState('Keranjang gagal dimuat', error.message, h('button', { className: 'btn btn-outline', onClick: loadCart }, 'Coba lagi'))); }
}

function renderCart(cart) {
  const items = cart.items || [];
  if (!items.length) {
    root.replaceChildren(messageState('Keranjang masih kosong', 'Temukan smartphone yang sesuai kebutuhanmu.', h('a', { className: 'btn btn-primary', href: '/shop.html' }, 'Mulai belanja')));
    return;
  }
  const subtotal = Number(cart.subtotal) || items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const shipping = subtotal >= FREE_SHIPPING ? 0 : SHIPPING_FEE;
  const list = h('div', { className: 'cart-list' });
  items.forEach(item => list.append(cartItem(item)));
  root.replaceChildren(h('div', { className: 'cart-layout' }, list,
    h('aside', { className: 'summary-card' }, h('h2', {}, 'Ringkasan Belanja'),
      summaryRow('Subtotal', money(subtotal)), summaryRow('Ongkir', shipping ? money(shipping) : 'Gratis'),
      h('div', { className: 'summary-total' }, h('strong', {}, 'Total'), h('strong', {}, money(subtotal + shipping))),
      h('a', { className: 'btn btn-primary btn-block', href: '/checkout.html' }, 'Lanjut ke Checkout', icon('arrow-right')),
      h('a', { className: 'text-link', href: '/shop.html' }, 'Lanjutkan belanja'))));
}

function cartItem(item) {
  const qty = h('input', { className: 'field quantity-input', type: 'number', min: '1', max: '10', value: String(item.qty), 'aria-label': `Jumlah ${item.name}` });
  const feedback = h('p', { className: 'form-feedback', role: 'status' });
  const update = async () => {
    const value = Math.max(1, Math.min(10, Number(qty.value) || 1));
    qty.value = String(value);
    qty.disabled = true;
    try { await patch(`/cart/${item.id}`, { qty: value }); await loadCart(); }
    catch (error) { feedback.textContent = error.message; qty.disabled = false; }
  };
  qty.addEventListener('change', update);
  const del = h('button', { className: 'icon-btn', type: 'button', 'aria-label': `Hapus ${item.name}`, onClick: async () => {
    del.disabled = true;
    try { await remove(`/cart/${item.id}`); await loadCart(); }
    catch (error) { feedback.textContent = error.message; del.disabled = false; }
  } }, icon('trash-2'));
  return h('article', { className: 'cart-item' },
    h('a', { className: 'cart-thumb', href: `/product.html?slug=${encodeURIComponent(item.slug)}` }, h('img', { src: item.image_url, alt: item.name })),
    h('div', { className: 'cart-item-info' }, h('a', { className: 'cart-item-name', href: `/product.html?slug=${encodeURIComponent(item.slug)}` }, item.name),
      h('span', { className: 'muted' }, item.color || 'Warna standar'), h('strong', {}, money(item.price)),
      h('div', { className: 'cart-controls' }, h('label', {}, 'Qty', qty), del), feedback));
}
function summaryRow(label, value) { return h('div', { className: 'summary-row' }, h('span', {}, label), h('span', {}, value)); }
