import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getFirestore, collection, getDocs,
  query, where, orderBy
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { firebaseConfig } from "./config.js";
import { providerCardHtml, setupModal, observeFadeIns } from "./directory-common.js";
import { mountPartials, mountCategoryPills } from "./partials.js";
import { subcategoriesFor } from "./subcategories.js";

const CATEGORY = document.body.dataset.category;

mountPartials('../');
mountCategoryPills(CATEGORY, '../');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let providers = [];
let currentSubcategory = '';

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

  const filtered = currentSubcategory
    ? providers.filter(p => p.subcategoria === currentSubcategory)
    : providers;

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

  wrap.style.display = 'flex';
  wrap.innerHTML =
    `<button class="filter-btn active" onclick="setSubcategory('', this)">Todas</button>` +
    options.map(s => `<button class="filter-btn" onclick="setSubcategory('${s.value}', this)">${s.label}</button>`).join('');
}

window.setSubcategory = function(sub, btn) {
  currentSubcategory = sub;
  document.querySelectorAll('#subcategoryFilters .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderProviders();
};

setupModal(id => providers.find(x => x.id === id));

observeFadeIns();

renderSubcategoryFilters();
loadProviders();
