import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { firebaseConfig } from "./config.js";
import { destacadoCardHtml, isFeatured, sortFeatured, setupModal } from "./directory-common.js";
import { mountPartials } from "./partials.js";

// La home no usa header/footer inyectados: mountPartials solo arma el modal.
mountPartials('');

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let destacados = [];
setupModal(id => destacados.find(x => x.id === id), 'destacado_home');

async function loadDestacados() {
  const section = document.getElementById('destacadosSection');
  const track = document.getElementById('destacadosTrack');
  if (!section || !track) return;

  try {
    // Misma consulta que servicios.js (pendiente==false + orderBy fechaCreacion),
    // así no hace falta un índice compuesto nuevo en Firestore.
    const q = query(collection(db, "providers"), where("pendiente", "==", false), orderBy("fechaCreacion", "asc"));
    const snap = await getDocs(q);
    destacados = sortFeatured(
      snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(isFeatured)
    );

    if (destacados.length === 0) return;

    track.innerHTML = destacados.map(destacadoCardHtml).join('');
    section.style.display = 'block';
  } catch (err) {
    console.error('Error cargando destacados:', err);
  }
}

loadDestacados();
