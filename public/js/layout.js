import { get, post } from './api.js';
import { h, icon } from './dom.js';

const navItems = [['Home','/','home'],['Shop','/shop.html','shop'],['Categories','/shop.html?category=smartphone','categories'],['Deals','/shop.html?deal=true','deals'],['About','/#about','about']];

export function mountLayout(active = '') {
  const header = document.querySelector('[data-site-header]');
  const footer = document.querySelector('[data-site-footer]');
  if (header) renderHeader(header, active);
  if (footer) renderFooter(footer);
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
  get('/cart', { redirectOn401: false }).then(data => {
    const badge = root.querySelector('[data-cart-count]');
    if (badge) badge.textContent = String((data.items || []).reduce((sum, item) => sum + item.qty, 0));
  }).catch(() => {});
  get('/auth/me', { redirectOn401: false }).then(data => {
    const account = root.querySelector('.account-link');
    if (account && data.user) { account.textContent = data.user.name.split(' ')[0]; account.href = '/orders.html'; }
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
