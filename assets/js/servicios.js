import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getFirestore, collection, getDocs,
  query, where, orderBy
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { firebaseConfig } from "./config.js";
import { CATEGORIES, categoryLabel } from "./categories.js";
import { providerCardHtml, setupModal, observeFadeIns } from "./directory-common.js";
import { mountPartials } from "./partials.js";

mountPartials('');

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
  grid.innerHTML = filtered.map(providerCardHtml).join('');

  setTimeout(() => {
    document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
  }, 50);
}

function renderCategoryFilters() {
  document.getElementById('categoryFilters').insertAdjacentHTML('beforeend',
    CATEGORIES.map(c => `<button class="filter-btn" onclick="setCategory('${c.value}', this)">${c.emoji} ${c.label}</button>`).join('')
  );
}

// ── Modal + tracking (compartido con las páginas de categoría) ──
setupModal(id => allProviders.find(x => x.id === id));

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

// ── Search con Enter ──
document.getElementById('searchInput').addEventListener('keyup', e => {
  if (e.key === 'Enter') window.filterProviders();
});

// ── Pintar filtros de categoría ──
renderCategoryFilters();

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
observeFadeIns();

// ── Init ──
loadProviders();
