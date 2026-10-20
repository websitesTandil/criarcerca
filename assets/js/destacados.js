import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { firebaseConfig } from "./config.js";
import { destacadoCardHtml, isFeatured, setupModal } from "./directory-common.js";
import { mountPartials } from "./partials.js";

// Orden al azar en cada carga, para que no sean siempre los mismos primeros.
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// La home no usa header/footer inyectados: mountPartials solo arma el modal.
mountPartials('');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let destacados = [];
setupModal(id => destacados.find(x => x.id === id), 'destacado_home');

function skeletonCardHtml() {
  return `
    <div class="destacado-card destacado-skeleton">
      <div class="destacado-image"></div>
      <div class="destacado-body">
        <span class="skeleton-line short"></span>
        <div class="skeleton-line title"></div>
        <span class="skeleton-line short"></span>
      </div>
    </div>`;
}

async function loadDestacados() {
  const section = document.getElementById('destacadosSection');
  const track = document.getElementById('destacadosTrack');
  if (!section || !track) return;

  // Se muestra un placeholder desde el primer instante y la sección queda visible
  // de una: la consulta a Firestore tarda un momento, y si la sección aparece recién
  // cuando termina, alguien que ya venía bajando se la puede perder por completo.
  track.innerHTML = Array(3).fill(skeletonCardHtml()).join('');
  section.style.display = 'block';

  try {
    // Misma consulta que servicios.js (pendiente==false + orderBy fechaCreacion),
    // así no hace falta un índice compuesto nuevo en Firestore.
    const q = query(collection(db, "providers"), where("pendiente", "==", false), orderBy("fechaCreacion", "asc"));
    const snap = await getDocs(q);
    destacados = shuffle(
      snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(isFeatured)
    );

    if (destacados.length === 0) {
      section.style.display = 'none';
      return;
    }

    track.innerHTML = destacados.map(p => destacadoCardHtml(p)).join('');
  } catch (err) {
    console.error('Error cargando destacados:', err);
    section.style.display = 'none';
  }
}

loadDestacados();
