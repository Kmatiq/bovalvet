import { InventoryItem } from '../types';

export function exportToCSV(items: InventoryItem[], homeName = 'Mitt Hem') {
  const headers = [
    'ID',
    'Namn',
    'Kategori',
    'Rum',
    'Skick',
    'Antal',
    'Uppskattat värde (SEK)',
    'Nypris uppskattat (SEK)',
    'Märke',
    'Modell',
    'Serienummer',
    'Beskrivning',
    'Registrerad datum'
  ];

  const rows = items.map(item => [
    `"${item.id}"`,
    `"${(item.name || '').replace(/"/g, '""')}"`,
    `"${(item.category || '').replace(/"/g, '""')}"`,
    `"${(item.room || '').replace(/"/g, '""')}"`,
    `"${(item.condition || '').replace(/"/g, '""')}"`,
    item.quantity || 1,
    item.estimatedValue || 0,
    item.purchasePriceEstimated || 0,
    `"${(item.brand || '').replace(/"/g, '""')}"`,
    `"${(item.model || '').replace(/"/g, '""')}"`,
    `"${(item.serialNumber || '').replace(/"/g, '""')}"`,
    `"${(item.description || '').replace(/"/g, '""')}"`,
    `"${item.createdAt || ''}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `heminventering-${homeName.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToJSON(items: InventoryItem[], settings: any) {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    settings,
    totalItems: items.length,
    totalValueSEK: items.reduce((acc, curr) => acc + (curr.estimatedValue * (curr.quantity || 1)), 0),
    items,
  };

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `heminventering-backup-${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
