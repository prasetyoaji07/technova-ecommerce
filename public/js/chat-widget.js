if (!document.querySelector('link[data-chat-widget-css]')) {
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet'; stylesheet.href = '/css/chat-widget.css'; stylesheet.dataset.chatWidgetCss = '';
  document.head.append(stylesheet);
}

const chatButton = document.createElement('button');
chatButton.className = 'chat-launcher'; chatButton.type = 'button';
chatButton.setAttribute('aria-label', 'Buka TechNova Assistant'); chatButton.setAttribute('aria-expanded', 'false');
const launcherIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
launcherIcon.setAttribute('viewBox', '0 0 24 24'); launcherIcon.setAttribute('aria-hidden', 'true');
const launcherPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
launcherPath.setAttribute('d', 'M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-5.5 4v-4.3A2.5 2.5 0 0 1 4 13.5z');
launcherPath.setAttribute('fill', 'none'); launcherPath.setAttribute('stroke', 'currentColor'); launcherPath.setAttribute('stroke-width', '1.8'); launcherPath.setAttribute('stroke-linejoin', 'round'); launcherIcon.append(launcherPath); chatButton.append(launcherIcon);

const panel = document.createElement('section'); panel.className = 'chat-panel'; panel.hidden = true; panel.setAttribute('aria-label', 'TechNova Assistant');
const header = document.createElement('header'); header.className = 'chat-header';
const identity = document.createElement('div'); identity.className = 'chat-identity';
const avatar = document.createElement('span'); avatar.className = 'chat-avatar'; avatar.textContent = 'T';
const identityText = document.createElement('div'); const title = document.createElement('strong'); title.textContent = 'TechNova Assistant'; const online = document.createElement('small'); online.textContent = 'Asisten belanja · Online'; identityText.append(title, online); identity.append(avatar, identityText);
const closeButton = document.createElement('button'); closeButton.type = 'button'; closeButton.className = 'chat-close'; closeButton.setAttribute('aria-label', 'Tutup chat'); closeButton.textContent = '×'; header.append(identity, closeButton);
const intro = document.createElement('div'); intro.className = 'chat-intro'; intro.textContent = 'Halo! Lagi cari smartphone yang cocok? Ceritakan kebutuhan atau budget kamu, ya.';
const suggestions = document.createElement('div'); suggestions.className = 'chat-suggestions';
const suggestionPrompts = ['HP kamera terbaik di bawah 12 juta', 'Bandingkan iPhone 16 Pro vs Galaxy S24'];
suggestionPrompts.forEach(prompt => { const chip = document.createElement('button'); chip.type = 'button'; chip.className = 'chat-chip'; chip.textContent = prompt; chip.addEventListener('click', () => sendMessage(prompt)); suggestions.append(chip); });
const messages = document.createElement('div'); messages.className = 'chat-messages'; messages.setAttribute('aria-live', 'polite');
const typing = document.createElement('div'); typing.className = 'chat-typing'; typing.hidden = true; typing.textContent = 'TechNova Assistant sedang mengetik…';
const disclaimer = document.createElement('p'); disclaimer.className = 'chat-disclaimer'; disclaimer.textContent = 'AI bisa keliru. Periksa kembali detail produk sebelum membeli.';
const form = document.createElement('form'); form.className = 'chat-form';
const input = document.createElement('input'); input.type = 'text'; input.name = 'message'; input.maxLength = 500; input.placeholder = 'Tulis pesan…'; input.autocomplete = 'off'; input.setAttribute('aria-label', 'Pesan untuk asisten'); input.required = true;
const sendButton = document.createElement('button'); sendButton.type = 'submit'; sendButton.className = 'chat-send'; sendButton.setAttribute('aria-label', 'Kirim pesan'); sendButton.textContent = '↑'; form.append(input, sendButton);
panel.append(header, intro, suggestions, messages, typing, disclaimer, form);
document.body.append(chatButton, panel);

const history = [];
let sessionId = '';
let pending = false;
function addMessage(role, text) {
  const bubble = document.createElement('article'); bubble.className = `chat-message ${role === 'user' ? 'from-user' : 'from-assistant'}`;
  const label = document.createElement('small'); label.textContent = role === 'user' ? 'Kamu' : 'TechNova Assistant';
  const content = document.createElement('p'); content.textContent = String(text || ''); bubble.append(label, content); messages.append(bubble); messages.scrollTop = messages.scrollHeight;
}
function addProductCards(products) {
  if (!Array.isArray(products) || !products.length) return;
  const group = document.createElement('div'); group.className = 'chat-product-list';
  products.slice(0, 3).forEach(product => {
    const card = document.createElement('a'); card.className = 'chat-product-card';
    card.href = `/product.html?slug=${encodeURIComponent(product.slug || '')}`;
    const image = document.createElement('img'); image.alt = ''; image.loading = 'lazy';
    const imageUrl = String(product.image_url || '');
    if (/^(https:\/\/|\/img\/)/i.test(imageUrl)) { image.src = imageUrl; image.addEventListener('error', () => { image.removeAttribute('src'); image.classList.add('is-missing'); }, { once: true }); } else image.classList.add('is-missing');
    const details = document.createElement('span'); details.className = 'chat-product-details';
    const name = document.createElement('strong'); name.textContent = product.name || 'Lihat produk';
    const price = document.createElement('small'); price.textContent = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(product.price) || 0);
    details.append(name, price); card.append(image, details); group.append(card);
  });
  messages.append(group); messages.scrollTop = messages.scrollHeight;
}
function setPending(value) { pending = value; typing.hidden = !value; input.disabled = value; sendButton.disabled = value; messages.scrollTop = messages.scrollHeight; }
function openChat() { panel.hidden = false; chatButton.setAttribute('aria-expanded', 'true'); chatButton.classList.add('is-open'); input.focus(); }
function closeChat() { panel.hidden = true; chatButton.setAttribute('aria-expanded', 'false'); chatButton.classList.remove('is-open'); chatButton.focus(); }
async function sendMessage(rawMessage) {
  const message = String(rawMessage || '').trim();
  if (!message || pending || message.length > 500) return;
  input.value = ''; addMessage('user', message); history.push({ role: 'user', content: message });
  setPending(true);
  try {
    if (!sessionId) sessionId = window.crypto?.randomUUID?.() || `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const productSlug = new URLSearchParams(window.location.search).get('slug') || undefined;
    const response = await fetch('/api/chat', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'x-chat-session': sessionId },
      body: JSON.stringify({ message, history: history.slice(-10), context: { page: window.location.pathname, ...(productSlug ? { productSlug } : {}) } })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error?.message || 'Maaf, asisten sedang sulit dihubungi. Coba lagi sebentar.');
    const data = payload.data ?? payload;
    const reply = data.reply || 'Maaf, saya belum bisa menemukan jawaban yang tepat.';
    addMessage('assistant', reply); history.push({ role: 'assistant', content: reply });
    addProductCards(data.products);
  } catch (error) {
    addMessage('assistant', error.message || 'Maaf, terjadi kendala. Silakan coba lagi.');
  } finally { setPending(false); input.focus(); }
}
chatButton.addEventListener('click', () => panel.hidden ? openChat() : closeChat());
closeButton.addEventListener('click', closeChat);
form.addEventListener('submit', event => { event.preventDefault(); sendMessage(input.value); });