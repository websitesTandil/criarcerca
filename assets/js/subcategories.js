// Subcategorías por categoría. Por ahora solo "fiestas" las usa; se generalizó
// a un mapa por si a futuro otra categoría también las necesita.
export const SUBCATEGORIES = {
  fiestas: [
    // `page` (archivo dentro de /categorias/) solo lo definen las subcategorías
    // que tienen página propia: en la página de la categoría esos botones son
    // links a esa página en vez de filtros.
    { value: 'pasteleria', label: 'Pastelería y catering', page: 'tortas-cumpleanos-tandil.html' },
    { value: 'souvenirs', label: 'Souvenirs y papelería', page: 'souvenirs-cumpleanos-tandil.html' },
    { value: 'salones', label: 'Peloteros y salones', page: 'salones-fiestas-infantiles-tandil.html' },
    { value: 'animacion', label: 'Animación y juegos', page: 'animacion-inflables-tandil.html' },
    { value: 'decoracion', label: 'Decoración' },
  ],
};

export function subcategoriesFor(categoryValue) {
  return SUBCATEGORIES[categoryValue] || [];
}

export function subcategoryLabel(categoryValue, subcategoryValue) {
  return subcategoriesFor(categoryValue).find(s => s.value === subcategoryValue)?.label || subcategoryValue;
}
