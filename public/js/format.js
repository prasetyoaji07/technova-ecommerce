const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
export const money = value => rupiah.format(Number(value) || 0);
export const number = value => new Intl.NumberFormat('id-ID').format(Number(value) || 0);
export const discountPercent = (price, original) => original > price ? Math.round((1 - price / original) * 100) : 0;
export const safeText = value => String(value ?? '').trim();
