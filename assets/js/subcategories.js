// Subcategorías por categoría. Por ahora solo "fiestas" las usa; se generalizó
// a un mapa por si a futuro otra categoría también las necesita.
export const SUBCATEGORIES = {
  fiestas: [
    { value: 'pasteleria', label: 'Pastelería y comida' },
    { value: 'souvenirs', label: 'Souvenirs y papelería' },
    { value: 'salones', label: 'Salones y quinchos' },
    { value: 'animacion', label: 'Animación y juegos' },
    { value: 'decoracion', label: 'Decoración' },
  ],
};

export function subcategoriesFor(categoryValue) {
  return SUBCATEGORIES[categoryValue] || [];
}

export function subcategoryLabel(categoryValue, subcategoryValue) {
  return subcategoriesFor(categoryValue).find(s => s.value === subcategoryValue)?.label || subcategoryValue;
}
