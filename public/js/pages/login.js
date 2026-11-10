import { post } from '../api.js';
import { h, icon } from '../dom.js';
import { mountLayout } from '../layout.js';

mountLayout('');
const root = document.querySelector('[data-auth-root]');
const params = new URLSearchParams(location.search);
const next = params.get('next') || '/';
render();

function render() {
  const email = h('input', { className: 'field', type: 'email', name: 'email', autocomplete: 'email', required: true, placeholder: 'nama@email.com' });
  const password = h('input', { className: 'field', type: 'password', name: 'password', autocomplete: 'current-password', required: true, placeholder: 'Masukkan password' });
  const feedback = h('p', { className: 'form-feedback', role: 'alert' });
  const button = h('button', { className: 'btn btn-primary btn-block', type: 'submit' }, 'Masuk', icon('arrow-right'));
  const form = h('form', { className: 'auth-form', onSubmit: async event => {
    event.preventDefault(); feedback.textContent = '';
    if (!email.validity.valid || !password.value) { feedback.textContent = 'Masukkan email dan password yang valid.'; return; }
    button.disabled = true; button.textContent = 'Memproses...';
    try {
      const result = await post('/auth/login', { email: email.value.trim(), password: password.value });
      location.href = result.user?.role === 'admin' ? '/admin' : (next.startsWith('/') && !next.startsWith('//') ? next : '/');
    } catch (error) { feedback.textContent = error.message; button.disabled = false; button.textContent = 'Masuk'; }
  } }, h('label', { className: 'form-field' }, 'Email', email), h('label', { className: 'form-field' }, 'Password', password), feedback, button);
  root.replaceChildren(h('section', { className: 'auth-card' }, h('span', { className: 'eyebrow' }, 'TECHNOVA ACCOUNT'),
    h('h1', {}, 'Selamat datang kembali'), h('p', { className: 'muted' }, 'Masuk untuk melanjutkan belanja dan melacak pesanan.'),
    form, h('p', { className: 'auth-switch' }, 'Belum punya akun? ', h('a', { href: '/register.html' }, 'Daftar sekarang'))));
}
