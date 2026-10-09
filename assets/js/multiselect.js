// Selector múltiple reutilizable: un botón que muestra lo elegido y al
// tocarlo abre un panel con checkboxes, para elegir más de una opción de una
// sola vez. Se usa para categorías y, en fiestas, subcategorías — tanto en el
// formulario de Unirse como en el modal de edición del panel admin.
export function createMultiSelect(root, items, { placeholder = 'Seleccioná una o más opciones', onChange } = {}) {
  root.classList.add('multiselect');
  root.innerHTML = `
    <button type="button" class="multiselect-trigger">
      <span class="multiselect-trigger-text"></span>
      <span class="multiselect-arrow">▾</span>
    </button>
    <div class="multiselect-panel" hidden>
      ${items.map(it => `
        <label class="multiselect-option" data-label="${(it.emoji ? it.emoji + ' ' : '') + it.label}">
          <input type="checkbox" value="${it.value}" />
          ${it.emoji ? it.emoji + ' ' : ''}${it.label}
        </label>`).join('')}
      <button type="button" class="multiselect-done">Listo ✓</button>
    </div>`;

  const trigger = root.querySelector('.multiselect-trigger');
  const text = root.querySelector('.multiselect-trigger-text');
  const panel = root.querySelector('.multiselect-panel');
  const checkboxes = [...root.querySelectorAll('input[type=checkbox]')];

  function updateText() {
    const selected = checkboxes.filter(c => c.checked).map(c => c.closest('label').dataset.label);
    text.textContent = selected.length === 0 ? placeholder : selected.join(', ');
  }

  function open() {
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
  }
  function close() {
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
  }

  trigger.addEventListener('click', e => {
    e.stopPropagation();
    panel.hidden ? open() : close();
  });
  root.querySelector('.multiselect-done').addEventListener('click', e => {
    e.stopPropagation();
    close();
  });
  document.addEventListener('click', e => {
    if (!root.contains(e.target)) close();
  });
  checkboxes.forEach(cb => cb.addEventListener('change', () => {
    updateText();
    if (onChange) onChange(getValue());
  }));

  function getValue() {
    return checkboxes.filter(c => c.checked).map(c => c.value);
  }
  function setValue(values) {
    checkboxes.forEach(c => { c.checked = values.includes(c.value); });
    updateText();
  }

  updateText();
  return { getValue, setValue };
}
