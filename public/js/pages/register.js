// Asumsi: CONTRACT.md tidak disertakan. Mengikuti kontrak register strict
// { name, email, password } pada src/routes/auth.js dan perilaku register.js asli.
import { post, ApiError } from '../api.js';
import { h, icon } from '../dom.js';
import { mountLayout } from '../layout.js';

const PASSWORD_MIN_LENGTH = 8;
const STRONG_LENGTH_ALL_TYPES = 12;
const STRONG_LENGTH_THREE_TYPES = 14;
const COMMON_PASSWORDS = new Set([
  'password', 'password123', '12345678', 'qwerty123', 'admin123', 'technova'
]);

mountLayout('');
const root = document.querySelector('[data-auth-root]');
render();

function evaluatePassword(value) {
  const password = String(value || '');
  const checks = {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    hasLetter: /[A-Za-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasUpperAndLower: /[A-Z]/.test(password) && /[a-z]/.test(password),
    hasSymbol: /[^A-Za-z0-9]/.test(password)
  };
  const serverValid = checks.minLength && checks.hasLetter && checks.hasNumber;
  const common = COMMON_PASSWORDS.has(password.toLowerCase());
  const typeCount = [
    /[A-Z]/.test(password),
    /[a-z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ].filter(Boolean).length;
  const strong = (password.length >= STRONG_LENGTH_ALL_TYPES && typeCount === 4)
    || (password.length >= STRONG_LENGTH_THREE_TYPES && typeCount >= 3);

  return {
    level: !password ? 'neutral' : (!serverValid || common ? 'weak' : (strong ? 'strong' : 'medium')),
    checks
  };
}

function render() {
  const name = h('input', {
    id: 'register-name', className: 'field', name: 'name', autocomplete: 'name',
    required: true, minlength: '2', maxlength: '80', placeholder: 'Nama lengkap'
  });
  const email = h('input', {
    id: 'register-email', className: 'field', type: 'email', name: 'email',
    autocomplete: 'email', required: true, maxlength: '180', placeholder: 'nama@email.com'
  });
  const password = h('input', {
    id: 'register-password', className: 'field', type: 'password', name: 'password',
    autocomplete: 'new-password', required: true, minlength: String(PASSWORD_MIN_LENGTH),
    placeholder: 'Minimal 8 karakter, huruf dan angka', 'aria-describedby': 'pw-strength'
  });
  const confirmPassword = h('input', {
    id: 'register-password-confirm', className: 'field', type: 'password',
    name: 'password-confirm', autocomplete: 'new-password', required: true,
    'aria-describedby': 'password-match'
  });

  const nameError = h('small', { className: 'pw-field-error', id: 'register-name-error' });
  const emailError = h('small', { className: 'pw-field-error', id: 'register-email-error' });
  const passwordError = h('small', { className: 'pw-field-error', id: 'register-password-error' });
  const confirmError = h('small', { className: 'pw-field-error', id: 'password-confirm-error' });
  password.setAttribute('aria-describedby', 'pw-strength register-password-error');
  confirmPassword.setAttribute('aria-describedby', 'password-match password-confirm-error');

  const strengthLabel = h('strong', { className: 'pw-level-label' });
  const segments = [0, 1, 2].map(() => h('span', { className: 'pw-segment' }));
  const meter = h('div', {
    className: 'pw-meter', role: 'meter', 'aria-valuemin': '0',
    'aria-valuemax': '3', 'aria-valuenow': '0', 'aria-valuetext': 'Belum diisi'
  }, ...segments);
  const checkItems = [
    ['minLength', 'Minimal 8 karakter'],
    ['hasLetter', 'Ada huruf'],
    ['hasNumber', 'Ada angka'],
    ['hasUpperAndLower', 'Ada huruf besar dan kecil'],
    ['hasSymbol', 'Ada simbol']
  ];
  const checksList = h('ul', { className: 'pw-check-list' },
    ...checkItems.map(([key, label]) => h('li', {
      className: 'pw-check', 'data-check': key
    }, h('span', { className: 'pw-check-mark', 'aria-hidden': 'true' }, '○'),
    h('span', {}, label))));
  const strength = h('section', {
    id: 'pw-strength', className: 'pw-strength strength-neutral',
    role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'
  }, h('div', { className: 'pw-strength-heading' }, 'Kekuatan password', strengthLabel),
  meter, checksList);

  const matchMessage = h('small', { className: 'pw-match-message', id: 'password-match' });
  const feedback = h('p', { className: 'form-feedback', role: 'alert' });
  const button = h('button', {
    className: 'btn btn-primary btn-block', type: 'submit', disabled: true
  }, 'Buat Akun', icon('arrow-right'));
  const submitHint = h('p', { className: 'pw-submit-hint', role: 'status', 'aria-live': 'polite' },
    'Lengkapi nama, email, dan password yang sesuai untuk mengaktifkan tombol.');

  const updateStrength = () => {
    const result = evaluatePassword(password.value);
    const labels = { neutral: '', weak: 'Lemah', medium: 'Sedang', strong: 'Kuat' };
    strength.classList.remove('strength-neutral', 'strength-weak', 'strength-medium', 'strength-strong');
    strength.classList.add(`strength-${result.level}`);
    strengthLabel.textContent = labels[result.level];
    const score = result.level === 'strong' ? 3 : result.level === 'medium' ? 2 : result.level === 'weak' ? 1 : 0;
    meter.setAttribute('aria-valuenow', String(score));
    meter.setAttribute('aria-valuetext', labels[result.level] || 'Belum diisi');
    checkItems.forEach(([key]) => {
      const item = checksList.querySelector(`[data-check="${key}"]`);
      const passed = result.checks[key];
      item.classList.toggle('is-met', passed);
      item.querySelector('.pw-check-mark').textContent = passed ? '✓' : '○';
    });
    return result;
  };

  const updateMatch = () => {
    const hasInput = Boolean(password.value || confirmPassword.value);
    const matches = Boolean(confirmPassword.value) && password.value === confirmPassword.value;
    matchMessage.textContent = !hasInput ? '' : (matches ? '✓ Password cocok' : '○ Password belum sama');
    matchMessage.classList.toggle('is-match', matches);
    matchMessage.classList.toggle('is-mismatch', hasInput && !matches);
    confirmPassword.setAttribute('aria-invalid', String(Boolean(confirmPassword.value) && !matches));
    return matches;
  };

  const updateSubmitState = () => {
    const result = evaluatePassword(password.value);
    const matches = updateMatch();
    const validName = name.value.trim().length >= 2;
    const validEmail = email.value.trim() !== '' && email.validity.valid;
    const validPassword = result.level === 'medium' || result.level === 'strong';
    const canSubmit = validName && validEmail && validPassword && matches && !isSubmitting;
    button.disabled = !canSubmit;
    if (isSubmitting) submitHint.textContent = 'Pendaftaran sedang diproses.';
    else if (!validName) submitHint.textContent = 'Masukkan nama lengkap (minimal 2 karakter).';
    else if (!validEmail) submitHint.textContent = 'Masukkan alamat email yang valid.';
    else if (!validPassword) submitHint.textContent = 'Gunakan password minimal 8 karakter dengan huruf dan angka; hindari password umum.';
    else if (!matches) submitHint.textContent = 'Ulangi password dengan nilai yang sama.';
    else submitHint.textContent = 'Semua syarat terpenuhi. Akun siap dibuat.';
    return canSubmit;
  };

  let isSubmitting = false;
  const clearFieldErrors = () => {
    [nameError, emailError, passwordError].forEach(node => { node.textContent = ''; });
    feedback.textContent = '';
  };

  name.addEventListener('input', () => { nameError.textContent = ''; updateSubmitState(); });
  email.addEventListener('input', () => { emailError.textContent = ''; updateSubmitState(); });
  password.addEventListener('input', () => {
    passwordError.textContent = '';
    updateStrength();
    updateSubmitState();
  });
  confirmPassword.addEventListener('input', () => {
    confirmError.textContent = '';
    updateSubmitState();
  });

  const form = h('form', {
    className: 'auth-form',
    onSubmit: async event => {
      event.preventDefault();
      feedback.textContent = '';
      clearFieldErrors();
      if (!updateSubmitState()) {
        feedback.textContent = 'Periksa kembali data dan persyaratan pendaftaran.';
        return;
      }

      isSubmitting = true;
      button.disabled = true;
      button.textContent = 'Mendaftarkan...';
      updateSubmitState();
      try {
        // Password konfirmasi hanya untuk validasi klien; tidak pernah dikirim ke API.
        await post('/auth/register', {
          name: name.value.trim(),
          email: email.value.trim(),
          password: password.value
        });
        location.href = '/login.html?registered=1';
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.status === 409 || error.code === 'EMAIL_EXISTS') {
            feedback.textContent = 'Email sudah terdaftar. Gunakan email lain atau masuk ke akun kamu.';
            emailError.textContent = 'Email ini sudah terdaftar.';
          } else if (error.status === 422) {
            const details = Array.isArray(error.details) ? error.details : [];
            details.forEach(detail => {
              const path = Array.isArray(detail.path) ? detail.path.join('.') : String(detail.path || '');
              const message = String(detail.message || 'Data tidak valid.');
              if (path === 'name') nameError.textContent = message;
              else if (path === 'email') emailError.textContent = message;
              else if (path === 'password') passwordError.textContent = message;
            });
            feedback.textContent = details.length
              ? 'Ada data yang perlu diperbaiki. Periksa keterangan pada kolom terkait.'
              : 'Data pendaftaran tidak valid. Periksa kembali nama, email, dan password.';
          } else if (error.status === 429) {
            feedback.textContent = 'Terlalu banyak percobaan pendaftaran. Silakan coba lagi beberapa saat.';
          } else {
            feedback.textContent = error.message || 'Pendaftaran belum berhasil. Silakan coba lagi.';
          }
        } else if (!error?.status || error instanceof TypeError) {
          feedback.textContent = 'Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.';
        } else {
          feedback.textContent = 'Terjadi kesalahan. Silakan coba lagi.';
        }
        isSubmitting = false;
        button.textContent = 'Buat Akun';
        button.append(icon('arrow-right'));
        updateSubmitState();
      }
    }
  },
  h('label', { className: 'form-field', for: 'register-name' }, 'Nama lengkap', name, nameError),
  h('label', { className: 'form-field', for: 'register-email' }, 'Email', email, emailError),
  h('div', { className: 'pw-field-group' },
    h('label', { className: 'form-field', for: 'register-password' }, 'Password', password, passwordError),
    strength),
  h('div', { className: 'pw-field-group' },
    h('label', { className: 'form-field', for: 'register-password-confirm' }, 'Ulangi password', confirmPassword),
    matchMessage, confirmError),
  feedback, button, submitHint);

  root.replaceChildren(h('section', { className: 'auth-card' },
    h('span', { className: 'eyebrow' }, 'GABUNG TECHNOVA'),
    h('h1', {}, 'Buat akun baru'),
    h('p', { className: 'muted' }, 'Daftar untuk menyimpan keranjang dan memantau pesanan.'),
    form,
    h('p', { className: 'auth-switch' }, 'Sudah punya akun? ', h('a', { href: '/login.html' }, 'Masuk'))));
  updateStrength();
  updateSubmitState();
}
