import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getFirestore, collection, getDocs,
  query, where, orderBy
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { firebaseConfig } from "./config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── Estado global ──
let allProviders = [];
let currentCategory = 'todos';
let currentSearch = '';

// ── Cargar providers aprobados de Firestore ──
async function loadProviders() {
  try {
    const q = query(
      collection(db, "providers"),
      where("pendiente", "==", false),
      orderBy("fechaCreacion", "asc")
    );
    const snapshot = await getDocs(q);
    allProviders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderProviders();
  } catch (err) {
    console.error("Error cargando providers:", err);
    document.getElementById('providersGrid').innerHTML = `
      <div class="loading-state" style="grid-column:1/-1">
        <p>Error al cargar los servicios. Recargá la página.</p>
      </div>`;
  }
}

// ── Render ──
function renderProviders() {
  const grid = document.getElementById('providersGrid');
  const empty = document.getElementById('emptyState');
  const comingSoon = document.getElementById('comingSoon');
  const count = document.getElementById('providerCount');

  if (allProviders.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'none';
    comingSoon.style.display = 'block';
    count.textContent = '0 servicios';
    return;
  }

  let filtered = allProviders.filter(p => {
    const matchCat = currentCategory === 'todos' || p.category === currentCategory;
    const matchSearch = !currentSearch ||
      p.name.toLowerCase().includes(currentSearch) ||
      p.description.toLowerCase().includes(currentSearch) ||
      p.category.toLowerCase().includes(currentSearch);
    return matchCat && matchSearch;
  });

  count.textContent = `${filtered.length} servicio${filtered.length !== 1 ? 's' : ''}`;
  comingSoon.style.display = 'none';

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  grid.innerHTML = filtered.map(p => `
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
    </div>
  `).join('');

  setTimeout(() => {
    document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
  }, 50);
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

function categoryLabel(cat) {
  const labels = {
    niñeras: 'Niñeras',
    fotografia: 'Fotografía',
    salud: 'Salud',
    ropa: 'Ropa y accesorios',
    alimentos: 'Alimentos',
    fiestas: 'Fiestas y Eventos',
    otros: 'Otros'
  };
  return labels[cat] || cat;
}

// ── Tracking (Google Analytics) ──
function trackProviderView(provider) {
  if (typeof gtag !== 'function') return;
  gtag('event', 'ver_proveedor', {
    proveedor_nombre: provider.name,
    proveedor_categoria: provider.category,
  });
}

function trackProviderContact(provider) {
  if (typeof gtag !== 'function') return;
  gtag('event', 'contacto_proveedor', {
    proveedor_nombre: provider.name,
    proveedor_categoria: provider.category,
  });
}

// ── Exponer funciones al scope global ──
window._openModal = function(id) {
  const p = allProviders.find(x => x.id === id);
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
      <a href="https://instagram.com/${p.instagram.replace('@','')}" target="_blank" style="color:var(--green-mid)">${p.instagram}</a>
    </div>` : ''}
  `;

  const contactBtn = document.getElementById('modalContact');
  if (p.noWhatsapp && p.instagram) {
    contactBtn.href = `https://instagram.com/${p.instagram.replace('@', '')}`;
    contactBtn.textContent = 'Ver en Instagram';
    contactBtn.onclick = () => {
      if (typeof gtag !== 'function') return;
      gtag('event', 'contacto_proveedor', {
        proveedor_nombre: p.name,
        proveedor_categoria: p.category,
        canal_contacto: 'instagram',
      });
    };
  } else {
    contactBtn.href = `https://wa.me/54${p.whatsapp}?text=Hola! Te contacto desde Criar Cerca 🌿`;
    contactBtn.textContent = 'Contactar por WhatsApp';
    contactBtn.onclick = () => {
      if (typeof gtag !== 'function') return;
      gtag('event', 'contacto_proveedor', {
        proveedor_nombre: p.name,
        proveedor_categoria: p.category,
        canal_contacto: 'whatsapp',
      });
    };
  }

  document.getElementById('modalOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
};

window.setCategory = function(cat, btn) {
  currentCategory = cat;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  history.replaceState(null, '', cat === 'todos' ? window.location.pathname : '?cat=' + encodeURIComponent(cat));
  renderProviders();
};

window.filterProviders = function() {
  currentSearch = document.getElementById('searchInput').value.toLowerCase();
  renderProviders();
};

window.closeModal = function(e) {
  if (e.target === document.getElementById('modalOverlay')) window.closeModalBtn();
};

window.closeModalBtn = function() {
  document.getElementById('modalOverlay').classList.remove('active');
  document.body.style.overflow = '';
};

// ── Search con Enter ──
document.getElementById('searchInput').addEventListener('keyup', e => {
  if (e.key === 'Enter') window.filterProviders();
});

// ── Leer ?cat= al cargar ──
(function() {
  const params = new URLSearchParams(window.location.search);
  const cat = params.get('cat');
  if (cat) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
      const onclick = btn.getAttribute('onclick') || '';
      if (onclick.includes(`'${cat}'`)) {
        currentCategory = cat;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
    });
  }
})();

// ── Scroll animations ──
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

// ── Init ──
loadProviders();
