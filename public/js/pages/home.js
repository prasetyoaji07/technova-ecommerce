import { get, post } from '../api.js';
import { h, icon, messageState } from '../dom.js';
import { money, discountPercent } from '../format.js';
import { mountLayout, setupNewsletter } from '../layout.js';

mountLayout('home');
setupNewsletter();
document.querySelectorAll('[data-icon]').forEach(node => node.replaceChildren(icon(node.dataset.icon)));
loadProducts('[data-popular]', '/products?limit=4&sort=popular');
loadProducts('[data-deals]', '/products?deal=true&limit=4&sort=popular');
loadBrands();

async function loadProducts(selector, endpoint) {
  const root = document.querySelector(selector);
  root.replaceChildren(...Array.from({ length: 4 }, () => h('div', { className: 'product-card' },
    h('div', { className: 'skeleton skeleton-media', 'aria-hidden': 'true' }),
    h('div', { className: 'product-info' }, h('div', { className: 'skeleton skeleton-line' }), h('div', { className: 'skeleton skeleton-line short' })))));
  try {
    const result = await get(endpoint);
    const items = result.items || [];
    root.replaceChildren(...(items.length ? items.map(productCard) : [messageState('Belum ada produk', 'Produk akan tampil di bagian ini setelah tersedia.')]));
  } catch (error) {
    root.replaceChildren(messageState('Katalog belum dapat dimuat', error.message, h('button', { className: 'btn btn-outline', onClick: () => loadProducts(selector, endpoint) }, 'Coba lagi')));
  }
}

function productCard(product) {
  const discount = discountPercent(product.price, product.original_price);
  const card = h('article', { className: 'product-card' },
    h('a', { className: 'product-media', href: `/product.html?slug=${encodeURIComponent(product.slug)}` },
      product.is_best_seller ? h('span', { className: 'product-tag' }, 'Best Seller') : null,
      h('img', { src: product.image_url, alt: product.name, loading: 'lazy' })),
    h('div', { className: 'product-info' },
      h('span', { className: 'product-brand' }, product.brand),
      h('a', { className: 'product-name', href: `/product.html?slug=${encodeURIComponent(product.slug)}` }, product.name),
      h('div', { className: 'product-rating' }, h('span', { className: 'star' }, '★'), `${Number(product.rating_avg || 0).toFixed(1)} · ${product.rating_count || 0} ulasan`),
      h('div', { className: 'price-row' }, h('span', { className: 'price' }, money(product.price)),
        product.original_price ? h('span', { className: 'old-price' }, money(product.original_price)) : null,
        discount ? h('span', { className: 'discount' }, `${discount}% OFF`) : null),
      h('div', { className: 'card-actions' },
        h('button', { className: 'btn btn-primary', type: 'button', disabled: product.stock < 1, onClick: async event => {
          const button = event.currentTarget; button.disabled = true;
          try { await post('/cart', { product_id: product.id, color: product.colors?.[0] || '', qty: 1 }); button.textContent = 'Ditambahkan'; }
          catch (error) { button.textContent = error.message; }
          finally { button.disabled = false; }
        } }, product.stock > 0 ? 'Tambah ke keranjang' : 'Stok habis'),
        h('button', { className: 'icon-btn', type: 'button', 'aria-label': `Simpan ${product.name} ke wishlist`, onClick: async event => {
          const button = event.currentTarget; button.disabled = true;
          try { await post('/wishlist', { product_id: product.id }); button.replaceChildren(icon('heart')); button.setAttribute('aria-label', 'Tersimpan di wishlist'); }
          catch (error) { button.title = error.message; }
          finally { button.disabled = false; }
        } }, icon('heart')))));
  return card;
}

async function loadBrands() {
  const root = document.querySelector('[data-brands]');
  try {
    const brands = await get('/brands');
    root.replaceChildren(...brands.map(brand => h('a', { className: 'brand-tile', href: `/shop.html?brand=${encodeURIComponent(brand.slug)}` }, brand.name)));
  } catch { root.replaceChildren(messageState('Merek belum tersedia', 'Coba muat ulang halaman beberapa saat lagi.')); }
}
