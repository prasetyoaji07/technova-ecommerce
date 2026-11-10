import { get, post } from '../api.js';
import { h, icon, messageState } from '../dom.js';
import { money, discountPercent } from '../format.js';
import { mountLayout } from '../layout.js';

mountLayout('shop');
const params = new URLSearchParams(location.search);
const productsRoot = document.querySelector('[data-products]');
const brandSelect = document.querySelector('#filter-brand');
const categorySelect = document.querySelector('#filter-category');
const count = document.querySelector('[data-result-count]');
let page = Math.max(1, Number(params.get('page')) || 1);
const MOBILE_QUERY = '(max-width: 639px)';

brandSelect.value = params.get('brand') || '';
categorySelect.value = params.get('category') || '';
document.querySelector('#filter-min').value = params.get('min') || '';
document.querySelector('#filter-max').value = params.get('max') || '';
document.querySelector('#filter-deal').value = params.get('deal') || '';
document.querySelector('#sort-products').value = params.get('sort') || 'popular';

Promise.all([get('/brands'), get('/categories')]).then(([brands, categories]) => {
  brands.forEach(item => brandSelect.append(h('option', { value: item.slug }, item.name)));
  categories.forEach(item => categorySelect.append(h('option', { value: item.slug }, item.name)));
  brandSelect.value = params.get('brand') || '';
  categorySelect.value = params.get('category') || '';
}).catch(() => {}).finally(loadProducts);

document.querySelector('.filter-submit').addEventListener('click', async () => {
  page = 1;
  await loadProducts();
  if (window.matchMedia(MOBILE_QUERY).matches) count.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
document.querySelector('#sort-products').addEventListener('change', () => { page = 1; loadProducts(); });

async function loadProducts() {
  const query = new URLSearchParams({ page: String(page), limit: '12', sort: document.querySelector('#sort-products').value });
  const values = { q: params.get('q'), brand: brandSelect.value, category: categorySelect.value,
    min: document.querySelector('#filter-min').value, max: document.querySelector('#filter-max').value,
    deal: document.querySelector('#filter-deal').value };
  Object.entries(values).forEach(([key, value]) => { if (value !== '' && value !== null) query.set(key, value); });
  productsRoot.replaceChildren(...Array.from({ length: 8 }, () =>
  h('div', { className: 'product-card' },
    h('div', { className: 'skeleton skeleton-media' }),
    h('div', { className: 'product-info' },
      h('div', { className: 'skeleton skeleton-line' }),
      h('div', { className: 'skeleton skeleton-line short' })
    )
  )
));
  count.textContent = 'Memuat katalog...';
  try {
    const result = await get(`/products?${query}`);
    count.textContent = `${result.pagination.total} produk ditemukan`;
    productsRoot.replaceChildren(...(result.items.length ? result.items.map(productCard) : [messageState('Produk tidak ditemukan', 'Ubah filter atau kata kunci pencarianmu.')]));
    renderPagination(result.pagination.pages);
    history.replaceState({}, '', `${location.pathname}?${query.toString()}`);
  } catch (error) {
    count.textContent = 'Katalog tidak tersedia';
    productsRoot.replaceChildren(messageState('Gagal memuat produk', error.message, h('button', { className: 'btn btn-outline', onClick: loadProducts }, 'Coba lagi')));
  }
}

function productCard(product) {
  const off = discountPercent(product.price, product.original_price);
  return h('article', { className: 'product-card' },
    h('a', { className: 'product-media', href: `/product.html?slug=${encodeURIComponent(product.slug)}` },
      product.is_best_seller ? h('span', { className: 'product-tag' }, 'Best Seller') : null,
      h('img', { src: product.image_url, alt: product.name, loading: 'lazy' })),
    h('div', { className: 'product-info' }, h('span', { className: 'product-brand' }, product.brand),
      h('a', { className: 'product-name', href: `/product.html?slug=${encodeURIComponent(product.slug)}` }, product.name),
      h('div', { className: 'product-rating' }, h('span', { className: 'star' }, '★'), `${Number(product.rating_avg || 0).toFixed(1)} · ${product.rating_count || 0} ulasan`),
      h('div', { className: 'price-row' }, h('span', { className: 'price' }, money(product.price)), product.original_price ? h('span', { className: 'old-price' }, money(product.original_price)) : null, off ? h('span', { className: 'discount' }, `${off}% OFF`) : null),
      h('div', { className: 'card-actions' },
        h('button', { className: 'btn btn-primary', disabled: product.stock < 1, onClick: async event => {
          const button = event.currentTarget; button.disabled = true;
          try { await post('/cart', { product_id: product.id, color: product.colors?.[0] || '', qty: 1 }); button.textContent = 'Ditambahkan'; }
          catch (error) { button.textContent = error.message; }
          finally { button.disabled = false; }
        } }, product.stock > 0 ? 'Tambah' : 'Stok habis'),
        h('button', { className: 'icon-btn', 'aria-label': 'Simpan ke wishlist', onClick: async event => {
          const button = event.currentTarget; button.disabled = true;
          try { await post('/wishlist', { product_id: product.id }); button.replaceChildren(icon('heart')); }
          catch (error) { button.title = error.message; }
          finally { button.disabled = false; }
        } }, icon('heart')))));
}

function renderPagination(totalPages) {
  const root = document.querySelector('[data-pagination]');
  const buttons = [];
  if (totalPages > 1) {
    for (let n = 1; n <= totalPages; n += 1) buttons.push(h('button', { className: n === page ? 'btn btn-primary' : 'btn btn-outline', 'aria-current': n === page ? 'page' : null, onClick: () => { page = n; loadProducts(); } }, String(n)));
  }
  root.replaceChildren(...buttons);
}
