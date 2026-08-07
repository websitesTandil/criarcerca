export const CATEGORIES = [
  { value: 'alimentos', emoji: '🥗', label: 'Alimentos' },
  { value: 'fiestas', emoji: '🎉', label: 'Fiestas y Eventos' },
  { value: 'fotografia', emoji: '📸', label: 'Fotografía' },
  { value: 'guarderias', emoji: '🏫', label: 'Jardines maternales/Talleres' },
  { value: 'niñeras', emoji: '👶', label: 'Niñeras' },
  { value: 'otros', emoji: '✨', label: 'Otros' },
  { value: 'ropa', emoji: '🧸', label: 'Ropa y accesorios' },
  { value: 'salud', emoji: '💚', label: 'Salud' },
];

export function categoryLabel(value) {
  return CATEGORIES.find(c => c.value === value)?.label || value;
}
