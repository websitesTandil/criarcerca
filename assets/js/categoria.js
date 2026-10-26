import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getFirestore, collection, getDocs,
  query, where, orderBy
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { firebaseConfig } from "./config.js";
import {
  providerCardHtml, destacadoCardHtml, isFeatured, sortFeatured,
  setupModal, observeFadeIns, matchesSearch, categoriesOf, subcategoriasOf, trackSearch
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

// Cuántas tarjetas se muestran de entrada y cuántas se suman por cada click
// en "Cargar más" (categorías grandes como fiestas llegan a 80+ servicios).
const PAGE_SIZE = 24;
let visibleCount = PAGE_SIZE;

// Placeholder que se ve desde el primer instante, antes de que responda Firestore:
// sin esto la franja de destacados queda invisible mientras carga (el buscador, los
// filtros y el spinner de la grilla sí se ven de una) y alguien que ya viene bajando
// se la puede perder por completo.
function renderDestacadosSkeleton() {
  const wrap = document.createElement('div');
  wrap.id = 'categoryDestacados';
  wrap.className = 'category-destacados';
  wrap.innerHTML = `
    <h3>Destacados ✨</h3>
    <div class="destacados-track">
      ${Array(3).fill(`
        <div class="destacado-card destacado-skeleton">
          <div class="destacado-image"></div>
          <div class="destacado-body">
            <span class="skeleton-line short" style="display:block;margin-bottom:10px"></span>
            <div class="skeleton-line title"></div>
            <span class="skeleton-line short" style="display:block"></span>
          </div>
        </div>`).join('')}
    </div>`;
  // Debajo de los filtros (subcategorías y "solo con beneficio"), antes de
  // la grilla. El buscador quedó arriba de todo, junto al título.
  document.getElementById('benefitFilterBtn').insertAdjacentElement('afterend', wrap);
}

// Subcategorías arriba de "Solo con beneficio" (el HTML estático las trae en
// el orden opuesto).
function reorderFilters() {
  const benefitBtn = document.getElementById('benefitFilterBtn');
  const subcatFilters = document.getElementById('subcategoryFilters');
  if (!benefitBtn || !subcatFilters) return;
  benefitBtn.insertAdjacentElement('beforebegin', subcatFilters);
}

async function loadProviders() {
  try {
    // Misma consulta que servicios.js/destacados.js (todos los publicados), para
    // poder filtrar acá por "categories" (puede traer más de una categoría) sin
    // pedir un índice nuevo en Firestore para cada combinación posible.
    const q = query(
      collection(db, "providers"),
      where("pendiente", "==", false),
      orderBy("fechaCreacion", "asc")
    );
    const snapshot = await getDocs(q);
    providers = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(p => categoriesOf(p).includes(CATEGORY));
    renderProviders();
  } catch (err) {
    console.error("Error cargando providers:", err);
    document.getElementById('providersGrid').innerHTML = `
      <div class="loading-state" style="grid-column:1/-1">
        <p>Error al cargar los servicios. Recargá la página.</p>
      </div>`;
  }
}

// Destacados (Estándar y Premium) de esta página. En una subpágina (ej. salones)
// solo entran los de esa subcategoría, y lo mismo si se eligió una desde las
// pastillas en la página principal de la categoría (currentSubcategory cubre
// ambos casos). Si hay texto en el buscador también se filtran por eso, para
// no mostrar destacados que no tienen nada que ver con lo que se buscó.
function featuredForPage() {
  return sortFeatured(providers.filter(p =>
    isFeatured(p) &&
    (!currentSubcategory || subcategoriasOf(p).includes(currentSubcategory)) &&
    matchesSearch(p, currentSearch)
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
    document.getElementById('benefitFilterBtn').insertAdjacentElement('afterend', wrap);
  }
  wrap.style.display = 'block';
  wrap.innerHTML = `
    <h3>Destacados ✨</h3>
    <div class="destacados-track">${featured.map(p => destacadoCardHtml(p, CATEGORY)).join('')}</div>`;
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
    const matchSubcat = !currentSubcategory || subcategoriasOf(p).includes(currentSubcategory);
    const matchBenefit = !onlyBenefit || !!p.beneficio;
    return !isFeatured(p) && matchSubcat && matchBenefit && matchesSearch(p, currentSearch);
  });

  const featuredCount = featuredForPage().length;
  // "Solo con beneficio" es el único filtro que no se aplica a los destacados,
  // así que es el único que no se suma al total cuando está activo (mostraría
  // de más). Búsqueda y subcategoría sí los filtran, cuentan normal.
  const filtersActive = !!currentSearch.trim() || onlyBenefit || (!!currentSubcategory && !FIXED_SUBCATEGORY);
  const total = onlyBenefit ? rest.length : rest.length + featuredCount;

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
  const visible = rest.slice(0, visibleCount);
  grid.innerHTML = visible.map(p => providerCardHtml(p, CATEGORY)).join('');
  renderLoadMoreButton(rest.length);

  setTimeout(() => {
    document.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
  }, 50);
}

// "Cargar más" debajo de la grilla, solo si quedan servicios sin mostrar.
function renderLoadMoreButton(totalCount) {
  let btn = document.getElementById('loadMoreBtn');
  if (visibleCount >= totalCount) {
    if (btn) btn.remove();
    return;
  }
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'loadMoreBtn';
    btn.className = 'load-more-btn';
    btn.onclick = () => { visibleCount += PAGE_SIZE; renderProviders(); };
    document.getElementById('providersGrid').insertAdjacentElement('afterend', btn);
  }
  btn.textContent = `Ver más servicios (${totalCount - visibleCount} más)`;
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

  // Mismas opciones que las pastillas, en un <select> para mobile (igual que
  // mountCategoryPills en partials.js). Las que filtran en el lugar van con
  // value="#valor" (setSubcategoryFromSelect lo distingue de una URL real).
  const allOption = onSubpage
    ? `<option value="${parent}">Todas</option>`
    : `<option value="#"${!currentSubcategory ? ' selected' : ''}>Todas</option>`;

  const itemOptions = options.map(s => {
    const isActive = s.value === currentSubcategory;
    if (s.page) return `<option value="${s.page}"${isActive ? ' selected' : ''}>${s.label}</option>`;
    const value = onSubpage ? `${parent}?sub=${s.value}` : `#${s.value}`;
    return `<option value="${value}"${isActive ? ' selected' : ''}>${s.label}</option>`;
  }).join('');

  wrap.style.display = 'flex';
  wrap.innerHTML = `
    ${all}${items}
    <select class="subcategory-filters-select" aria-label="Subcategoría" onchange="setSubcategoryFromSelect(this.value)">
      ${allOption}${itemOptions}
    </select>`;
}

window.setSubcategory = function(sub, btn) {
  currentSubcategory = sub;
  visibleCount = PAGE_SIZE;
  document.querySelectorAll('#subcategoryFilters .filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderProviders();
};

window.setSubcategoryFromSelect = function(value) {
  if (value.startsWith('#')) {
    window.setSubcategory(value.slice(1));
  } else {
    window.location.href = value;
  }
};

// Cuadro de búsqueda del listado: grande, junto al título (antes que la nav de
// "otras categorías"), igual que en servicios.html. Filtra a medida que se
// escribe (el botón "Buscar" y Enter hacen lo mismo).
const emptyDefaultText = document.querySelector('#emptyState p')?.textContent || '';

function addSearchBar() {
  const subtitle = document.querySelector('.search-section p');
  if (!subtitle) return;
  subtitle.insertAdjacentHTML('afterend', `
    <div class="search-bar">
      <input type="text" id="searchInput" placeholder="Buscá por nombre, tipo de servicio o ciudad..." aria-label="Buscar en el listado" />
      <button onclick="filterProviders()">Buscar</button>
    </div>
    <p class="search-hint">Podés buscar por nombre, tipo de servicio o ciudad</p>`);
  const input = document.getElementById('searchInput');
  input.addEventListener('input', () => window.filterProviders({ immediate: false }));
  // Enter registra la búsqueda en el momento, sin esperar la pausa de escritura.
  input.addEventListener('keyup', e => {
    if (e.key === 'Enter') window.filterProviders({ immediate: true });
  });
}

// Cuántos proveedores muestra la búsqueda, contando los destacados que coinciden.
function searchResultCount() {
  return providers.filter(p => {
    const matchSubcat = !currentSubcategory || subcategoriasOf(p).includes(currentSubcategory);
    const matchBenefit = !onlyBenefit || !!p.beneficio;
    return matchSubcat && matchBenefit && matchesSearch(p, currentSearch);
  }).length;
}

// El botón "Buscar" (onclick sin argumentos) también registra en el momento.
window.filterProviders = function({ immediate = true } = {}) {
  currentSearch = document.getElementById('searchInput').value;
  visibleCount = PAGE_SIZE;
  renderProviders();
  trackSearch(currentSearch, searchResultCount(), CATEGORY, { immediate });
};

window.toggleBenefitFilter = function() {
  onlyBenefit = !onlyBenefit;
  visibleCount = PAGE_SIZE;
  document.getElementById('benefitFilterBtn').classList.toggle('active', onlyBenefit);
  renderProviders();
};

setupModal(id => providers.find(x => x.id === id), 'listado', CATEGORY);

// Las FAQ quedan al final de la página, después de todas las tarjetas, y en las
// categorías grandes cuesta llegar. Se agrega un acceso directo bajo el buscador.
function addFaqJumpLink() {
  const faq = document.querySelector('.faq-section');
  const hint = document.querySelector('.search-section .search-hint');
  if (!faq || !hint) return;
  faq.id = 'faq';
  hint.insertAdjacentHTML('afterend', '<a class="faq-jump" href="#faq">Preguntas frecuentes ↓</a>');
}

addSearchBar();
addFaqJumpLink();
reorderFilters();
renderDestacadosSkeleton();

observeFadeIns();

renderSubcategoryFilters();
loadProviders();
