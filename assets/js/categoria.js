import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getFirestore, collection, getDocs,
  query, where, orderBy
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { firebaseConfig } from "./config.js";
import { providerCardHtml, setupModal, observeFadeIns } from "./directory-common.js";
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

function renderProviders() {
  const grid = document.getElementById('providersGrid');
  const empty = document.getElementById('emptyState');
  const comingSoon = document.getElementById('comingSoon');
  const count = document.getElementById('providerCount');

  if (providers.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'none';
    comingSoon.style.display = 'block';
    count.textContent = '0 servicios';
    return;
  }

  const filtered = providers.filter(p => {
    const matchSubcat = !currentSubcategory || p.subcategoria === currentSubcategory;
    const matchBenefit = !onlyBenefit || !!p.beneficio;
    return matchSubcat && matchBenefit;
  });

  comingSoon.style.display = 'none';
  count.textContent = `${filtered.length} servicio${filtered.length !== 1 ? 's' : ''}`;

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

observeFadeIns();

renderSubcategoryFilters();
loadProviders();
