import { get } from '../api.js';
import { h, icon, messageState } from '../dom.js';
import { money } from '../format.js';
import { mountLayout } from '../layout.js';

mountLayout(''); 
const root = document.querySelector('[data-orders-root]');
const selected = new URLSearchParams(location.search).get('n');
const stages = ['placed','processing','shipped','out_for_delivery','delivered'];
const labels = { placed: 'Pesanan dibuat', processing: 'Diproses', shipped: 'Dikirim', out_for_delivery: 'Dalam perjalanan', delivered: 'Terkirim', cancelled: 'Dibatalkan' };
load();

async function load() {
  root.replaceChildren(messageState('Memuat pesanan', 'Mengambil riwayat transaksi...'));
  try {
    if (selected) renderDetail(await get(`/orders/${encodeURIComponent(selected)}`));
    else {
      const orders = await get('/orders');
      if (!orders.length) return root.replaceChildren(messageState('Belum ada pesanan', 'Pesanan yang kamu buat akan muncul di sini.', h('a', { className: 'btn btn-primary', href: '/shop.html' }, 'Mulai belanja')));
      root.replaceChildren(h('div', { className: 'orders-list' }, ...orders.map(order => h('a', { className: 'order-card', href: `/orders.html?n=${encodeURIComponent(order.order_number)}` },
        h('div', { className: 'order-card-head' }, h('strong', {}, order.order_number), h('span', { className: 'status-pill' }, labels[order.status] || order.status)),
        h('span', { className: 'muted' }, new Date(order.created_at).toLocaleDateString('id-ID')),
        h('strong', {}, money(order.total)), h('span', { className: 'text-link' }, 'Lacak pesanan', icon('arrow-right'))))));
    }
  } catch (error) { root.replaceChildren(messageState('Pesanan tidak dapat dimuat', error.message, h('button', { className: 'btn btn-outline', onClick: load }, 'Coba lagi'))); }
}
function renderDetail(order) {
  const current = stages.indexOf(order.status);
  const timeline = order.status === 'cancelled' ? [h('li', { className: 'timeline-item is-current' }, h('span', {}, 'Dibatalkan'))] :
    stages.map((stage, index) => h('li', { className: `timeline-item ${index <= current ? 'is-done' : ''}` },
      h('span', { className: 'timeline-dot' }, index <= current ? icon('check') : ''),
      h('div', {}, h('strong', {}, labels[stage]), h('small', {}, (order.tracking || []).find(item => item.status === stage)?.created_at ? new Date(order.tracking.find(item => item.status === stage).created_at).toLocaleString('id-ID') : (index === current + 1 ? 'Menunggu pembaruan' : '')))));
  root.replaceChildren(h('div', { className: 'tracking-layout' },
    h('section', { className: 'panel-card' }, h('div', { className: 'order-card-head' }, h('div', {}, h('span', { className: 'muted' }, 'Nomor pesanan'), h('h2', {}, order.order_number)), h('span', { className: 'status-pill' }, labels[order.status] || order.status)),
      h('h3', {}, 'Status Pengiriman'), h('ol', { className: 'timeline' }, ...timeline),
      h('div', { className: 'delivery-box' }, h('strong', {}, 'Estimasi tiba'), h('span', {}, order.estimated_delivery ? new Date(`${order.estimated_delivery}T00:00:00`).toLocaleDateString('id-ID', { dateStyle: 'long' }) : 'Belum tersedia')),
      h('h3', {}, 'Alamat Pengiriman'), h('p', {}, order.ship_name), h('p', {}, order.ship_address), h('p', {}, `${order.ship_city}, ${order.ship_postal_code}`), h('p', {}, order.ship_phone)),
    h('aside', { className: 'summary-card' }, h('h2', {}, 'Detail Pesanan'),
      ...(order.items || []).map(item => h('div', { className: 'checkout-product' }, h('div', {}, h('strong', {}, item.product_name), h('span', {}, `${item.qty} × ${money(item.unit_price)}`)))),
      h('div', { className: 'summary-row' }, 'Subtotal', money(order.subtotal)), h('div', { className: 'summary-row' }, 'Ongkir', money(order.shipping_fee)),
      h('div', { className: 'summary-total' }, h('strong', {}, 'Total'), h('strong', {}, money(order.total))),
      h('a', { className: 'btn btn-outline btn-block', href: '/orders.html' }, 'Kembali ke Pesanan'))));
}
