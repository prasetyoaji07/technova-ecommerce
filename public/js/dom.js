export function h(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(props || {}).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (value === false && !key.startsWith('aria-') && !key.startsWith('data-')) return;
    if (key === 'className') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'dataset') Object.entries(value).forEach(([name, val]) => { node.dataset[name] = val; });
    else if (key === 'checked' || key === 'disabled' || key === 'selected' || key === 'multiple') node[key] = Boolean(value);
    else if (key === 'value') node.value = value;
    else node.setAttribute(key, value === true ? '' : String(value));
  });
  children.flat(Infinity).forEach(child => {
    if (child === null || child === undefined || child === false) return;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return node;
}

export function clear(node) { node.replaceChildren(); }
export function icon(name, className = 'icon') {
  return h('svg', { className, 'aria-hidden': 'true' }, h('use', { href: `/img/icons.svg#${name}` }));
}
export function messageState(title, message, action) {
  const box = h('div', { className: 'state', role: 'status' }, h('strong', {}, title), h('span', {}, message));
  if (action) box.append(action);
  return box;
}
