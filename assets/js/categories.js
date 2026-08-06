export const CATEGORIES = [
  { value: 'niñeras', emoji: '👶', label: 'Niñeras' },
  { value: 'guarderias', emoji: '🏫', label: 'Jardines maternales/Talleres' },
  { value: 'fotografia', emoji: '📸', label: 'Fotografía' },
  { value: 'salud', emoji: '💚', label: 'Salud' },
  { value: 'ropa', emoji: '🧸', label: 'Ropa y accesorios' },
  { value: 'alimentos', emoji: '🥗', label: 'Alimentos' },
  { value: 'fiestas', emoji: '🎉', label: 'Fiestas y Eventos' },
  { value: 'otros', emoji: '✨', label: 'Otros' },
];

export function categoryLabel(value) {
  return CATEGORIES.find(c => c.value === value)?.label || value;
}
