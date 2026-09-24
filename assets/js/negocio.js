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
  });
}

function trackContact(p, canal) {
  if (typeof gtag !== 'function') return;
  gtag('event', 'contacto_proveedor', {
    proveedor_nombre: p.name,
    proveedor_categoria: p.category,
    canal_contacto: canal,
    traffic_source: document.referrer ? new URL(document.referrer).hostname : '(direct)'
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
      gallery.innerHTML = p.galeria.map(url => `
        <div class="negocio-gallery-item"><img src="${url}" alt="${p.name}" /></div>
      `).join('');
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
      igBtn.textContent = `📸 ${p.instagram}`;
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
