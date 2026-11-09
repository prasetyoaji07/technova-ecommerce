import { get, post } from '../api.js';
import { h, icon, messageState } from '../dom.js';
import { money, discountPercent } from '../format.js';
import { mountLayout } from '../layout.js';

mountLayout('shop');
const root = document.querySelector('[data-product-detail]');
const slug = new URLSearchParams(location.search).get('slug');
if (!slug) root.replaceChildren(messageState('Produk tidak ditemukan', 'Pilih produk dari katalog TechNova.', h('a', { className: 'btn btn-primary', href: '/shop.html' }, 'Kembali ke katalog')));
else loadProduct();

async function loadProduct() {
  try {
    const product = await get(`/products/${encodeURIComponent(slug)}`);
    document.title = `${product.name} — TechNova`;
    renderProduct(product);
  } catch (error) {
    root.replaceChildren(messageState('Detail produk tidak tersedia', error.message, h('a', { className: 'btn btn-outline', href: '/shop.html' }, 'Kembali ke katalog')));
  }
}

function renderProduct(product) {
  const colors = product.colors?.length ? product.colors : ['Default'];
  let selectedColor = colors[0];
  const colorChoices = h('div', { className: 'color-list', role: 'group', 'aria-label': 'Pilih warna' });
  colors.forEach((color, index) => colorChoices.append(h('button', { className: 'color-choice', type: 'button', 'aria-pressed': index === 0, onClick: event => {
    selectedColor = color; colorChoices.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button === event.currentTarget)));
  } }, color)));
  const specs = product.specs || {};
  const specEntries = [['Layar', specs.display], ['Chipset', specs.chip], ['Kamera', specs.camera], ['Baterai', specs.battery], ['Jaringan', specs.network]]
    .filter(([, value]) => value);
  const off = discountPercent(product.price, product.original_price);
  const qty = h('input', { className: 'field quantity-input', type: 'number', min: '1', max: String(Math.min(10, product.stock || 1)), value: '1', 'aria-label': 'Jumlah produk', disabled: product.stock < 1 });
  const feedback = h('p', { className: 'muted', role: 'status', 'data-product-feedback': '' });
  const addButton = h('button', { className: 'btn btn-primary', type: 'button', disabled: product.stock < 1, onClick: async () => {
    addButton.disabled = true;
    try { await post('/cart', { product_id: product.id, color: selectedColor, qty: Math.max(1, Math.min(10, Number(qty.value) || 1)) }); feedback.textContent = 'Produk berhasil ditambahkan ke keranjang.'; }
    catch (error) { feedback.textContent = error.message; }
    finally { addButton.disabled = product.stock < 1; }
  } }, 'Tambah ke keranjang');
  const wishButton = h('button', { className: 'btn btn-outline', type: 'button', onClick: async () => {
    wishButton.disabled = true;
    try { await post('/wishlist', { product_id: product.id }); feedback.textContent = 'Produk disimpan ke wishlist.'; }
    catch (error) { feedback.textContent = error.message; }
    finally { wishButton.disabled = false; }
  } }, icon('heart'), 'Wishlist');
  root.replaceChildren(h('div', { className: 'product-detail' },
    h('div', { className: 'detail-image' }, h('img', { src: product.image_url, alt: product.name })),
    h('section', { className: 'detail-copy' }, h('span', { className: 'eyebrow' }, `${product.brand} · ${product.category}`),
      h('h1', {}, product.name), h('div', { className: 'product-rating' }, h('span', { className: 'star' }, '★'), `${Number(product.rating_avg || 0).toFixed(1)} dari 5 · ${product.rating_count || 0} ulasan`),
      h('p', { className: 'muted' }, product.description || 'Informasi produk tersedia di bawah ini.'),
      h('div', { className: 'detail-price' }, money(product.price), product.original_price ? h('span', { className: 'old-price' }, money(product.original_price)) : null, off ? h('span', { className: 'discount' }, ` ${off}% OFF`) : null),
      h('p', { className: product.stock > 0 ? 'muted' : 'discount' }, product.stock > 0 ? `Stok tersedia: ${product.stock}` : 'Stok sedang habis'),
      h('h3', {}, 'Pilih warna'), colorChoices,
      h('h3', {}, 'Spesifikasi utama'), h('div', { className: 'spec-list' }, ...specEntries.map(([label, value]) => h('div', { className: 'spec-item' }, h('span', {}, label), h('strong', {}, value))),
        product.storage ? h('div', { className: 'spec-item' }, h('span', {}, 'Penyimpanan'), h('strong', {}, product.storage)) : null),
      h('label', { for: 'product-qty' }, 'Jumlah'), h('div', { className: 'product-buy-row' }, qty, addButton, wishButton), feedback)));
  qty.id = 'product-qty';
}
