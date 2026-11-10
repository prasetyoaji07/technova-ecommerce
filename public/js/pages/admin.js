import { enhanceSelects } from '/js/custom-select.js';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const rupiah = value => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0);
const number = value => new Intl.NumberFormat('id-ID').format(Number(value) || 0);
const dateText = value => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};
const STATUS = {
  placed: 'Order placed', processing: 'Processing', shipped: 'Shipped',
  out_for_delivery: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled'
};
const STATUS_CLASS = { placed: 'status-placed', processing: 'status-processing', shipped: 'status-shipped', out_for_delivery: 'status-transit', delivered: 'status-delivered', cancelled: 'status-cancelled' };
const PAGE_SIZE = 8;
const state = { tab: 'dashboard', products: [], orders: [], productPage: 1, orderPage: 1, editingProduct: null, busy: false };

function element(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined && value !== null) node.textContent = String(value);
  return node;
}
function showDialogError(message) {
  const box = $('#product-dialog-error');
  box.textContent = message; box.hidden = false;
  box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}
async function loadReferenceOptions() {
  for (const [name, path] of [['brand_id', '/api/brands'], ['category_id', '/api/categories']]) {
    try {
      const rows = await request(path);
      const select = $('#product-form').elements.namedItem(name);
      rows.forEach(row => { const option = document.createElement('option'); option.value = row.id; option.textContent = row.name; select.append(option); });
    } catch { /* dropdown tetap kosong; error muncul saat menyimpan */ }
  }
}
function setImagePreview(url) {
  const img = $('#product-image-preview');
  if (url && validateImageUrl(url)) { img.src = url; img.hidden = false; } else { img.removeAttribute('src'); img.hidden = true; }
}
function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('File gagal dibaca.'));
    reader.readAsDataURL(file);
  });
}
async function handleImageFile(event) {
  const input = event.currentTarget; const file = input.files[0]; const status = $('#product-image-status');
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { status.textContent = 'Format harus JPG, PNG, atau WebP.'; input.value = ''; return; }
  if (file.size > 2 * 1024 * 1024) { status.textContent = 'Ukuran gambar maksimal 2 MB.'; input.value = ''; return; }
  status.textContent = 'Mengunggah…';
  try {
    const result = await request('/api/admin/upload', { method: 'POST', body: JSON.stringify({ data: await readAsDataUrl(file) }) });
    $('#product-form').elements.namedItem('image_url').value = result.image_url;
    setImagePreview(result.image_url); status.textContent = 'Foto berhasil diunggah.';
  } catch (error) { status.textContent = error.message; }
  finally { input.value = ''; }
}
function showAlert(message, type = 'error') {
  const alert = $('#admin-alert');
  alert.textContent = message;
  alert.className = `admin-alert is-${type}`;
  alert.hidden = false;
  window.clearTimeout(showAlert.timer);
  showAlert.timer = window.setTimeout(() => { alert.hidden = true; }, 5200);
}
async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }
  });
  let payload = {};
  try { payload = await response.json(); } catch { /* Empty response is handled below. */ }
  if (response.status === 401 || response.status === 403) {
    window.location.assign('/login.html');
    throw new Error('Sesi admin berakhir. Silakan login kembali.');
  }
  if (!response.ok) throw new Error(payload?.error?.message || 'Permintaan gagal. Coba lagi.');
  return payload?.data ?? payload;
}
function asArray(value, keys = []) {
  if (Array.isArray(value)) return value;
  for (const key of keys) if (Array.isArray(value?.[key])) return value[key];
  return [];
}
function setBusy(button, busy, label) {
  if (!button) return;
  button.disabled = busy;
  if (busy) { button.dataset.label = button.textContent; button.textContent = label || 'Memproses…'; }
  else if (button.dataset.label) { button.textContent = button.dataset.label; delete button.dataset.label; }
}

function switchTab(tab) {
  state.tab = tab;
  $$('.admin-nav-item').forEach(button => {
    const active = button.dataset.tab === tab;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
  });
  $$('.admin-tab-panel').forEach(panel => {
    const active = panel.dataset.panel === tab;
    panel.hidden = !active;
    panel.classList.toggle('is-visible', active);
  });
  const title = tab === 'products' ? 'Produk' : tab === 'orders' ? 'Pesanan' : 'Dashboard';
  $('#page-title').textContent = title;
  $('#breadcrumb-current').textContent = title;
  $('#page-description').textContent = tab === 'products' ? 'Kelola katalog, harga, stok, dan visibilitas produk.' : tab === 'orders' ? 'Pantau pesanan pelanggan dan perbarui proses pengiriman.' : 'Pantau performa toko dan aktivitas penjualan.';
  if (tab === 'products' && !state.products.length) loadProducts();
  if (tab === 'orders' && !state.orders.length) loadOrders();
}

function readStat(stats, keys, fallback = 0) {
  for (const key of keys) if (stats?.[key] !== undefined && stats[key] !== null) return stats[key];
  return fallback;
}
function renderKpis(stats) {
  const metrics = stats.kpi || {};
  const revenue = readStat(metrics, ['revenue']);
  const orders = readStat(metrics, ['orders']);
  const aov = readStat(metrics, ['aov'], Number(orders) ? Number(revenue) / Number(orders) : 0);
  const buyers = readStat(metrics, ['buyers']);
  const cancelled = Number(readStat(metrics, ['cancelled_pct'], 0));
  const values = [
    [rupiah(revenue), 'Akumulasi nilai pesanan'],
    [number(orders), `${cancelled.toLocaleString('id-ID')}% pesanan dibatalkan`],
    [rupiah(aov), 'Average order value'],
    [number(buyers), 'Customer bertransaksi']
  ];
  $$('#kpi-grid .kpi-card').forEach((card, index) => {
    $('.kpi-value', card).textContent = values[index][0];
    $('small', card).textContent = values[index][1];
  });
  $('#revenue-total').textContent = rupiah(revenue);
}
function svgNode(tag, attrs = {}) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
}
function chartEmpty(container, message) {
  container.replaceChildren(element('div', 'chart-loading', message));
}
function renderRevenueChart(stats) {
  const container = $('#revenue-chart');
  const rows = asArray(stats.daily);
  if (!rows.length) return chartEmpty(container, 'Data tren pendapatan belum tersedia.');
  const values = rows.map(row => Number(row.revenue ?? row.total ?? row.amount ?? row.value ?? 0));
  const max = Math.max(...values, 1);
  const width = 680, height = 220, left = 44, right = 12, top = 16, bottom = 34;
  const plotW = width - left - right, plotH = height - top - bottom;
  const points = values.map((value, index) => [left + (values.length === 1 ? plotW / 2 : index * plotW / (values.length - 1)), top + plotH - (value / max) * plotH]);
  const svg = svgNode('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', 'aria-label': 'Grafik tren pendapatan' });
  for (let i = 0; i < 4; i += 1) {
    const y = top + i * plotH / 3;
    svg.append(svgNode('line', { x1: left, y1: y, x2: width - right, y2: y, class: 'chart-gridline' }));
    const label = svgNode('text', { x: left - 8, y: y + 4, 'text-anchor': 'end', class: 'chart-axis-label' });
    label.textContent = rupiah(max * (1 - i / 3)).replace(',00', '').replace('Rp', '');
    svg.append(label);
  }
  const area = `M ${points[0][0]} ${top + plotH} ` + points.map(point => `L ${point[0]} ${point[1]}`).join(' ') + ` L ${points.at(-1)[0]} ${top + plotH} Z`;
  svg.append(svgNode('path', { d: area, class: 'chart-area' }));
  svg.append(svgNode('polyline', { points: points.map(point => point.join(',')).join(' '), class: 'chart-line' }));
  points.forEach((point, index) => {
    svg.append(svgNode('circle', { cx: point[0], cy: point[1], r: 3.8, class: 'chart-point' }));
    if (index % Math.max(1, Math.ceil(rows.length / 7)) === 0 || index === rows.length - 1) {
      const label = svgNode('text', { x: point[0], y: height - 9, 'text-anchor': 'middle', class: 'chart-axis-label' });
      label.textContent = String(rows[index].date ?? rows[index].day ?? rows[index].label ?? '').slice(5, 10);
      svg.append(label);
    }
  });
  container.replaceChildren(svg);
}
function renderStatusChart(stats) {
  const container = $('#status-chart');
  const rows = asArray(stats.order_status);
  const normalized = rows.map(row => ({ status: row.status ?? row.name ?? 'unknown', count: Number(row.count ?? row.total ?? row.value ?? 0) })).filter(row => row.count >= 0);
  if (!normalized.length) { chartEmpty(container, 'Distribusi status belum tersedia.'); $('#status-legend').replaceChildren(); return; }
  const total = normalized.reduce((sum, row) => sum + row.count, 0);
  const colors = ['#1f5af0', '#6d8df5', '#16a3a5', '#16a34a', '#a5b4cf', '#dc6262'];
  let offset = 0;
  const circle = 2 * Math.PI * 58;
  const svg = svgNode('svg', { viewBox: '0 0 180 180', role: 'img', 'aria-label': 'Diagram lingkaran status pesanan' });
  normalized.forEach((row, index) => {
    const length = total ? row.count / total * circle : 0;
    svg.append(svgNode('circle', { cx: 90, cy: 90, r: 58, fill: 'none', stroke: colors[index % colors.length], 'stroke-width': 17, 'stroke-dasharray': `${length} ${circle - length}`, 'stroke-dashoffset': -offset, transform: 'rotate(-90 90 90)' }));
    offset += length;
  });
  const center = svgNode('text', { x: 90, y: 86, 'text-anchor': 'middle', class: 'donut-total' }); center.textContent = number(total); svg.append(center);
  const caption = svgNode('text', { x: 90, y: 105, 'text-anchor': 'middle', class: 'donut-caption' }); caption.textContent = 'Pesanan'; svg.append(caption);
  container.replaceChildren(svg);
  const legend = $('#status-legend'); legend.replaceChildren();
  normalized.forEach((row, index) => {
    const item = element('div', 'legend-item');
    const dot = element('i', `legend-dot legend-dot-${index % colors.length}`);
    item.append(dot, element('span', '', STATUS[row.status] || row.status), element('strong', '', number(row.count)));
    legend.append(item);
  });
}
function renderRanking(stats) {
  const rows = asArray(stats.top_products);
  const container = $('#top-products'); container.replaceChildren();
  if (!rows.length) return chartEmpty(container, 'Data produk terlaris belum tersedia.');
  rows.slice(0, 5).forEach((row, index) => {
    const item = element('div', 'ranking-item');
    item.append(element('span', 'ranking-index', String(index + 1).padStart(2, '0')));
    const info = element('div', 'ranking-info'); info.append(element('strong', '', row.name ?? row.product_name ?? 'Produk'), element('small', '', `${number(row.units ?? 0)} unit terjual`));
    item.append(info, element('strong', 'ranking-revenue', rupiah(row.revenue ?? row.total_revenue ?? 0)));
    container.append(item);
  });
}
function renderBrands(stats) {
  const rows = asArray(stats.revenue_by_brand);
  const container = $('#brand-performance'); container.replaceChildren();
  if (!rows.length) return chartEmpty(container, 'Data brand belum tersedia.');
  const max = Math.max(...rows.map(row => Number(row.revenue ?? row.total ?? 0)), 1);
  rows.slice(0, 6).forEach(row => {
    const item = element('div', 'brand-bar-item');
    const top = element('div', 'brand-bar-label'); top.append(element('strong', '', row.brand ?? row.name ?? 'Brand'), element('span', '', rupiah(row.revenue ?? row.total ?? 0)));
    const track = element('div', 'brand-bar-track');
    const bar = svgNode('svg', { viewBox: '0 0 100 7', preserveAspectRatio: 'none', role: 'img', 'aria-label': `Kontribusi ${row.brand ?? row.name ?? 'brand'}` });
    bar.append(svgNode('rect', { x: 0, y: 0, width: Math.max(2, Number(row.revenue ?? row.total ?? 0) / max * 100), height: 7, rx: 3.5, class: 'brand-bar-svg-fill' })); track.append(bar);
    item.append(top, track); container.append(item);
  });
}
async function loadDashboard() {
  const button = $('#refresh-dashboard'); setBusy(button, true, 'Memuat…');
  try {
    const stats = await request('/api/admin/stats');
    renderKpis(stats); renderRevenueChart(stats); renderStatusChart(stats); renderRanking(stats); renderBrands(stats);
  } catch (error) {
    showAlert(error.message);
    ['#revenue-chart', '#status-chart', '#top-products', '#brand-performance'].forEach(selector => chartEmpty($(selector), 'Data tidak dapat dimuat.'));
  } finally { setBusy(button, false); }
}

function productImage(product) {
  const image = document.createElement('img');
  image.className = 'product-thumb'; image.alt = ''; image.loading = 'lazy';
  const url = String(product.image_url || '');
  if (/^(https:\/\/|\/img\/)/i.test(url)) {
    image.src = url;
    image.addEventListener('error', () => { image.removeAttribute('src'); image.classList.add('is-missing'); }, { once: true });
  } else image.classList.add('is-missing');
  return image;
}
function filteredProducts() {
  const query = $('#product-search').value.trim().toLocaleLowerCase('id-ID');
  const filter = $('#product-filter').value;
  return state.products.filter(product => {
    const active = Number(product.is_active) === 1 || product.is_active === true;
    const matchesStatus = filter === 'all' || (filter === 'active' ? active : !active);
    const matchesQuery = `${product.name || ''} ${product.brand_name || product.brand || ''}`.toLocaleLowerCase('id-ID').includes(query);
    return matchesStatus && matchesQuery;
  });
}
function renderProducts() {
  const rows = filteredProducts();
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE)); state.productPage = Math.min(state.productPage, pages);
  const start = (state.productPage - 1) * PAGE_SIZE;
  const visible = rows.slice(start, start + PAGE_SIZE);
  const body = $('#products-table'); body.replaceChildren();
  if (!visible.length) { const tr = element('tr'); const td = element('td', 'table-state', 'Tidak ada produk yang cocok.'); td.colSpan = 6; tr.append(td); body.append(tr); }
  visible.forEach(product => {
    const tr = element('tr');
    const nameCell = element('td'); const productCell = element('div', 'product-cell'); productCell.append(productImage(product));
    const detail = element('div', 'product-cell-info'); detail.append(element('strong', '', product.name), element('small', '', product.brand_name || product.brand || `Brand #${product.brand_id || '—'}`)); productCell.append(detail); nameCell.append(productCell);
    const category = element('td', '', product.category_name || product.category || `Kategori #${product.category_id || '—'}`);
    const price = element('td', 'price-cell', rupiah(product.price));
    const stock = element('td'); const stockBadge = element('span', `stock-badge ${Number(product.stock) <= 5 ? 'is-low' : ''}`, `${number(product.stock)} unit`); stock.append(stockBadge);
    const active = Number(product.is_active) === 1 || product.is_active === true;
    const status = element('td'); status.append(element('span', `status-pill ${active ? 'status-active' : 'status-inactive'}`, active ? 'Aktif' : 'Nonaktif'));
    const actions = element('td', 'align-right'); const actionGroup = element('div', 'row-actions');
    const edit = element('button', 'text-action', 'Ubah'); edit.type = 'button'; edit.addEventListener('click', () => openProductDialog(product));
    const toggle = element('button', `text-action ${active ? 'text-danger' : 'text-success'}`, active ? 'Nonaktifkan' : 'Pulihkan'); toggle.type = 'button'; toggle.addEventListener('click', () => setProductActive(product, !active));
    actionGroup.append(edit, toggle); actions.append(actionGroup);
    tr.append(nameCell, category, price, stock, status, actions); body.append(tr);
  });
  $('#product-count').textContent = `${number(rows.length)} produk ditemukan`;
  $('#product-result-count').textContent = rows.length ? `Menampilkan ${start + 1}–${Math.min(start + PAGE_SIZE, rows.length)} dari ${number(rows.length)} produk` : 'Belum ada produk';
  renderPagination($('#product-pagination'), pages, state.productPage, page => { state.productPage = page; renderProducts(); });
}
function renderPagination(container, pages, current, onChange) {
  container.replaceChildren();
  if (pages <= 1) return;
  const prev = element('button', 'page-button', '‹'); prev.type = 'button'; prev.disabled = current === 1; prev.setAttribute('aria-label', 'Halaman sebelumnya'); prev.addEventListener('click', () => onChange(current - 1)); container.append(prev);
  for (let page = 1; page <= pages; page += 1) {
    if (pages > 5 && Math.abs(page - current) > 1 && page !== 1 && page !== pages) continue;
    const button = element('button', `page-button ${page === current ? 'is-current' : ''}`, page); button.type = 'button'; button.setAttribute('aria-label', `Halaman ${page}`); button.addEventListener('click', () => onChange(page)); container.append(button);
  }
  const next = element('button', 'page-button', '›'); next.type = 'button'; next.disabled = current === pages; next.setAttribute('aria-label', 'Halaman berikutnya'); next.addEventListener('click', () => onChange(current + 1)); container.append(next);
}
async function loadProducts() {
  $('#products-table').replaceChildren(); const row = element('tr'); const cell = element('td', 'table-state', 'Memuat produk…'); cell.colSpan = 6; row.append(cell); $('#products-table').append(row);
  try {
    const result = await request('/api/admin/products?active=all');
    state.products = asArray(result, ['products', 'items', 'rows']); state.productPage = 1; renderProducts();
  } catch (error) { showAlert(error.message); const row = element('tr'); const cell = element('td', 'table-state', 'Produk gagal dimuat.'); cell.colSpan = 6; row.append(cell); $('#products-table').replaceChildren(row); }
}
function validateImageUrl(value) { return /^https:\/\/[^\s]+$/i.test(value) || /^\/img\/(?!\/)[^\s]+$/i.test(value); }
function openProductDialog(product = null) {
  state.editingProduct = product;
  const form = $('#product-form'); form.reset(); $('#product-dialog-error').hidden = true;
  $('#product-image-status').textContent = 'JPG, PNG, atau WebP, maksimal 2 MB. Setelah dipilih, kolom URL gambar terisi otomatis.'; setImagePreview('');
  $('#product-dialog-title').textContent = product ? 'Ubah produk' : 'Tambah produk';
  $('#save-product').textContent = product ? 'Simpan perubahan' : 'Simpan produk';
  if (product) {
    for (const [key, value] of Object.entries(product)) {
      const field = form.elements.namedItem(key);
      if (!field) continue;
      if (field.type === 'checkbox') field.checked = Number(value) === 1 || value === true;
      else if (key === 'colors' && Array.isArray(value)) field.value = value.join(', ');
      else if (value !== null && typeof value !== 'object') field.value = value;
    }
    const specs = typeof product.specs === 'string' ? (() => { try { return JSON.parse(product.specs); } catch { return {}; } })() : (product.specs || {});
    for (const [fieldName, specKey] of [['spec_display', 'display'], ['spec_chip', 'chip'], ['spec_camera', 'camera'], ['spec_battery', 'battery'], ['spec_network', 'network']]) {
      form.elements.namedItem(fieldName).value = specs[specKey] || '';
    }
  }
  $$('.field-error', form).forEach(node => { node.textContent = ''; });
  setImagePreview(form.elements.namedItem('image_url').value);
  $('#product-dialog').showModal();
}
function closeProductDialog() { $('#product-dialog').close(); state.editingProduct = null; }
function productPayload(form) {
  const data = new FormData(form);
  const original = data.get('original_price');
  return {
    name: String(data.get('name') || '').trim(),
    slug: String(data.get('name') || '').trim().toLocaleLowerCase('id-ID').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    brand_id: Number(data.get('brand_id')), category_id: Number(data.get('category_id')), price: Number(data.get('price')),
    original_price: original ? Number(original) : null, stock: Number(data.get('stock')),
    storage: String(data.get('storage') || '').trim(), image_url: String(data.get('image_url') || '').trim(),
    description: String(data.get('description') || '').trim(),
    specs: { display: String(data.get('spec_display') || '').trim(), chip: String(data.get('spec_chip') || '').trim(), camera: String(data.get('spec_camera') || '').trim(), battery: String(data.get('spec_battery') || '').trim(), network: String(data.get('spec_network') || '').trim() },
    colors: String(data.get('colors') || '').split(',').map(value => value.trim()).filter(Boolean),
  };
}
async function saveProduct(event) {
  event.preventDefault();
  const form = event.currentTarget; const payload = productPayload(form);
  $$('.field-error', form).forEach(node => { node.textContent = ''; }); $('#product-dialog-error').hidden = true;
  if (!form.reportValidity()) return;
  if (!validateImageUrl(payload.image_url)) { $('[data-error="image_url"]', form).textContent = 'URL harus diawali https:// atau /img/.'; return; }
  if (payload.original_price !== null && payload.original_price < payload.price) { showAlert('Harga sebelum diskon harus lebih besar atau sama dengan harga jual.'); return; }
  const button = $('#save-product'); setBusy(button, true, 'Menyimpan…');
  try {
    const editing = state.editingProduct;
    await request(editing ? `/api/admin/products/${encodeURIComponent(editing.id)}` : '/api/admin/products', {
      method: editing ? 'PUT' : 'POST', body: JSON.stringify(payload)
    });
    closeProductDialog(); await loadProducts(); showAlert(editing ? 'Produk berhasil diperbarui.' : 'Produk berhasil ditambahkan.', 'success');
  } catch (error) { showDialogError(error.message); }
  finally { setBusy(button, false); }
}
async function setProductActive(product, active) {
  const message = active ? `Pulihkan ${product.name}?` : `Nonaktifkan ${product.name}? Produk tidak akan tampil di katalog.`;
  if (!window.confirm(message)) return;
  try {
    if (active) {
      await request(`/api/admin/products/${encodeURIComponent(product.id)}/restore`, { method: 'PATCH' });
    } else {
      await request(`/api/admin/products/${encodeURIComponent(product.id)}`, { method: 'DELETE' });
    }
    await loadProducts(); showAlert(active ? 'Produk berhasil dipulihkan.' : 'Produk dinonaktifkan dan disembunyikan dari katalog. Untuk melihat atau memulihkannya, ubah filter menjadi "Produk nonaktif".', 'success');
  } catch (error) { showAlert(error.message); }
}

function filteredOrders() {
  const query = $('#order-search').value.trim().toLocaleLowerCase('id-ID'); const filter = $('#order-filter').value;
  return state.orders.filter(order => {
    const status = order.status || 'placed';
    const searchable = `${order.order_number || ''} ${order.ship_name || order.customer_name || order.user_name || ''} ${order.email || ''}`.toLocaleLowerCase('id-ID');
    return (filter === 'all' || status === filter) && searchable.includes(query);
  });
}
function renderOrders() {
  const rows = filteredOrders(); const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE)); state.orderPage = Math.min(state.orderPage, pages);
  const start = (state.orderPage - 1) * PAGE_SIZE; const body = $('#orders-table'); body.replaceChildren();
  if (!rows.length) { const tr = element('tr'); const td = element('td', 'table-state', 'Belum ada pesanan yang cocok.'); td.colSpan = 6; tr.append(td); body.append(tr); }
  rows.slice(start, start + PAGE_SIZE).forEach(order => {
    const tr = element('tr');
    tr.append(element('td', 'order-number', order.order_number || `#${order.id}`));
    const customer = element('td'); customer.append(element('strong', 'customer-name', order.ship_name || order.customer_name || order.user_name || 'Customer'), element('small', 'customer-email', order.email || ''));
    tr.append(customer, element('td', '', dateText(order.created_at)), element('td', 'price-cell', rupiah(order.total)));
    const statusCell = element('td'); statusCell.append(element('span', `status-pill ${STATUS_CLASS[order.status] || 'status-placed'}`, STATUS[order.status] || order.status || '—')); tr.append(statusCell);
    const action = element('td', 'align-right'); const select = element('select', 'status-select'); select.setAttribute('aria-label', `Ubah status pesanan ${order.order_number || order.id}`);
    Object.entries(STATUS).forEach(([value, label]) => { const option = element('option', '', label); option.value = value; option.selected = value === order.status; select.append(option); });
    select.addEventListener('change', () => updateOrderStatus(order, select)); action.append(select); tr.append(action); body.append(tr);
  });
  $('#order-count').textContent = `${number(rows.length)} pesanan ditemukan`;
  $('#order-result-count').textContent = rows.length ? `Menampilkan ${start + 1}–${Math.min(start + PAGE_SIZE, rows.length)} dari ${number(rows.length)} pesanan` : 'Belum ada pesanan';
  renderPagination($('#order-pagination'), pages, state.orderPage, page => { state.orderPage = page; renderOrders(); });
}
async function loadOrders() {
  const body = $('#orders-table'); body.replaceChildren(); const tr = element('tr'); const td = element('td', 'table-state', 'Memuat pesanan…'); td.colSpan = 6; tr.append(td); body.append(tr);
  try { const result = await request('/api/admin/orders?limit=500'); state.orders = asArray(result, ['orders', 'items', 'rows']); state.orderPage = 1; renderOrders(); }
  catch (error) { showAlert(error.message); const row = element('tr'); const cell = element('td', 'table-state', 'Pesanan gagal dimuat.'); cell.colSpan = 6; row.append(cell); body.replaceChildren(row); }
}
async function updateOrderStatus(order, select) {
  const previous = order.status; const next = select.value;
  if (next === previous) return;
  select.disabled = true;
  try {
    await request(`/api/admin/orders/${encodeURIComponent(order.id)}/status`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
    order.status = next; renderOrders(); showAlert(`Status pesanan ${order.order_number || ''} diperbarui.`, 'success');
  } catch (error) { select.value = previous; showAlert(error.message); }
  finally { select.disabled = false; }
}

function bindEvents() {
  $$('.admin-nav-item').forEach(button => button.addEventListener('click', () => switchTab(button.dataset.tab)));
  $('#refresh-dashboard').addEventListener('click', loadDashboard);
  $('#product-search').addEventListener('input', () => { state.productPage = 1; renderProducts(); });
  $('#product-filter').addEventListener('change', () => { state.productPage = 1; renderProducts(); });
  $('#order-search').addEventListener('input', () => { state.orderPage = 1; renderOrders(); });
  $('#order-filter').addEventListener('change', () => { state.orderPage = 1; renderOrders(); });
  $('#add-product').addEventListener('click', () => openProductDialog());
  $('#close-product-dialog').addEventListener('click', closeProductDialog);
  $('#cancel-product').addEventListener('click', closeProductDialog);
  $('#product-form').addEventListener('submit', saveProduct);
  $('#product-dialog').addEventListener('click', event => { if (event.target === event.currentTarget) closeProductDialog(); });
  $('#footer-year').textContent = String(new Date().getFullYear());
  $('#admin-logout').addEventListener('click', logoutAdmin);
}

async function logoutAdmin() {
  const button = $('#admin-logout');
  setBusy(button, true, 'Keluar…');
  try { await request('/api/auth/logout', { method: 'POST' }); window.location.assign('/login.html'); }
  catch (error) { showAlert(error.message); setBusy(button, false); }
}

bindEvents();
enhanceSelects(document, '#product-form select, .toolbar-controls select');
loadReferenceOptions();
$('#product-image-file').addEventListener('change', handleImageFile);
$('#product-form').elements.namedItem('image_url').addEventListener('input', event => setImagePreview(event.target.value.trim()));
loadDashboard();
