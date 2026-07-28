import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getFirestore, collection, addDoc
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { firebaseConfig, emailjsConfig, cloudinaryConfig } from "./config.js";

emailjs.init(emailjsConfig.publicKey);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── Cloudinary upload ──
let selectedImageFile = null;
let uploadedImageUrl = '';

window.handleImageSelect = function(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    alert('La imagen no puede superar los 5MB.');
    return;
  }
  selectedImageFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('uploadPlaceholder').style.display = 'none';
    document.getElementById('uploadPreview').style.display = 'flex';
    document.getElementById('previewImg').src = e.target.result;
  };
  reader.readAsDataURL(file);
};

window.removeImage = function(e) {
  e.stopPropagation();
  selectedImageFile = null;
  uploadedImageUrl = '';
  document.getElementById('logoInput').value = '';
  document.getElementById('uploadPlaceholder').style.display = 'flex';
  document.getElementById('uploadPreview').style.display = 'none';
};

async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', cloudinaryConfig.preset);

  document.getElementById('uploadProgress').style.display = 'block';
  document.getElementById('uploadStatus').textContent = 'Subiendo imagen...';

  const xhr = new XMLHttpRequest();
  xhr.upload.onprogress = e => {
    if (e.lengthComputable) {
      const pct = Math.round((e.loaded / e.total) * 100);
      document.getElementById('uploadBarFill').style.width = pct + '%';
      document.getElementById('uploadStatus').textContent = `Subiendo... ${pct}%`;
    }
  };

  return new Promise((resolve, reject) => {
    xhr.onload = () => {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        document.getElementById('uploadStatus').textContent = '✅ Imagen subida';
        resolve(data.secure_url);
      } else {
        reject(new Error('Error al subir la imagen'));
      }
    };
    xhr.onerror = () => reject(new Error('Error de conexión'));
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloud}/image/upload`);
    xhr.send(formData);
  });
}

// ── Formulario → guarda en Firestore ──
window.submitForm = async function() {
  const nombre = document.getElementById('nombre').value.trim();
  const negocio = document.getElementById('negocio').value.trim();
  const categoria = document.getElementById('categoria').value;
  const ubicacion = document.getElementById('ubicacion').value.trim();
  const whatsapp = document.getElementById('whatsapp').value.trim();
  const descripcion = document.getElementById('descripcion').value.trim();
  const instagram = document.getElementById('instagram').value.trim();

  if (!nombre || !negocio || !categoria || !ubicacion || !whatsapp || !descripcion) {
    alert('Por favor completá todos los campos obligatorios.');
    return;
  }

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  try {
    // Subir imagen a Cloudinary si hay una seleccionada
    if (selectedImageFile) {
      btn.textContent = 'Subiendo imagen...';
      uploadedImageUrl = await uploadToCloudinary(selectedImageFile);
    }

    // Guardar en Firestore
    await addDoc(collection(db, "solicitudes"), {
      nombre,
      negocio,
      categoria,
      location: ubicacion,
      whatsapp,
      instagram,
      descripcion,
      image: uploadedImageUrl || '',
      pendiente: true,
      fechaSolicitud: new Date().toISOString()
    });

    // Notificar por mail
    try {
      await emailjs.send(emailjsConfig.serviceId, emailjsConfig.templateId, {
        negocio: negocio,
        nombre: nombre,
        categoria: categoria,
        ubicacion: ubicacion,
        whatsapp: whatsapp,
        instagram: instagram,
        descripcion: descripcion,
        to_email: emailjsConfig.toEmail
      });
    } catch(mailErr) {
      console.warn('Email no enviado:', mailErr);
    }

    document.getElementById('formContent').style.display = 'none';
    document.getElementById('formSuccess').style.display = 'block';
  } catch (err) {
    console.error("Error:", err);
    alert('Hubo un error al enviar tu solicitud. Por favor intentá de nuevo.');
    btn.disabled = false;
    btn.textContent = 'Quiero aparecer en el directorio 🌿';
    document.getElementById('uploadProgress').style.display = 'none';
  }
};

// ── Scroll animations ──
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
