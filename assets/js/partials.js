import { CATEGORIES } from "./categories.js";

// Fragmentos de HTML repetidos entre servicios.html y las páginas de categoría.
// basePath es '' en la raíz y '../' dentro de /categorias/.

// Qué página de /categorias/ corresponde a cada valor de categoría.
// "otros" no tiene página propia (ver explicación en la conversación).
const CATEGORY_PAGES = {
  'niñeras': 'ninieras-tandil.html',
  fotografia: 'fotografia-bebes-tandil.html',
  fiestas: 'fiestas-infantiles-tandil.html',
  ropa: 'ropa-infantil-tandil.html',
  alimentos: 'alimentos-saludables-tandil.html',
  guarderias: 'jardines-maternales-tandil.html',
  salud: 'salud-infantil-tandil.html',
};

function headerHtml(basePath) {
  return `
    <a href="${basePath}index.html" class="logo">Criar <span>Cerca</span></a>
    <button class="nav-toggle" aria-label="Abrir menú" aria-expanded="false">
      <span></span><span></span><span></span>
    </button>
    <nav>
      <a href="${basePath}servicios.html">Servicios</a>
      <a href="${basePath}unirse.html">Unirse</a>
      <a href="${basePath}faq.html">FAQ</a>
      <a href="https://www.instagram.com/criar.cerca" target="_blank">Instagram</a>
    </nav>`;
}

function footerHtml() {
  return `
    <div class="footer-logo">Criar <span>Cerca</span></div>
    <p>El directorio de familias de Tandil y zona</p>
    <p><a href="https://www.instagram.com/criar.cerca" target="_blank">@criar.cerca</a></p>`;
}

function whatsappBtnHtml() {
  return `
    <a href="https://wa.me/5492494209036?text=Hola!%20Te%20contacto%20desde%20Criar%20Cerca.%20Me%20interesa%20saber%20más%20sobre%20vuestros%20servicios." class="whatsapp-btn" target="_blank" title="Contactame por WhatsApp">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004c-1.452 0-2.89.474-4.038 1.362.588.029 1.079-.097 1.438-.419.365-.328.619-.708.782-1.123 1.055-.078 2.019.467 2.573 1.177.276-.133.545-.314.791-.534-1.15-1.021-2.724-1.463-4.542-1.463"/>
      </svg>
    </a>`;
}

function modalHtml() {
  return `
    <div class="modal" id="modal">
      <div class="modal-header" id="modalHeader">
        <span id="modalEmoji"></span>
        <button class="modal-close" onclick="closeModalBtn()">✕</button>
      </div>
      <div class="modal-body">
        <div class="modal-cat" id="modalCat"></div>
        <h2 id="modalName"></h2>
        <p id="modalDesc"></p>
        <div class="modal-info" id="modalInfo"></div>
        <a href="#" class="modal-contact-btn" id="modalContact" target="_blank">Contactar por WhatsApp</a>
      </div>
    </div>`;
}

// Inyecta header, footer, botón de WhatsApp y el contenido del modal en los
// contenedores #siteHeader / #siteFooter / #siteWhatsapp / #modalOverlay de la página.
export function mountPartials(basePath = '') {
  const header = document.getElementById('siteHeader');
  if (header) header.innerHTML = headerHtml(basePath);

  const footer = document.getElementById('siteFooter');
  if (footer) footer.innerHTML = footerHtml();

  const whatsapp = document.getElementById('siteWhatsapp');
  if (whatsapp) whatsapp.outerHTML = whatsappBtnHtml();

  const modal = document.getElementById('modalOverlay');
  if (modal) modal.innerHTML = modalHtml();
}

// Arma la nav de "Otras categorías" a partir de CATEGORIES, marcando como
// activa la de currentCategory. Se inyecta en el contenedor #categoryPills.
export function mountCategoryPills(currentCategory, basePath = '') {
  const nav = document.getElementById('categoryPills');
  if (!nav) return;

  const pills = CATEGORIES
    .filter(c => CATEGORY_PAGES[c.value])
    .map(c => {
      const cls = c.value === currentCategory ? 'filter-btn active' : 'filter-btn';
      return `<a class="${cls}" href="${CATEGORY_PAGES[c.value]}">${c.emoji} ${c.label}</a>`;
    })
    .join('');

  nav.innerHTML = `${pills}<a class="filter-btn" href="${basePath}servicios.html">Ver todos</a>`;
}
