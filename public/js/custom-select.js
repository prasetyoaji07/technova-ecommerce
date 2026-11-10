// Dropdown kustom: daftar opsi dirender DI DALAM halaman (bukan popup native OS),
// sehingga lebarnya selalu mengikuti field dan tidak keluar dari frame/viewport.
// <select> asli tetap ada (disembunyikan) -> .value, event "change", dan form tetap bekerja.
const proto = HTMLSelectElement.prototype;
const valueDesc = Object.getOwnPropertyDescriptor(proto, 'value');

function enhance(select) {
  if (select.dataset.csReady) return;
  select.dataset.csReady = '1';

  const wrap = document.createElement('div');
  wrap.className = 'cs';
  select.before(wrap);
  wrap.append(select);
  select.classList.add('cs-native');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'field cs-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  const text = document.createElement('span');
  text.className = 'cs-text';
  trigger.append(text);

  const list = document.createElement('ul');
  list.className = 'cs-list';
  list.setAttribute('role', 'listbox');
  list.hidden = true;
  wrap.append(trigger, list);

  const label = select.id && document.querySelector(`label[for="${select.id}"]`);
  if (label) {
    if (!label.id) label.id = `${select.id}-label`;
    trigger.setAttribute('aria-labelledby', label.id);
    label.addEventListener('click', e => { e.preventDefault(); trigger.focus(); });
  }

  let active = -1;
  const items = () => [...list.children];

  function render() {
    list.replaceChildren();
    [...select.options].forEach((opt, i) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.className = 'cs-option';
      li.textContent = opt.textContent;
      li.dataset.index = String(i);
      if (opt.disabled) li.setAttribute('aria-disabled', 'true');
      list.append(li);
    });
    sync();
  }

  function sync() {
    const opt = select.options[select.selectedIndex];
    text.textContent = opt ? opt.textContent : '';
    items().forEach((li, i) => {
      const on = i === select.selectedIndex;
      li.classList.toggle('is-selected', on);
      li.setAttribute('aria-selected', String(on));
    });
  }

  function setActive(i) {
    const els = items();
    if (!els.length) return;
    active = Math.max(0, Math.min(els.length - 1, i));
    els.forEach((el, n) => el.classList.toggle('is-active', n === active));
    els[active].scrollIntoView({ block: 'nearest' });
  }

  function open() {
    if (!list.hidden || select.disabled) return;
    list.hidden = false;
    wrap.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    // buka ke atas jika ruang di bawah tidak cukup
    const r = trigger.getBoundingClientRect();
    const need = Math.min(list.scrollHeight, 260) + 8;
    wrap.classList.toggle('is-up', window.innerHeight - r.bottom < need && r.top > window.innerHeight - r.bottom);
    setActive(Math.max(0, select.selectedIndex));
  }

  function close(focus) {
    if (list.hidden) return;
    list.hidden = true;
    wrap.classList.remove('is-open', 'is-up');
    trigger.setAttribute('aria-expanded', 'false');
    if (focus) trigger.focus();
  }

  function choose(i) {
    const opt = select.options[i];
    if (!opt || opt.disabled) return;
    const changed = select.selectedIndex !== i;
    valueDesc.set.call(select, opt.value);
    sync();
    close(true);
    if (changed) {
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  trigger.addEventListener('click', () => (list.hidden ? open() : close()));
  list.addEventListener('mousedown', e => e.preventDefault()); // jaga fokus di tombol
  list.addEventListener('click', e => {
    const li = e.target.closest('.cs-option');
    if (li) choose(Number(li.dataset.index));
  });
  list.addEventListener('mousemove', e => {
    const li = e.target.closest('.cs-option');
    if (li) setActive(Number(li.dataset.index));
  });
  trigger.addEventListener('keydown', e => {
    const k = e.key;
    if (list.hidden) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(k)) { e.preventDefault(); open(); }
      return;
    }
    if (k === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
    else if (k === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
    else if (k === 'Home') { e.preventDefault(); setActive(0); }
    else if (k === 'End') { e.preventDefault(); setActive(items().length - 1); }
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); choose(active); }
    else if (k === 'Escape') { e.preventDefault(); close(true); }
    else if (k === 'Tab') close();
    else if (k.length === 1) { // type-ahead
      const q = k.toLowerCase();
      const from = [...select.options].findIndex((o, i) => i > active && o.textContent.trim().toLowerCase().startsWith(q));
      const hit = from >= 0 ? from : [...select.options].findIndex(o => o.textContent.trim().toLowerCase().startsWith(q));
      if (hit >= 0) setActive(hit);
    }
  });
  document.addEventListener('click', e => { if (!wrap.contains(e.target)) close(); });
  window.addEventListener('resize', () => close());

  // sinkron saat JS lain menambah opsi atau mengisi select.value = ...
  new MutationObserver(render).observe(select, { childList: true, characterData: true, subtree: true });
  Object.defineProperty(select, 'value', {
    configurable: true,
    get() { return valueDesc.get.call(this); },
    set(v) { valueDesc.set.call(this, v); sync(); },
  });
  select.addEventListener('change', sync);
  select.form?.addEventListener('reset', () => setTimeout(sync));
  render();
}

export function enhanceSelects(root = document, selector = 'select.field') {
  root.querySelectorAll(selector).forEach(enhance);
}
enhanceSelects();
