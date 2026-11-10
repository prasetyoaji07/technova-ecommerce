import { get, post } from './api.js';
import { h, icon } from './dom.js';

const CART_CHANGED_EVENT = 'cart:changed';
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const navItems = [['Home','/','home'],['Shop','/shop.html','shop'],['Categories','/shop.html?category=smartphone','categories'],['Deals','/shop.html?deal=true','deals'],['About','/#about','about']];

export async function refreshCartCount() {
  try {
    const data = await get('/cart', { redirectOn401: false });
    const total = (data.items || []).reduce((sum, item) => sum + item.qty, 0);
    document.querySelectorAll('[data-cart-count]').forEach(badge => { badge.textContent = String(total); });
  } catch (error) {
    if (error.status !== HTTP_UNAUTHORIZED && error.status !== HTTP_FORBIDDEN) console.warn('Badge keranjang gagal diperbarui:', error.message);
  }
}

export function mountLayout(active = '') {
  window.addEventListener(CART_CHANGED_EVENT, refreshCartCount);
  const header = document.querySelector('[data-site-header]');
  const footer = document.querySelector('[data-site-footer]');
  if (header) renderHeader(header, active);
  if (footer) renderFooter(footer);
  import('./chat-widget.js').catch(() => {});
}

function renderHeader(root, active) {
  const search = h('form', { className: 'header-search', action: '/shop.html', method: 'get' },
    icon('search'), h('label', { className: 'sr-only', for: 'global-search' }, 'Cari produk'),
    h('input', { id: 'global-search', className: 'field', name: 'q', placeholder: 'Cari smartphone...' }));
  const nav = h('nav', { className: 'main-nav', id: 'main-nav', 'aria-label': 'Navigasi utama' },
    ...navItems.map(([label, href, key]) => h('a', { href, 'aria-current': active === key ? 'page' : null }, label)));
  const tools = h('div', { className: 'header-tools' },
    h('a', { className: 'icon-btn', href: '/wishlist.html', title: 'Wishlist', 'aria-label': 'Wishlist' }, icon('heart')),
    h('a', { className: 'icon-btn', href: '/cart.html', title: 'Keranjang', 'aria-label': 'Keranjang' }, icon('shopping-bag'), h('span', { className: 'badge-count', 'data-cart-count': '' }, '0')),
    h('a', { className: 'account-link muted', href: '/login.html' }, 'Akun'));
  const toggle = h('button', { className: 'icon-btn menu-toggle', type: 'button', 'aria-label': 'Buka menu', 'aria-expanded': 'false', 'aria-controls': 'main-nav', onClick: event => {
    const open = nav.classList.toggle('is-open'); event.currentTarget.setAttribute('aria-expanded', String(open));
  } }, icon('menu'));
  root.replaceChildren(h('div', { className: 'container header-main' }, toggle,
    h('a', { className: 'brand-mark', href: '/', 'aria-label': 'TechNova beranda' }, h('span', { className: 'brand-symbol' }, icon('smartphone')), 'TechNova'),
    nav, search, tools));
  refreshCartCount();
  get('/auth/me', { redirectOn401: false }).then(data => {
    const account = root.querySelector('.account-link');
    if (!account || !data.user) return;
    account.textContent = data.user.name.split(' ')[0];
    account.href = '/orders.html';
    if (data.user.role === 'admin') {
      // Admin mengelola toko, bukan berbelanja: sembunyikan wishlist/keranjang dan arahkan akun ke panel admin.
      document.body.classList.add('is-admin');
      root.querySelectorAll('.header-tools a[href="/wishlist.html"], .header-tools a[href="/cart.html"]').forEach(node => node.remove());
      account.href = '/admin';
      root.querySelector('.header-tools').prepend(h('a', { className: 'account-link admin-store-link', href: '/admin' }, 'Admin'));
    }
    const logout = h('button', { className: 'account-link header-logout', type: 'button', onClick: async () => {
      logout.disabled = true;
      try { await post('/auth/logout', {}); window.location.assign('/login.html'); }
      catch (error) { logout.disabled = false; account.textContent = error.message || 'Gagal keluar'; }
    } }, 'Keluar');
    root.querySelector('.header-tools').append(logout);
  }).catch(() => {});
}

function renderFooter(root) {
  const col = (title, links) => h('div', {}, h('h3', {}, title), h('div', { className: 'footer-links' },
    ...links.map(([label, href]) => href === '#' ? h('span', {}, label) : h('a', { href }, label))));
  root.replaceChildren(h('div', { className: 'container' },
    h('div', { className: 'footer-grid' },
      h('div', {}, h('a', { className: 'brand-mark footer-brand', href: '/' }, h('span', { className: 'brand-symbol' }, icon('smartphone')), 'TechNova'),
        h('p', {}, 'Temukan perangkat yang mendukung cara kamu bekerja, belajar, dan berkarya. Pilihan jelas, belanja lebih tenang.')),
      col('Quick Links', [['Beranda','/'],['Semua Produk','/shop.html'],['Promo','/shop.html?deal=true'],['Tentang Kami','/#about']]),
      col('Categories', [['Smartphone','/shop.html?category=smartphone'],['Aksesori','/shop.html?category=aksesori']]),
      col('Customer Service', [['Bantuan','/login.html'],['Pesanan Saya','/orders.html'],['Akun','/login.html'],['Hubungi Kami','mailto:halo@technova.test']]),
      col('Payment Methods', [['Credit / Debit Card','#'],['PayPal','#'],['Apple Pay','#'],['Cash on Delivery','#']])
    ), h('div', { className: 'footer-bottom' }, '© 2026 TechNova. Data produk dan transaksi merupakan simulasi untuk keperluan proyek.')));
}

export function setupNewsletter() {
  const form = document.querySelector('[data-newsletter]');
  if (!form) return;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const input = form.querySelector('input');
    const feedback = form.querySelector('[data-feedback]');
    const button = form.querySelector('button');
    button.disabled = true;
    try { await post('/newsletter', { email: input.value.trim() }); feedback.textContent = 'Terima kasih, email kamu sudah terdaftar.'; form.reset(); }
    catch (error) { feedback.textContent = error.message; }
    finally { button.disabled = false; }
  });
}
