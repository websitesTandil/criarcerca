// Subcategorías por categoría. Por ahora solo "fiestas" las usa; se generalizó
// a un mapa por si a futuro otra categoría también las necesita.
export const SUBCATEGORIES = {
  fiestas: [
    // `page` (archivo dentro de /categorias/) y `pageLabel` (texto del link) solo
    // los definen las subcategorías que tienen página propia.
    { value: 'pasteleria', label: 'Pastelería y catering', page: 'tortas-cumpleanos-tandil.html', pageLabel: '🎂 Tortas y pastelería' },
    { value: 'souvenirs', label: 'Souvenirs y papelería', page: 'souvenirs-cumpleanos-tandil.html', pageLabel: '🎁 Souvenirs y papelería' },
    { value: 'salones', label: 'Peloteros y salones', page: 'salones-fiestas-infantiles-tandil.html', pageLabel: '🏰 Peloteros y salones' },
    { value: 'animacion', label: 'Animación y juegos', page: 'animacion-inflables-tandil.html', pageLabel: '🎈 Animación e inflables' },
    { value: 'decoracion', label: 'Decoración' },
  ],
};

export function subcategoriesFor(categoryValue) {
  return SUBCATEGORIES[categoryValue] || [];
}

export function subcategoryPagesFor(categoryValue) {
  return subcategoriesFor(categoryValue).filter(s => s.page);
}

export function subcategoryLabel(categoryValue, subcategoryValue) {
  return subcategoriesFor(categoryValue).find(s => s.value === subcategoryValue)?.label || subcategoryValue;
}
