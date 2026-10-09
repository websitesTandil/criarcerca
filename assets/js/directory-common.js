import { categoryLabel } from "./categories.js";
import { subcategoryLabel } from "./subcategories.js";

// Todas las categorías de un proveedor. "categories" es la lista completa
// (incluye la principal); si todavía no la tiene cargada (proveedores viejos,
// de antes de permitir varias categorías) se usa su única "category" de siempre.
export function categoriesOf(p) {
  return Array.isArray(p.categories) && p.categories.length > 0 ? p.categories : [p.category];
}

export function subcategoriasOf(p) {
  return Array.isArray(p.subcategorias) && p.subcategorias.length > 0 ? p.subcategorias : [p.subcategoria].filter(Boolean);
}

// contextCategory: la categoría de la página donde se está mostrando la tarjeta
// (ej. "alimentos" en /categorias/alimentos-saludables-tandil.html). Si el
// proveedor aparece ahí por una categoría secundaria, se muestra esa en vez de
// la principal. La subcategoría (hoy solo existe para "fiestas") solo aplica
// cuando se está mostrando la categoría principal, que es la única con la que
// se relaciona al cargar el formulario.
function displayLabel(p, contextCategory) {
  const cat = contextCategory || p.category;
  if (cat === p.category && p.subcategoria) return subcategoryLabel(p.category, p.subcategoria);
  return categoryLabel(cat);
}

// Arma el número para wa.me a partir de lo que carga el proveedor. Si empieza
// con "+" se respeta tal cual (ya trae su propio código de país, para los
// pocos casos de WhatsApp no argentino); si no, se le antepone el 54 como
// siempre. En ambos casos se descarta cualquier espacio/guión/etc. que se
// haya colado al cargar el dato.
function whatsappNumber(raw) {
  const trimmed = (raw || '').trim();
  const digits = trimmed.replace(/\D/g, '');
  return trimmed.startsWith('+') ? digits : `54${digits}`;
}

export function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

// Minúsculas y sin tildes, para que "pasteleria" encuentre "Pastelería".
function normalizeText(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Búsqueda del listado (servicios.html y páginas de categoría): nombre, negocio,
// descripción, tipo de servicio y ubicación (así alguien de otra ciudad, ej.
// Balcarce, encuentra a esas proveedoras escribiendo su localidad). Sin
// término, todo coincide.
export function matchesSearch(p, term) {
  const q = normalizeText(term).trim();
  if (!q) return true;
  return normalizeText([p.name, p.negocio, stripHtml(p.description), displayLabel(p), p.location].join(' ')).includes(q);
}

export function providerCardHtml(p, contextCategory) {
  return `
    <div class="provider-card fade-in" onclick="window._openModal('${p.id}')">
      <div class="card-image ${p.image ? '' : (p.color || 'color-1')}">
        ${p.image ? `<img src="${p.image}" alt="${p.name}" />` : `<span>${p.emoji || '🌿'}</span>`}
        <span class="card-category">${displayLabel(p, contextCategory)}</span>
        ${p.beneficio ? `<span class="card-benefit">🎁 Beneficio</span>` : ''}
      </div>
      <div class="card-body">
        <h3>${p.name}</h3>
        ${p.negocio ? `<p class="card-negocio">${p.negocio}</p>` : ''}
        <p>${stripHtml(p.description).substring(0, 90)}${p.description.length > 90 ? '...' : ''}</p>
        <div class="card-footer">
          <span class="card-location">📍 ${p.location}</span>
          <span class="card-contact">Ver más</span>
        </div>
      </div>
    </div>`;
}

export function isFeatured(p) {
  return p.plan === 'estandar' || p.plan === 'premium';
}

// Orden de activación del plan (planDesde, lo carga el panel al activarlo): el
// que se activó primero va primero. Los que no tienen fecha van al final, en su
// orden de alta.
export function sortFeatured(list) {
  return [...list].sort((a, b) => (a.planDesde || '9999').localeCompare(b.planDesde || '9999'));
}

// Tarjeta del carrusel de destacados (home y parte superior de cada categoría).
export function destacadoCardHtml(p) {
  // Premium tiene página propia: va directo ahí en vez de abrir el modal.
  const isPremium = p.plan === 'premium';
  const tag = isPremium ? 'a' : 'div';
  const linkAttr = isPremium ? `href="/negocio.html?id=${p.id}"` : `onclick="window._openModal('${p.id}')"`;
  return `
    <${tag} class="destacado-card" ${linkAttr}>
      <div class="destacado-image ${p.image ? '' : (p.color || 'color-1')}">
        ${p.image ? `<img src="${p.image}" alt="${p.name}" />` : `<span>${p.emoji || '🌿'}</span>`}
        ${p.plan === 'premium' ? `<span class="destacado-tag">✨ Premium</span>` : ''}
        ${p.beneficio ? `<span class="destacado-benefit">🎁 Beneficio</span>` : ''}
      </div>
      <div class="destacado-body">
        <span class="destacado-cat">${displayLabel(p)}</span>
        <h3>${p.name}</h3>
        ${p.negocio ? `<p class="destacado-negocio">${p.negocio}</p>` : ''}
        <span class="destacado-location">📍 ${p.location}</span>
      </div>
    </${tag}>`;
}

// Tarjeta ancha de destacado para la página de categoría: muestra la misma
// información que el modal (descripción, zona, Instagram, beneficio) y los botones
// de contacto, sin tener que abrir nada.
export function destacadoWideHtml(p, contextCategory) {
  const useInstagram = p.noWhatsapp && p.instagram;
  const contact = useInstagram
    ? `<a class="dw-btn" href="https://instagram.com/${p.instagram.replace('@', '')}" target="_blank" onclick="window._trackContactLink('${p.id}','instagram','destacado_categoria')">Ver en Instagram</a>`
    : `<a class="dw-btn" href="https://wa.me/${whatsappNumber(p.whatsapp)}?text=${encodeURIComponent('Hola! Te contacto desde Criar Cerca 🌿')}" target="_blank" onclick="window._trackContactLink('${p.id}','whatsapp','destacado_categoria')">Contactar por WhatsApp</a>`;

  return `
    <article class="destacado-wide">
      <div class="dw-image ${p.image ? '' : (p.color || 'color-1')}">
        ${p.image ? `<img src="${p.image}" alt="${p.name}" />` : `<span>${p.emoji || '🌿'}</span>`}
        ${p.plan === 'premium' ? `<span class="destacado-tag">✨ Premium</span>` : ''}
      </div>
      <div class="dw-body">
        <span class="dw-cat">${displayLabel(p, contextCategory)}</span>
        <h4>${p.name}</h4>
        ${p.negocio ? `<p class="dw-negocio">${p.negocio}</p>` : ''}
        <div class="dw-desc">${stripHtml(p.description.replace(/<br\s*\/?>/gi, '\n'))}</div>
        <button type="button" class="dw-toggle" hidden onclick="window._toggleDesc(this)">Leer más</button>
        ${p.beneficio ? `<div class="modal-benefit">🎁 <strong>Beneficio por contactar desde Criar Cerca:</strong> ${p.beneficio}</div>` : ''}
        <div class="dw-info">
          <span>📍 ${p.location}</span>
          ${p.instagram ? `<a href="https://instagram.com/${p.instagram.replace('@', '')}" target="_blank" onclick="window._trackContactLink('${p.id}','instagram','destacado_categoria')">${p.instagram}</a>` : ''}
        </div>
        <div class="dw-actions">
          ${contact}
          ${p.plan === 'premium' ? `<a class="dw-more" href="/negocio.html?id=${p.id}">Ver más info →</a>` : ''}
        </div>
      </div>
    </article>`;
}

// "Leer más" de las tarjetas anchas: la descripción se corta a unas líneas y el
// botón solo aparece si el texto realmente no entra; despliega ahí mismo.
let descTogglesBound = false;

function checkDescOverflow() {
  document.querySelectorAll('.dw-desc:not(.expanded)').forEach(desc => {
    desc.nextElementSibling.hidden = desc.scrollHeight <= desc.clientHeight + 1;
  });
}

export function initDescToggles() {
  if (!descTogglesBound) {
    descTogglesBound = true;
    window._toggleDesc = function(btn) {
      const desc = btn.previousElementSibling;
      const expanded = desc.classList.toggle('expanded');
      btn.textContent = expanded ? 'Ver menos' : 'Leer más';
    };
    window.addEventListener('resize', checkDescOverflow);
  }
  checkDescOverflow();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(checkDescOverflow);
}

// origen: desde dónde llegó la vista o el click (destacado_home,
// destacado_categoria, listado, pagina_completa). Sirve para medir cuánto
// aportan los destacados.
export function trackProviderView(provider, origen = 'listado') {
  if (typeof gtag !== 'function') return;
  gtag('event', 'ver_proveedor', {
    proveedor_nombre: provider.name,
    proveedor_categoria: provider.category,
    origen,
  });
}

export function trackProviderContact(provider, canal, origen = 'listado') {
  if (typeof gtag !== 'function') return;
  gtag('event', 'contacto_proveedor', {
    proveedor_nombre: provider.name,
    proveedor_categoria: provider.category,
    canal_contacto: canal,
    origen,
    traffic_source: document.referrer ? new URL(document.referrer).hostname : '(direct)'
  });
}

// Instala en window los handlers del modal de detalle. getProviderById(id) debe
// devolver el provider correspondiente desde el estado de la página que lo llama.
// origen: de dónde se abre el modal (en la home, el carrusel de destacados).
// contextCategory: la categoría de la página (igual que en displayLabel). Puede
// ser un valor fijo o una función que la devuelve, para páginas donde cambia
// sin volver a instalar el modal (ej. servicios.html al tocar "Otros").
export function setupModal(getProviderById, origen = 'listado', contextCategory) {
  const resolveContext = () => typeof contextCategory === 'function' ? contextCategory() : contextCategory;

  window._trackInstagramLink = function(id) {
    const p = getProviderById(id);
    if (!p) return;
    trackProviderContact(p, 'instagram', origen);
  };

  window._trackContactLink = function(id, canal, origenLink = origen) {
    const p = getProviderById(id);
    if (!p) return;
    trackProviderContact(p, canal, origenLink);
  };

  window._openModal = function(id) {
    const p = getProviderById(id);
    if (!p) return;

    trackProviderView(p, origen);

    const modalHeader = document.getElementById('modalHeader');
    modalHeader.className = `modal-header ${p.image ? '' : (p.color || 'color-1')}`;
    if (p.image) {
      modalHeader.style.background = 'white';
      document.getElementById('modalEmoji').innerHTML = `
        <div style="border:2px solid #e2d8cc;border-radius:16px;padding:16px;background:white;display:flex;align-items:center;justify-content:center">
          <img src="${p.image}" alt="${p.name}" style="max-height:130px;max-width:200px;object-fit:contain" />
        </div>`;
    } else {
      modalHeader.style.background = '';
      document.getElementById('modalEmoji').textContent = p.emoji || '🌿';
    }

    document.getElementById('modalCat').textContent = displayLabel(p, resolveContext());
    document.getElementById('modalName').textContent = p.name;
    const modalNegocio = document.getElementById('modalNegocio');
    modalNegocio.textContent = p.negocio || '';
    modalNegocio.style.display = p.negocio ? 'block' : 'none';
    document.getElementById('modalDesc').innerHTML = p.description;
    document.getElementById('modalInfo').innerHTML = `
      ${p.beneficio ? `<div class="modal-benefit">🎁 <strong>Beneficio por contactar desde Criar Cerca:</strong> ${p.beneficio}</div>` : ''}
      <div class="modal-info-row"><span class="label">📍 Zona</span><span>${p.location}</span></div>
      ${p.instagram ? `<div class="modal-info-row">
        <span class="label">Instagram</span>
        <a href="https://instagram.com/${p.instagram.replace('@','')}" target="_blank" style="color:var(--green-mid)" onclick="window._trackInstagramLink('${p.id}')">${p.instagram}</a>
      </div>` : ''}
      ${p.plan === 'premium' ? `<a href="/negocio.html?id=${p.id}" class="modal-page-link">Ver más info →</a>` : ''}
    `;

    const contactBtn = document.getElementById('modalContact');
    if (p.noWhatsapp && p.instagram) {
      contactBtn.href = `https://instagram.com/${p.instagram.replace('@', '')}`;
      contactBtn.textContent = 'Ver en Instagram';
      contactBtn.onclick = () => trackProviderContact(p, 'instagram', origen);
    } else {
      contactBtn.href = `https://wa.me/${whatsappNumber(p.whatsapp)}?text=Hola! Te contacto desde Criar Cerca 🌿`;
      contactBtn.textContent = 'Contactar por WhatsApp';
      contactBtn.onclick = () => trackProviderContact(p, 'whatsapp', origen);
    }

    document.getElementById('modalOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  window.closeModal = function(e) {
    if (e.target === document.getElementById('modalOverlay')) window.closeModalBtn();
  };

  window.closeModalBtn = function() {
    document.getElementById('modalOverlay').classList.remove('active');
    document.body.style.overflow = '';
  };
}

export function observeFadeIns() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
}
