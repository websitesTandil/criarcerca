import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getFirestore, collection, getDocs,
  query, where, orderBy
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { firebaseConfig } from "./config.js";
import { CATEGORIES } from "./categories.js";
import { providerCardHtml, setupModal, observeFadeIns, matchesSearch, categoriesOf, trackSearch } from "./directory-common.js";
import { mountPartials, categoryPageFor } from "./partials.js";

mountPartials('');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── Estado global ──
let allProviders = [];
let currentCategory = 'todos';
let currentSearch = '';
let onlyBenefit = false;

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
    const matchCat = currentCategory === 'todos' || categoriesOf(p).includes(currentCategory);
    const matchBenefit = !onlyBenefit || !!p.beneficio;
    return matchCat && matchBenefit && matchesSearch(p, currentSearch);
  });

  count.textContent = `${filtered.length} servicio${filtered.length !== 1 ? 's' : ''}`;
  comingSoon.style.display = 'none';

  if (filtered.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  const context = currentCategory !== 'todos' ? currentCategory : undefined;
  grid.innerHTML = filtered.map(p => providerCardHtml(p, context)).join('');

  setTimeout(() => {
    document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
  }, 50);
}

// Las categorías con página propia en /categorias/ son links a esa página; las
// que no la tienen (hoy solo "Otros") filtran en el lugar. También arma un
// <select> con las mismas opciones para mobile (igual que en categoria.js /
// partials.js): las pastillas se esconden ahí y se ve el select en su lugar.
function renderCategoryFilters() {
  const wrap = document.getElementById('categoryFilters');
  const items = CATEGORIES.map(c => ({
    value: c.value,
    label: `${c.emoji} ${c.label}`,
    page: categoryPageFor(c.value),
  }));

  wrap.insertAdjacentHTML('beforeend',
    items.map(it => it.page
      ? `<a class="filter-btn" href="categorias/${it.page}">${it.label}</a>`
      : `<button class="filter-btn" onclick="setCategory('${it.value}', this)">${it.label}</button>`
    ).join('')
  );

  const selectOptions = [`<option value="#todos" selected>Todos</option>`]
    .concat(items.map(it => `<option value="${it.page ? 'categorias/' + it.page : '#' + it.value}">${it.label}</option>`))
    .join('');
  wrap.insertAdjacentHTML('afterend', `
    <select class="category-filters-select" aria-label="Categoría" onchange="setCategoryFromSelect(this.value)">
      ${selectOptions}
    </select>`);
}

window.setCategoryFromSelect = function(value) {
  if (value.startsWith('#')) {
    window.setCategory(value.slice(1));
  } else {
    window.location.href = value;
  }
};

// ── Modal + tracking (compartido con las páginas de categoría) ──
setupModal(id => allProviders.find(x => x.id === id), 'listado', () => currentCategory !== 'todos' ? currentCategory : undefined);

window.setCategory = function(cat, btn) {
  currentCategory = cat;
  onlyBenefit = false;
  document.getElementById('benefitFilterBtn').classList.remove('active');
  document.querySelectorAll('#categoryFilters .filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const select = document.querySelector('.category-filters-select');
  if (select) select.value = `#${cat}`;
  history.replaceState(null, '', cat === 'todos' ? window.location.pathname : '?cat=' + encodeURIComponent(cat));
  renderProviders();
};

window.toggleBenefitFilter = function() {
  onlyBenefit = !onlyBenefit;
  document.getElementById('benefitFilterBtn').classList.toggle('active', onlyBenefit);
  renderProviders();
};

window.filterProviders = function() {
  currentSearch = document.getElementById('searchInput').value;
  renderProviders();
  const resultados = allProviders.filter(p =>
    (currentCategory === 'todos' || categoriesOf(p).includes(currentCategory)) &&
    (!onlyBenefit || !!p.beneficio) &&
    matchesSearch(p, currentSearch)
  ).length;
  trackSearch(currentSearch, resultados, 'servicios', { immediate: true });
};

// ── Search con Enter ──
document.getElementById('searchInput').addEventListener('keyup', e => {
  if (e.key === 'Enter') window.filterProviders();
});

// ── Pintar filtros de categoría ──
renderCategoryFilters();

// ── Leer ?cat= al cargar ──
// Los links viejos (?cat=ninieras, etc.) redirigen a la página de esa categoría;
// para las que filtran en el lugar (hoy "Otros") se deja el filtro activo.
(function() {
  const cat = new URLSearchParams(window.location.search).get('cat');
  if (!cat) return;

  const page = categoryPageFor(cat);
  if (page) {
    window.location.replace(`categorias/${page}`);
    return;
  }

  document.querySelectorAll('#categoryFilters button.filter-btn').forEach(btn => {
    const onclick = btn.getAttribute('onclick') || '';
    if (onclick.includes(`'${cat}'`)) {
      currentCategory = cat;
      document.querySelectorAll('#categoryFilters .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const select = document.querySelector('.category-filters-select');
      if (select) select.value = `#${cat}`;
    }
  });
})();

// ── Scroll animations ──
observeFadeIns();

// ── Init ──
loadProviders();
