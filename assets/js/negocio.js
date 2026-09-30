import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getFirestore, doc, getDoc
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { firebaseConfig } from "./config.js";
import { categoryLabel } from "./categories.js";
import { subcategoryLabel } from "./subcategories.js";
import { mountPartials } from "./partials.js";

mountPartials('');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Mismo criterio que en directory-common.js: si el número empieza con "+" se
// respeta tal cual, si no se le antepone el 54.
function whatsappNumber(raw) {
  const trimmed = (raw || '').trim();
  const digits = trimmed.replace(/\D/g, '');
  return trimmed.startsWith('+') ? digits : `54${digits}`;
}

function trackView(p) {
  if (typeof gtag !== 'function') return;
  gtag('event', 'ver_proveedor', {
    proveedor_nombre: p.name,
    proveedor_categoria: p.category,
    origen: 'pagina_completa',
  });
}

function trackContact(p, canal) {
  if (typeof gtag !== 'function') return;
  gtag('event', 'contacto_proveedor', {
    proveedor_nombre: p.name,
    proveedor_categoria: p.category,
    canal_contacto: canal,
    origen: 'pagina_completa',
    traffic_source: document.referrer ? new URL(document.referrer).hostname : '(direct)'
  });
}

// Visor de fotos de la galería: se abre al tocar una miniatura, con flechas y
// flechas del teclado para pasar de una a otra.
function setupLightbox(photos, name) {
  let current = 0;
  const overlay = document.getElementById('lightboxOverlay');
  const img = document.getElementById('lightboxImg');
  const counter = document.getElementById('lightboxCounter');
  document.querySelectorAll('.lightbox-nav').forEach(btn => {
    btn.style.display = photos.length > 1 ? '' : 'none';
  });

  function show(i) {
    current = (i + photos.length) % photos.length;
    img.src = photos[current];
    img.alt = `${name} — foto ${current + 1}`;
    counter.textContent = photos.length > 1 ? `${current + 1} / ${photos.length}` : '';
  }

  window.openLightbox = function(i) {
    show(i);
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  window.closeLightboxBtn = function() {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  };

  window.closeLightbox = function(e) {
    if (e.target === overlay) window.closeLightboxBtn();
  };

  window.lightboxNav = function(delta, e) {
    e.stopPropagation();
    show(current + delta);
  };

  document.addEventListener('keydown', e => {
    if (!overlay.classList.contains('active')) return;
    if (e.key === 'Escape') window.closeLightboxBtn();
    if (e.key === 'ArrowLeft') show(current - 1);
    if (e.key === 'ArrowRight') show(current + 1);
  });
}

function showNotFound() {
  document.getElementById('negocioLoading').style.display = 'none';
  document.getElementById('negocioNotFound').style.display = 'block';
}

async function loadNegocio() {
  const id = new URLSearchParams(window.location.search).get('id');
  if (!id) { showNotFound(); return; }

  try {
    const snap = await getDoc(doc(db, "providers", id));
    if (!snap.exists() || snap.data().pendiente) { showNotFound(); return; }

    const p = { id: snap.id, ...snap.data() };
    trackView(p);

    document.title = `${p.name} — Criar Cerca`;

    const label = p.subcategoria ? subcategoryLabel(p.category, p.subcategoria) : categoryLabel(p.category);
    document.getElementById('negocioCat').textContent = label;
    document.getElementById('negocioName').textContent = p.name;
    document.getElementById('negocioLocation').textContent = `📍 ${p.location}`;

    document.getElementById('negocioImage').innerHTML = p.image
      ? `<img src="${p.image}" alt="${p.name}" />`
      : `<span>${p.emoji || '🌿'}</span>`;

    if (p.beneficio) {
      const benefitEl = document.getElementById('negocioBenefit');
      benefitEl.style.display = 'block';
      benefitEl.innerHTML = `🎁 <strong>Beneficio por contactarlo desde Criar Cerca:</strong> ${p.beneficio}`;
    }

    document.getElementById('negocioDesc').innerHTML = p.descripcionExtendida || p.description;

    if (Array.isArray(p.galeria) && p.galeria.length > 0) {
      const gallery = document.getElementById('negocioGallery');
      gallery.style.display = 'grid';
      gallery.innerHTML = p.galeria.map((url, i) => `
        <button type="button" class="negocio-gallery-item" onclick="window.openLightbox(${i})">
          <img src="${url}" alt="${p.name} — foto ${i + 1}" />
        </button>
      `).join('');
      setupLightbox(p.galeria, p.name);
    }

    const contactBtn = document.getElementById('negocioContact');
    if (p.noWhatsapp && p.instagram) {
      contactBtn.href = `https://instagram.com/${p.instagram.replace('@', '')}`;
      contactBtn.textContent = 'Ver en Instagram';
      contactBtn.onclick = () => trackContact(p, 'instagram');
    } else {
      contactBtn.href = `https://wa.me/${whatsappNumber(p.whatsapp)}?text=${encodeURIComponent(`Hola! Te contacto desde Criar Cerca 🌿, vi tu página de ${p.name}`)}`;
      contactBtn.textContent = 'Contactar por WhatsApp';
      contactBtn.onclick = () => trackContact(p, 'whatsapp');
    }

    if (p.instagram) {
      const igBtn = document.getElementById('negocioInstagram');
      igBtn.style.display = 'inline-flex';
      igBtn.href = `https://instagram.com/${p.instagram.replace('@', '')}`;
      igBtn.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><defs><linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#feda75" /><stop offset="30%" stop-color="#fa7e1e" /><stop offset="60%" stop-color="#d62976" /><stop offset="85%" stop-color="#962fbf" /><stop offset="100%" stop-color="#4f5bd5" /></linearGradient></defs><path fill="url(#igGrad)" d="M12 2c2.717 0 3.056.01 4.122.06 1.065.05 1.79.217 2.428.465.66.254 1.216.598 1.772 1.153a4.908 4.908 0 0 1 1.153 1.772c.247.637.415 1.363.465 2.428.047 1.066.06 1.405.06 4.122 0 2.717-.01 3.056-.06 4.122-.05 1.065-.218 1.79-.465 2.428a4.883 4.883 0 0 1-1.153 1.772 4.915 4.915 0 0 1-1.772 1.153c-.637.247-1.363.415-2.428.465-1.066.047-1.405.06-4.122.06-2.717 0-3.056-.01-4.122-.06-1.065-.05-1.79-.218-2.428-.465a4.89 4.89 0 0 1-1.772-1.153 4.904 4.904 0 0 1-1.153-1.772c-.248-.637-.415-1.363-.465-2.428C2.013 15.056 2 14.717 2 12c0-2.717.01-3.056.06-4.122.05-1.065.217-1.79.465-2.428a4.88 4.88 0 0 1 1.153-1.772A4.897 4.897 0 0 1 5.45 2.525c.638-.248 1.363-.415 2.428-.465C8.944 2.013 9.283 2 12 2zm0 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.243A3.243 3.243 0 1 1 12 8.757a3.243 3.243 0 0 1 0 6.486zM17.338 5.858a1.169 1.169 0 1 0 0 2.338 1.169 1.169 0 0 0 0-2.338z"/></svg> ${p.instagram}`;
      igBtn.onclick = () => trackContact(p, 'instagram');
    }

    document.getElementById('negocioLoading').style.display = 'none';
    document.getElementById('negocioContent').style.display = 'block';
  } catch (err) {
    console.error('Error cargando negocio:', err);
    showNotFound();
  }
}

loadNegocio();
