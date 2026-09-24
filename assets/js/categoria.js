import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getFirestore, collection, getDocs,
  query, where, orderBy
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { firebaseConfig } from "./config.js";
import {
  providerCardHtml, destacadoWideHtml, initDescToggles, isFeatured, sortFeatured,
  setupModal, observeFadeIns, matchesSearch
} from "./directory-common.js";
import { mountPartials, mountCategoryPills, categoryPageFor } from "./partials.js";
import { subcategoriesFor } from "./subcategories.js";

const CATEGORY = document.body.dataset.category;
// En las páginas de subcategoría (ej. tortas) el body trae data-subcategory y la
// lista queda fija en esa subcategoría.
const FIXED_SUBCATEGORY = document.body.dataset.subcategory || '';

mountPartials('../');
mountCategoryPills(CATEGORY, '../');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// En la página de la categoría, ?sub=<valor> deja preseleccionado ese filtro
// (lo usan las subpáginas para mandar a una subcategoría que no tiene página propia).
const paramSub = new URLSearchParams(location.search).get('sub');
const validParamSub = subcategoriesFor(CATEGORY).some(s => s.value === paramSub) ? paramSub : '';

let providers = [];
let currentSubcategory = FIXED_SUBCATEGORY || validParamSub;
let currentSearch = '';
let onlyBenefit = false;

async function loadProviders() {
  try {
    const q = query(
      collection(db, "providers"),
      where("pendiente", "==", false),
      where("category", "==", CATEGORY),
      orderBy("fechaCreacion", "asc")
    );
    const snapshot = await getDocs(q);
    providers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderProviders();
  } catch (err) {
    console.error("Error cargando providers:", err);
    document.getElementById('providersGrid').innerHTML = `
      <div class="loading-state" style="grid-column:1/-1">
        <p>Error al cargar los servicios. Recargá la página.</p>
      </div>`;
  }
}

// Destacados (Estándar y Premium) de esta página: van fijos arriba del buscador
// y de los filtros, así que no se filtran. En una subpágina (ej. salones) solo
// entran los de esa subcategoría.
function featuredForPage() {
  return sortFeatured(providers.filter(p =>
    isFeatured(p) && (!FIXED_SUBCATEGORY || p.subcategoria === FIXED_SUBCATEGORY)
  ));
}

function renderDestacados() {
  const featured = featuredForPage();
  let wrap = document.getElementById('categoryDestacados');
  if (featured.length === 0) {
    if (wrap) wrap.style.display = 'none';
    return;
  }
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'categoryDestacados';
    wrap.className = 'category-destacados';
    document.querySelector('.providers-section .section-header').insertAdjacentElement('afterend', wrap);
  }
  wrap.style.display = 'block';
  wrap.innerHTML = `
    <h3>Destacados ✨</h3>
    <div class="destacados-list">${featured.map(destacadoWideHtml).join('')}</div>`;
  initDescToggles();
}

function renderProviders() {
  const grid = document.getElementById('providersGrid');
  const empty = document.getElementById('emptyState');
  const comingSoon = document.getElementById('comingSoon');
  const count = document.getElementById('providerCount');

  if (providers.length === 0) {
    renderDestacados();
    grid.innerHTML = '';
    empty.style.display = 'none';
    comingSoon.style.display = 'block';
    count.textContent = '0 servicios';
    return;
  }

  // Los destacados van en su franja y no se repiten en la grilla.
  const rest = providers.filter(p => {
    const matchSubcat = !currentSubcategory || p.subcategoria === currentSubcategory;
    const matchBenefit = !onlyBenefit || !!p.beneficio;
    return !isFeatured(p) && matchSubcat && matchBenefit && matchesSearch(p, currentSearch);
  });

  const featuredCount = featuredForPage().length;
  const filtersActive = !!currentSearch.trim() || onlyBenefit || (!!currentSubcategory && !FIXED_SUBCATEGORY);
  const total = filtersActive ? rest.length : rest.length + featuredCount;

  renderDestacados();
  comingSoon.style.display = 'none';
  count.textContent = `${total} servicio${total !== 1 ? 's' : ''}`;

  if (rest.length === 0) {
    grid.innerHTML = '';
    // Si solo hay destacados y no hay filtros, no hay nada más para mostrar.
    if (!filtersActive && featuredCount > 0) {
      empty.style.display = 'none';
      return;
    }
    empty.querySelector('p').textContent = currentSearch.trim()
      ? 'Probá con otra búsqueda o mirá el resto del directorio'
      : emptyDefaultText;
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  grid.innerHTML = rest.map(providerCardHtml).join('');

  setTimeout(() => {
    document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
  }, 50);
}

function renderSubcategoryFilters() {
  const wrap = document.getElementById('subcategoryFilters');
  if (!wrap) return;
  const options = subcategoriesFor(CATEGORY);

  if (options.length === 0) {
    wrap.style.display = 'none';
    return;
  }

  // Las subcategorías con página propia son links a esa página (sirve a las
  // personas y a Google); las que no, filtran en el lugar. Desde una subpágina,
  // "Todas" y las que no tienen página vuelven a la página de la categoría.
  const parent = categoryPageFor(CATEGORY);
  const onSubpage = !!FIXED_SUBCATEGORY;
  const activeCls = isActive => (isActive ? ' active' : '');

  const all = onSubpage
    ? `<a class="filter-btn" href="${parent}">Todas</a>`
    : `<button class="filter-btn${activeCls(!currentSubcategory)}" onclick="setSubcategory('', this)">Todas</button>`;

  const items = options.map(s => {
    const isActive = s.value === currentSubcategory;
    if (s.page) return `<a class="filter-btn${activeCls(isActive)}" href="${s.page}">${s.label}</a>`;
    return onSubpage
      ? `<a class="filter-btn" href="${parent}?sub=${s.value}">${s.label}</a>`
      : `<button class="filter-btn${activeCls(isActive)}" onclick="setSubcategory('${s.value}', this)">${s.label}</button>`;
  }).join('');

  wrap.style.display = 'flex';
  wrap.innerHTML = all + items;
}

window.setSubcategory = function(sub, btn) {
  currentSubcategory = sub;
  document.querySelectorAll('#subcategoryFilters .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderProviders();
};

// Cuadro de búsqueda del listado: se agrega arriba de los filtros y filtra a
// medida que se escribe (el botón "Buscar" y Enter hacen lo mismo).
const emptyDefaultText = document.querySelector('#emptyState p')?.textContent || '';

function addSearchBar() {
  const anchor = document.getElementById('benefitFilterBtn');
  if (!anchor) return;
  anchor.insertAdjacentHTML('beforebegin', `
    <div class="search-bar list-search">
      <input type="text" id="searchInput" placeholder="Buscá por nombre o tipo de servicio..." aria-label="Buscar en el listado" />
      <button onclick="filterProviders()">Buscar</button>
    </div>`);
  document.getElementById('searchInput').addEventListener('input', () => window.filterProviders());
}

window.filterProviders = function() {
  currentSearch = document.getElementById('searchInput').value;
  renderProviders();
};

window.toggleBenefitFilter = function() {
  onlyBenefit = !onlyBenefit;
  document.getElementById('benefitFilterBtn').classList.toggle('active', onlyBenefit);
  renderProviders();
};

setupModal(id => providers.find(x => x.id === id));

// Las FAQ quedan al final de la página, después de todas las tarjetas, y en las
// categorías grandes cuesta llegar. Se agrega un acceso directo al final del intro.
function addFaqJumpLink() {
  const faq = document.querySelector('.faq-section');
  const intro = document.querySelector('.category-intro');
  if (!faq || !intro) return;
  faq.id = 'faq';
  intro.insertAdjacentHTML('beforeend', '<a class="faq-jump" href="#faq">Preguntas frecuentes ↓</a>');
}

addFaqJumpLink();
addSearchBar();

observeFadeIns();

renderSubcategoryFilters();
loadProviders();
