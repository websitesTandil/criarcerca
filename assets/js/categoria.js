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
  // Debajo de todos los filtros (subcategorías, "solo con descuento" y
  // buscador): el hint del buscador es lo último que arma reorderFilters()
  // + addSearchBar(), así que queda como ancla estable.
  document.querySelector('.search-hint').insertAdjacentElement('afterend', wrap);
}

// Reacomoda los filtros estáticos del HTML: subcategorías primero, y debajo
// una fila con "Solo con descuento" a la izquierda y el buscador (chico) a la
// derecha, en vez de cada uno en su propia línea.
function reorderFilters() {
  const benefitBtn = document.getElementById('benefitFilterBtn');
  const subcatFilters = document.getElementById('subcategoryFilters');
  if (!benefitBtn || !subcatFilters) return;

  const row = document.createElement('div');
  row.className = 'filters-row';
  benefitBtn.insertAdjacentElement('beforebegin', row);
  row.appendChild(benefitBtn);
  row.insertAdjacentElement('beforebegin', subcatFilters);
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
// solo entran los de esa subcategoría. Si hay texto en el buscador también se
// filtran por eso, para no mostrar destacados que no tienen nada que ver con
// lo que se buscó.
function featuredForPage() {
  return sortFeatured(providers.filter(p =>
    isFeatured(p) &&
    (!FIXED_SUBCATEGORY || subcategoriasOf(p).includes(FIXED_SUBCATEGORY)) &&
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
    document.getElementById('subcategoryFilters').insertAdjacentElement('afterend', wrap);
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
  // "Solo con descuento" y la subcategoría no filtran los destacados, así que
  // no se suman al total cuando están activos (mostrarían de más). La búsqueda
  // sí los filtra, así que cuenta normal con ella sola o sin ningún filtro.
  const otherFiltersActive = onlyBenefit || (!!currentSubcategory && !FIXED_SUBCATEGORY);
  const filtersActive = !!currentSearch.trim() || otherFiltersActive;
  const total = otherFiltersActive ? rest.length : rest.length + featuredCount;

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
  grid.innerHTML = rest.map(p => providerCardHtml(p, CATEGORY)).join('');

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
  const row = document.querySelector('.filters-row');
  if (!row) return;
  row.insertAdjacentHTML('beforeend', `
    <div class="search-bar list-search small-search">
      <input type="text" id="searchInput" placeholder="Buscar..." aria-label="Buscar en el listado" />
      <button onclick="filterProviders()">Buscar</button>
    </div>`);
  row.insertAdjacentHTML('afterend', `<p class="search-hint">Podés buscar por nombre, tipo de servicio o ciudad</p>`);
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
  renderProviders();
  trackSearch(currentSearch, searchResultCount(), CATEGORY, { immediate });
};

window.toggleBenefitFilter = function() {
  onlyBenefit = !onlyBenefit;
  document.getElementById('benefitFilterBtn').classList.toggle('active', onlyBenefit);
  renderProviders();
};

setupModal(id => providers.find(x => x.id === id), 'listado', CATEGORY);

// Las FAQ quedan al final de la página, después de todas las tarjetas, y en las
// categorías grandes cuesta llegar. Se agrega un acceso directo bajo el subtítulo.
function addFaqJumpLink() {
  const faq = document.querySelector('.faq-section');
  const subtitle = document.querySelector('.search-section p');
  if (!faq || !subtitle) return;
  faq.id = 'faq';
  subtitle.insertAdjacentHTML('afterend', '<a class="faq-jump" href="#faq">Preguntas frecuentes ↓</a>');
}

addFaqJumpLink();
reorderFilters();
addSearchBar();
renderDestacadosSkeleton();

observeFadeIns();

renderSubcategoryFilters();
loadProviders();
