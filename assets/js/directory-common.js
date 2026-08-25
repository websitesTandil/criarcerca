import { categoryLabel } from "./categories.js";

export function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

export function providerCardHtml(p) {
  return `
    <div class="provider-card fade-in" onclick="window._openModal('${p.id}')">
      <div class="card-image ${p.image ? '' : (p.color || 'color-1')}">
        ${p.image ? `<img src="${p.image}" alt="${p.name}" />` : `<span>${p.emoji || '🌿'}</span>`}
        <span class="card-category">${categoryLabel(p.category)}</span>
      </div>
      <div class="card-body">
        <h3>${p.name}</h3>
        <p>${stripHtml(p.description).substring(0, 90)}${p.description.length > 90 ? '...' : ''}</p>
        <div class="card-footer">
          <span class="card-location">📍 ${p.location}</span>
          <span class="card-contact">Ver más</span>
        </div>
      </div>
    </div>`;
}

export function trackProviderView(provider) {
  if (typeof gtag !== 'function') return;
  gtag('event', 'ver_proveedor', {
    proveedor_nombre: provider.name,
    proveedor_categoria: provider.category,
  });
}

export function trackProviderContact(provider, canal) {
  if (typeof gtag !== 'function') return;
  gtag('event', 'contacto_proveedor', {
    proveedor_nombre: provider.name,
    proveedor_categoria: provider.category,
    canal_contacto: canal,
    traffic_source: document.referrer ? new URL(document.referrer).hostname : '(direct)'
  });
}

// Instala en window los handlers del modal de detalle. getProviderById(id) debe
// devolver el provider correspondiente desde el estado de la página que lo llama.
export function setupModal(getProviderById) {
  window._trackInstagramLink = function(id) {
    const p = getProviderById(id);
    if (!p) return;
    trackProviderContact(p, 'instagram');
  };

  window._openModal = function(id) {
    const p = getProviderById(id);
    if (!p) return;

    trackProviderView(p);

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

    document.getElementById('modalCat').textContent = categoryLabel(p.category);
    document.getElementById('modalName').textContent = p.name;
    document.getElementById('modalDesc').innerHTML = p.description;
    document.getElementById('modalInfo').innerHTML = `
      <div class="modal-info-row"><span class="label">📍 Zona</span><span>${p.location}</span></div>
      ${p.instagram ? `<div class="modal-info-row">
        <span class="label">Instagram</span>
        <a href="https://instagram.com/${p.instagram.replace('@','')}" target="_blank" style="color:var(--green-mid)" onclick="window._trackInstagramLink('${p.id}')">${p.instagram}</a>
      </div>` : ''}
    `;

    const contactBtn = document.getElementById('modalContact');
    if (p.noWhatsapp && p.instagram) {
      contactBtn.href = `https://instagram.com/${p.instagram.replace('@', '')}`;
      contactBtn.textContent = 'Ver en Instagram';
      contactBtn.onclick = () => trackProviderContact(p, 'instagram');
    } else {
      contactBtn.href = `https://wa.me/54${p.whatsapp}?text=Hola! Te contacto desde Criar Cerca 🌿`;
      contactBtn.textContent = 'Contactar por WhatsApp';
      contactBtn.onclick = () => trackProviderContact(p, 'whatsapp');
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
