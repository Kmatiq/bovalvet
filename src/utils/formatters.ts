export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0 kr';
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(amount).replace('SEK', 'kr');
}

export function formatDate(isoString: string): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch (e) {
    return isoString;
  }
}

export function getConditionColor(condition: string): string {
  switch (condition) {
    case 'Nyskick':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Mycket bra':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'Bra':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Slitet':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Defekt':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    default:
      return 'bg-stone-50 text-stone-700 border-stone-200';
  }
}

export function getCategoryIconName(category: string): string {
  switch (category) {
    case 'Elektronik & Dator':
      return 'Tv';
    case 'Möbler & Inredning':
      return 'Armchair';
    case 'Vitvaror & Kök':
      return 'Coffee';
    case 'Belysning':
      return 'Lamp';
    case 'Kläder & Textil':
      return 'Shirt';
    case 'Sport & Fritid':
      return 'Bike';
    case 'Verktyg & Maskiner':
      return 'Wrench';
    case 'Konst & Samlarobjekt':
      return 'Palette';
    case 'Smycken & Värdesaker':
      return 'Gem';
    case 'Barn & Leksaker':
      return 'Gamepad2';
    default:
      return 'Package';
  }
}
