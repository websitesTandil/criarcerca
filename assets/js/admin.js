import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getFirestore, collection, getDocs, doc,
  addDoc, updateDoc, deleteDoc,
  query, where, orderBy
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { firebaseConfig } from "./config.js";
import { CATEGORIES, categoryLabel } from "./categories.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ── Pintar opciones de categoría ──
document.getElementById('editCategoria').insertAdjacentHTML('beforeend',
  CATEGORIES.map(c => `<option value="${c.value}">${c.emoji} ${c.label}</option>`).join('')
);

let currentEditId = null;
let currentEditCollection = null;
let isApproving = false;

// ── OBSERVAR ESTADO DE AUTH ──
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    document.getElementById('userEmail').textContent = user.email;
    document.getElementById('loginError').style.display = 'none';
    loadSolicitudes();
    loadPublicados();
  } else {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminPanel').style.display = 'none';
  }
});

// ── LOGIN CON GOOGLE ──
window.loginConGoogle = async function() {
  const btn = document.getElementById('btnGoogle');
  btn.disabled = true;
  btn.textContent = 'Conectando...';
  try {
    await signInWithPopup(auth, provider);
    // onAuthStateChanged se encarga del resto
  } catch (err) {
    document.getElementById('loginError').style.display = 'block';
    document.getElementById('loginError').textContent = 'Error al iniciar sesión: ' + err.message;
    btn.disabled = false;
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/><path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg> Ingresar con Google`;
  }
};

// ── LOGOUT ──
window.doLogout = async function() {
  await signOut(auth);
};

// ── TABS ──
window.showTab = function(tab, btn) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tabSolicitudes').style.display = tab === 'solicitudes' ? 'block' : 'none';
  document.getElementById('tabPublicados').style.display = tab === 'publicados' ? 'block' : 'none';
};

// ── CARGAR SOLICITUDES PENDIENTES ──
async function loadSolicitudes() {
  const lista = document.getElementById('listaSolicitudes');
  try {
    const q = query(collection(db, "solicitudes"), where("pendiente", "==", true));
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const badge = document.getElementById('badgeSolicitudes');
    badge.textContent = docs.length > 0 ? ` (${docs.length})` : '';

    if (docs.length === 0) {
      lista.innerHTML = '<div class="empty-msg">No hay solicitudes pendientes 🎉</div>';
      return;
    }

    lista.innerHTML = docs.map(s => `
      <div class="card" id="sol-${s.id}">
        ${s.image ? `<div class="card-thumb"><img src="${s.image}" alt="${s.negocio}" /></div>` : ''}
        <div class="card-info">
          <div class="card-badge">${categoryLabel(s.categoria)}</div>
          <div class="card-name">${s.nombre || s.negocio}${s.negocio ? ` — ${s.negocio}` : ''}</div>
          <div class="card-meta">
            ${s.location ? `📍 ${s.location} · ` : ''}📱 ${s.whatsapp}
            ${s.instagram ? ` · 📸 ${s.instagram}` : ''}
            · 📅 ${new Date(s.fechaSolicitud).toLocaleDateString('es-AR')}
          </div>
          <div class="card-desc">${s.descripcion}</div>
        </div>
        <div class="card-actions">
          <button class="btn-approve" onclick="window._aprobar('${s.id}', ${JSON.stringify(s).replace(/"/g, '&quot;')})">
            ✓ Aprobar
          </button>
          <button class="btn-reject" onclick="window._rechazar('${s.id}')">
            ✕ Rechazar
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    lista.innerHTML = `<div class="empty-msg">Error cargando solicitudes: ${err.message}</div>`;
  }
}

// ── CARGAR PUBLICADOS ──
async function loadPublicados() {
  const lista = document.getElementById('listaPublicados');
  try {
    const q = query(collection(db, "providers"), orderBy("fechaCreacion", "desc"));
    const snap = await getDocs(q);
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (docs.length === 0) {
      lista.innerHTML = '<div class="empty-msg">No hay servicios publicados todavía</div>';
      return;
    }

    lista.innerHTML = docs.map(p => `
      <div class="card" id="pub-${p.id}">
        <div class="card-info">
          <div class="card-badge">${categoryLabel(p.category)}</div>
          <div class="card-name">${p.name}${p.negocio ? ` — ${p.negocio}` : ''}</div>
          <div class="card-meta">
            📍 ${p.location}
            ${p.whatsapp ? ` · 📱 ${p.whatsapp}` : ''}
            ${p.instagram ? ` · 📸 ${p.instagram}` : ''}
            · Orden: ${p.orden}
          </div>
          <div class="card-desc">${p.description ? p.description.substring(0, 120) + '...' : ''}</div>
        </div>
        <div class="card-actions">
          <button class="btn-edit" onclick="window._editarPublicado('${p.id}', ${JSON.stringify(p).replace(/"/g, '&quot;')})">
            ✏️ Editar
          </button>
          <button class="btn-delete" onclick="window._eliminar('${p.id}')">
            🗑 Eliminar
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    lista.innerHTML = `<div class="empty-msg">Error: ${err.message}</div>`;
  }
}

// ── APROBAR → abre modal pre-cargado ──
window._aprobar = function(id, data) {
  currentEditId = id;
  currentEditCollection = 'solicitudes';
  isApproving = true;

  document.getElementById('editModalTitle').textContent = 'Completar y publicar';
  document.getElementById('btnSaveModal').textContent = 'Publicar en el directorio ✓';
  document.getElementById('editNombre').value = data.nombre || data.negocio || '';
  document.getElementById('editNegocio').value = data.negocio || '';
  document.getElementById('editCategoria').value = data.categoria || 'otros';
  document.getElementById('editDescripcion').value = data.descripcion || '';
  document.getElementById('editLocation').value = data.location || 'Tandil';
  document.getElementById('editWhatsapp').value = data.whatsapp || '';
  document.getElementById('editInstagram').value = data.instagram || '';
  document.getElementById('editImage').value = data.image || '';
  // Mostrar preview de imagen si existe
  const preview = document.getElementById('editImagePreview');
  if (data.image) {
    preview.innerHTML = `<img src="${data.image}" alt="Logo" style="max-height:80px;max-width:150px;object-fit:contain;border-radius:8px;margin-top:8px;border:1px solid #e2d8cc;" />`;
  } else {
    preview.innerHTML = '<p style="font-size:0.8rem;color:#999;margin-top:4px;">Sin imagen — podés agregar una URL manualmente</p>';
  }

  document.getElementById('editModal').classList.add('active');
};

// ── EDITAR PUBLICADO ──
window._editarPublicado = function(id, data) {
  currentEditId = id;
  currentEditCollection = 'providers';
  isApproving = false;

  document.getElementById('editModalTitle').textContent = 'Editar servicio';
  document.getElementById('btnSaveModal').textContent = 'Guardar cambios';
  document.getElementById('editNombre').value = data.name || '';
  document.getElementById('editNegocio').value = data.negocio || '';
  document.getElementById('editCategoria').value = data.category || 'otros';
  document.getElementById('editDescripcion').value = data.description || '';
  document.getElementById('editLocation').value = data.location || '';
  document.getElementById('editWhatsapp').value = data.whatsapp || '';
  document.getElementById('editInstagram').value = data.instagram || '';
  document.getElementById('editImage').value = data.image || '';
  document.getElementById('editModal').classList.add('active');
};

// ── GUARDAR MODAL ──
window.saveModal = async function() {
  const btn = document.getElementById('btnSaveModal');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  const providerData = {
    name: document.getElementById('editNombre').value.trim(),
    negocio: document.getElementById('editNegocio').value.trim(),
    category: document.getElementById('editCategoria').value,
    description: document.getElementById('editDescripcion').value.trim(),
    location: document.getElementById('editLocation').value.trim(),
    whatsapp: document.getElementById('editWhatsapp').value.trim(),
    instagram: document.getElementById('editInstagram').value.trim(),
    image: document.getElementById('editImage').value.trim(),
    color: 'color-1',
    pendiente: false,
    fechaCreacion: isApproving ? new Date().toISOString() : undefined
  };
  if (!isApproving) delete providerData.fechaCreacion;

  try {
    if (isApproving) {
      await addDoc(collection(db, "providers"), providerData);
      await deleteDoc(doc(db, "solicitudes", currentEditId));
      await loadSolicitudes();
      await loadPublicados();
    } else {
      await updateDoc(doc(db, "providers", currentEditId), providerData);
      await loadPublicados();
    }
    closeEditModal();
  } catch (err) {
    alert('Error guardando: ' + err.message);
  }

  btn.disabled = false;
};

// ── RECHAZAR SOLICITUD ──
window._rechazar = async function(id) {
  if (!confirm('¿Rechazar y eliminar esta solicitud?')) return;
  try {
    await deleteDoc(doc(db, "solicitudes", id));
    await loadSolicitudes();
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

// ── ELIMINAR PUBLICADO ──
window._eliminar = async function(id) {
  if (!confirm('¿Eliminar este servicio del directorio? Esta acción no se puede deshacer.')) return;
  try {
    await deleteDoc(doc(db, "providers", id));
    await loadPublicados();
  } catch (err) {
    alert('Error: ' + err.message);
  }
};

window.closeEditModal = function() {
  document.getElementById('editModal').classList.remove('active');
  currentEditId = null;
  currentEditCollection = null;
  isApproving = false;
  document.getElementById('btnSaveModal').disabled = false;
};
