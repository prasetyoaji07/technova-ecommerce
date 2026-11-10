import { h } from './dom.js';

const NAME_MAX = 100;
const NAME_MIN = 2;
const ADDRESS_MIN = 5;
const ADDRESS_MAX = 300;
const POSTAL_LENGTH = 5;
const PHONE_MAX = 16;
const CARD_MIN_DIGITS = 13;
const CARD_MAX_DIGITS = 19;
const CARD_GROUP_SIZE = 4;
const EXPIRY_MAX = 5;
const EXPIRY_MONTH_DIGITS = 2;
const CENTURY = 2000;
const CVV_MIN = 3;
const CVV_MAX = 4;

const NAME_PATTERN = /^[\p{L}][\p{L}\s.'’-]*$/u;
const NAME_DISALLOWED = /[^\p{L}\s.'’-]/gu;
const ADDRESS_DISALLOWED = /[^\p{L}\p{N}\s.,/#'’()-]/gu;
const PHONE_PATTERN = /^(?:\+62|62|0)8\d{8,12}$/;
const CARD_PATTERN = new RegExp(`^\\d{${CARD_MIN_DIGITS},${CARD_MAX_DIGITS}}$`);
const CVV_PATTERN = new RegExp(`^\\d{${CVV_MIN},${CVV_MAX}}$`);
const NAME_MESSAGE = 'hanya boleh berisi huruf, spasi, titik, apostrof, dan tanda hubung.';

const digitsOnly = value => value.replace(/\D/g, '');

function formatCard(value) {
  const digits = digitsOnly(value).slice(0, CARD_MAX_DIGITS);
  return digits.replace(new RegExp(`(\\d{${CARD_GROUP_SIZE}})(?=\\d)`, 'g'), '$1 ');
}

function formatExpiry(value) {
  const digits = digitsOnly(value).slice(0, EXPIRY_MONTH_DIGITS * 2);
  return digits.length > EXPIRY_MONTH_DIGITS ? `${digits.slice(0, EXPIRY_MONTH_DIGITS)}/${digits.slice(EXPIRY_MONTH_DIGITS)}` : digits;
}

function checkExpiry(value) {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!match) return 'Masa berlaku harus berformat MM/YY.';
  const month = Number(match[1]);
  const year = CENTURY + Number(match[2]);
  const now = new Date();
  if (month < 1 || month > 12) return 'Bulan masa berlaku harus 01 sampai 12.';
  if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) return 'Kartu sudah kedaluwarsa.';
  return '';
}

export const FIELD_RULES = {
  ship_name: { label: 'Nama lengkap', min: NAME_MIN, max: NAME_MAX, autocomplete: 'name', inputmode: 'text',
    sanitize: value => value.replace(NAME_DISALLOWED, ''), pattern: NAME_PATTERN, message: `Nama ${NAME_MESSAGE}` },
  ship_address: { label: 'Alamat', min: ADDRESS_MIN, max: ADDRESS_MAX, autocomplete: 'street-address', inputmode: 'text',
    sanitize: value => value.replace(ADDRESS_DISALLOWED, ''), pattern: /\p{L}/u, message: 'Alamat harus memuat nama jalan, bukan angka saja.' },
  ship_city: { label: 'Kota', min: NAME_MIN, max: NAME_MAX, autocomplete: 'address-level2', inputmode: 'text',
    sanitize: value => value.replace(NAME_DISALLOWED, ''), pattern: NAME_PATTERN, message: `Kota ${NAME_MESSAGE}` },
  ship_postal_code: { label: 'Kode pos', min: POSTAL_LENGTH, max: POSTAL_LENGTH, autocomplete: 'postal-code', inputmode: 'numeric',
    sanitize: value => digitsOnly(value), pattern: new RegExp(`^\\d{${POSTAL_LENGTH}}$`), message: `Kode pos harus ${POSTAL_LENGTH} digit angka.` },
  ship_phone: { label: 'Nomor telepon', min: 1, max: PHONE_MAX, autocomplete: 'tel', inputmode: 'tel', type: 'tel',
    sanitize: value => value.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, ''), pattern: PHONE_PATTERN,
    message: 'Nomor telepon harus nomor HP Indonesia, contoh 081234567890.' },
  card_number: { label: 'Nomor kartu', min: 1, max: CARD_MAX_DIGITS + Math.floor(CARD_MAX_DIGITS / CARD_GROUP_SIZE), autocomplete: 'cc-number', inputmode: 'numeric',
    sanitize: formatCard, normalize: digitsOnly, pattern: CARD_PATTERN, message: `Nomor kartu harus ${CARD_MIN_DIGITS}–${CARD_MAX_DIGITS} digit angka.` },
  expiry: { label: 'Masa berlaku', min: 1, max: EXPIRY_MAX, autocomplete: 'cc-exp', inputmode: 'numeric',
    sanitize: formatExpiry, check: checkExpiry },
  cvv: { label: 'CVV', min: 1, max: CVV_MAX, autocomplete: 'cc-csc', inputmode: 'numeric',
    sanitize: value => digitsOnly(value).slice(0, CVV_MAX), pattern: CVV_PATTERN, message: `CVV harus ${CVV_MIN}–${CVV_MAX} digit angka.` }
};

export function sanitize(rule, raw) { return rule.sanitize(String(raw ?? '')).slice(0, rule.max); }

export function validate(rule, raw) {
  const value = sanitize(rule, raw).trim();
  const target = rule.normalize ? rule.normalize(value) : value;
  if (!value) return `${rule.label} wajib diisi.`;
  if (value.length < rule.min) return `${rule.label} minimal ${rule.min} karakter.`;
  if (rule.pattern && !rule.pattern.test(target)) return rule.message;
  return rule.check ? rule.check(value) : '';
}

export function createField(name, placeholder, value = '') {
  const rule = FIELD_RULES[name];
  const id = `field-${name}`;
  const errorId = `${id}-error`;
  const error = h('small', { id: errorId, className: 'form-error', role: 'alert' });
  const input = h('input', {
    id, className: 'field', name, type: rule.type || 'text', placeholder, maxlength: String(rule.max),
    inputmode: rule.inputmode, autocomplete: rule.autocomplete, required: true, 'aria-describedby': errorId,
    'aria-invalid': 'false', value: sanitize(rule, value)
  });
  const check = () => {
    const message = validate(rule, input.value);
    error.textContent = message;
    input.setAttribute('aria-invalid', String(Boolean(message)));
    return !message;
  };
  input.addEventListener('input', () => {
    const clean = sanitize(rule, input.value);
    if (clean !== input.value) input.value = clean;
    if (input.getAttribute('aria-invalid') === 'true') check();
  });
  input.addEventListener('blur', () => { if (input.value) check(); });
  const node = h('div', { className: 'form-field' }, h('label', { for: id }, rule.label), input, error);
  return { node, input, check, value: () => input.value.trim() };
}

// Validasi semua field; fokus ke field pertama yang salah. Mengembalikan true bila semua valid.
export function checkAll(fields) {
  const results = fields.map(field => field.check());
  const firstInvalid = fields.find((field, index) => !results[index]);
  if (firstInvalid) firstInvalid.input.focus();
  return !firstInvalid;
}
