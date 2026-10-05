import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface VaultExportItem {
  id: string;
  title: string;
  category?: string;
  room?: string;
  brand?: string;
  model?: string;
  estimated_replacement_cost_sek: number;
  market_value_sek: number;
  condition?: string;
  serial_number?: string;
  notes?: string;
  purchase_date?: string;
  purchase_store?: string;
  purchase_price_sek?: number;
  warranty_months?: number;
  receipt_path?: string;
  receiptUrl?: string;
  imageUrl?: string;
}

export interface PropertyMeta {
  name: string;
  property_type: string;
  address?: string;
  living_area_sqm?: number;
  insurance_company?: string;
  policy_number?: string;
  coverage_limit_sek?: number;
  deductible_sek?: number;
}

// Hjälpfunktion för att sortera föremål per rum och därefter namn
function sortItemsByRoom(items: VaultExportItem[]): VaultExportItem[] {
  return [...items].sort((a, b) => {
    const roomA = a.room?.trim() || "Övrigt / Ospecificerat";
    const roomB = b.room?.trim() || "Övrigt / Ospecificerat";
    const roomComp = roomA.localeCompare(roomB, "sv");
    if (roomComp !== 0) return roomComp;
    return (a.title || "").localeCompare(b.title || "", "sv");
  });
}

// -------------------------------------------------------------
// 1. KALKYLARK (EXCEL / APPLE NUMBERS / GOOGLE SHEETS)
// -------------------------------------------------------------
export function exportToCsv(items: VaultExportItem[], filename = "bovalvet-inventering.csv") {
  const sortedItems = sortItemsByRoom(items);

  const headers = [
    "Rum",
    "Föremål",
    "Kategori",
    "Märke",
    "Modell",
    "Skick",
    "Nypris (kr)",
    "Marknadsvärde (kr)",
    "Inköpsdatum",
    "Inköpsbutik",
    "Inköpspris (kr)",
    "Garanti (mån)",
    "Kvitto sparat",
    "Serienummer",
    "Noteringar"
  ];

  const escapeCell = (val: any) => {
    if (val === undefined || val === null) return "";
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = sortedItems.map((i) => [
    escapeCell(i.room || "Ospecificerat"),
    escapeCell(i.title),
    escapeCell(i.category || "Övrigt"),
    escapeCell(i.brand || ""),
    escapeCell(i.model || ""),
    escapeCell(i.condition || "Gott"),
    escapeCell(Math.round(Number(i.estimated_replacement_cost_sek) || 0)),
    escapeCell(Math.round(Number(i.market_value_sek) || 0)),
    escapeCell(i.purchase_date || ""),
    escapeCell(i.purchase_store || ""),
    escapeCell(i.purchase_price_sek ? Math.round(Number(i.purchase_price_sek)) : ""),
    escapeCell(i.warranty_months || ""),
    escapeCell(i.receipt_path ? "Ja" : "Nej"),
    escapeCell(i.serial_number || ""),
    escapeCell(i.notes || "")
  ]);

  const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------
// 2. FÄRDIG PDF-RAPPORT FÖR FÖRSÄKRINGSBOLAG & UTSKRIFT
// -------------------------------------------------------------
export function generateVaultPdf(
  items: VaultExportItem[],
  userIdentifier: string,
  totalValuationSek: number,
  property?: PropertyMeta | null
) {
  const sortedItems = sortItemsByRoom(items);
  const doc = new jsPDF();
  const dateStr = new Date().toLocaleDateString("sv-SE");
  const totalMarketValuation = sortedItems.reduce((sum, i) => sum + (Number(i.market_value_sek) || 0), 0);

  // Sidhuvud
  doc.setFillColor(13, 19, 17);
  doc.rect(0, 0, 210, 36, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("BoValvet", 15, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(165, 180, 175);
  doc.text("Inventarieförteckning och lösöresunderlag (Sorterat per rum)", 15, 28);
  doc.text(`Datum: ${dateStr}`, 195, 28, { align: "right" });

  // Bostads- och ägaruppgifter
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("BOSTADS- & ÄGARUPPGIFTER", 15, 46);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Innehavare: ${userIdentifier}`, 15, 52);
  doc.text(`Bostad: ${property?.name || "Hemma"} (${property?.property_type || "Bostadsrätt"}${property?.living_area_sqm ? `, ${property.living_area_sqm} m²` : ""})`, 15, 57);
  if (property?.address) doc.text(`Adress: ${property.address}`, 15, 62);

  const rightColX = 120;
  doc.text(`Försäkringsbolag: ${property?.insurance_company || "Ej specificerat"}`, rightColX, 52);
  if (property?.policy_number) doc.text(`Avtalsnummer: ${property.policy_number}`, rightColX, 57);
  doc.text(`Försäkringsbelopp lösöre: ${Number(property?.coverage_limit_sek || 1000000).toLocaleString("sv-SE")} kr`, rightColX, 62);

  // Summeringskort
  doc.setFillColor(245, 247, 246);
  doc.roundedRect(15, 68, 180, 22, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("TOTALT INVENTERAT:", 22, 77);
  doc.text("TOTALT NYPRIS:", 80, 77);
  doc.text("UPPSKATTAT MARKNADSVÄRDE:", 135, 77);

  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text(`${sortedItems.length} föremål`, 22, 85);
  doc.text(`${totalValuationSek.toLocaleString("sv-SE")} kr`, 80, 85);
  doc.setTextColor(45, 138, 114);
  doc.text(`${totalMarketValuation.toLocaleString("sv-SE")} kr`, 135, 85);

  const tableData = sortedItems.map((i, idx) => [
    idx + 1,
    i.room || "Ospec.",
    i.title,
    i.brand ? `${i.brand} ${i.model || ""}`.trim() : "—",
    i.receipt_path ? "Ja ✓" : "Nej",
    i.serial_number || "—",
    `${Number(i.estimated_replacement_cost_sek || 0).toLocaleString("sv-SE")} kr`
  ]);

  autoTable(doc, {
    startY: 96,
    head: [["#", "Rum", "Föremål", "Märke / Modell", "Kvitto", "Serienummer", "Nypris"]],
    body: tableData,
    theme: "striped",
    headStyles: {
      fillColor: [30, 41, 38],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
      halign: "left"
    },
    bodyStyles: {
      fontSize: 8,
      textColor: 30
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 28, fontStyle: "bold" },
      2: { cellWidth: 48 },
      3: { cellWidth: 38 },
      4: { cellWidth: 16, halign: "center" },
      5: { cellWidth: 22 },
      6: { cellWidth: 20, halign: "right" }
    },
    didDrawPage: (data) => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(140);
      doc.text(
        `Skapad via BoValvet (https://bovalvet.se) — Sida ${data.pageNumber} av ${pageCount}`,
        15,
        290
      );
    }
  });

  doc.save(`BoValvet-Inventarieforteckning-${dateStr}.pdf`);
}

// -------------------------------------------------------------
// 3. JURIDISKT SKADEPAKET VID SKADA ELLER INBROTT (PDF)
// -------------------------------------------------------------
export function generateIncidentPdf(options: {
  incidentType: string;
  incidentDate: string;
  policeReportNumber?: string;
  property: PropertyMeta;
  userEmail: string;
  items: VaultExportItem[];
}) {
  const { incidentType, incidentDate, policeReportNumber, property, userEmail, items } = options;
  const sortedItems = sortItemsByRoom(items);
  const doc = new jsPDF();
  const dateStr = new Date().toLocaleDateString("sv-SE");

  const totalCost = sortedItems.reduce((sum, i) => sum + (Number(i.estimated_replacement_cost_sek) || 0), 0);
  const totalMarket = sortedItems.reduce((sum, i) => sum + (Number(i.market_value_sek) || 0), 0);

  doc.setFillColor(185, 28, 28);
  doc.rect(0, 0, 210, 36, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("SKADEANMÄLAN & ERSÄTTNINGSUNDERLAG", 15, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(254, 226, 226);
  doc.text("Underlag för lösöresersättning · Genererat via BoValvet", 15, 28);
  doc.text(`Utskrivet: ${dateStr}`, 195, 28, { align: "right" });

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(15, 42, 88, 38, 2, 2, "FD");
  doc.roundedRect(107, 42, 88, 38, 2, 2, "FD");

  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("HÄNDELSEUPPGIFTER", 20, 49);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Skadetyp: ${incidentType}`, 20, 56);
  doc.text(`Skadedatum: ${incidentDate}`, 20, 62);
  doc.text(`Polisanmälningsnr: ${policeReportNumber || "Ej tillämpligt"}`, 20, 68);
  doc.text(`Drabbade föremål: ${sortedItems.length} st`, 20, 74);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("FÖRSÄKRINGSTAGARE & BOSTAD", 112, 49);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Försäkringstagare: ${userEmail}`, 112, 56);
  doc.text(`Bostad: ${property.name} (${property.property_type})`, 112, 62);
  doc.text(`Försäkringsbolag: ${property.insurance_company || "Ej angivet"}`, 112, 68);
  doc.text(`Avtalsnummer: ${property.policy_number || "Ej angivet"}`, 112, 74);

  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(252, 165, 165);
  doc.roundedRect(15, 84, 180, 20, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(153, 27, 27);
  doc.text("TOTALT ANSPRÅK (NYPRIS):", 22, 93);
  doc.text("BERÄKNAT MARKNADSVÄRDE FÖRE SKADA:", 110, 93);

  doc.setFontSize(13);
  doc.text(`${totalCost.toLocaleString("sv-SE")} kr`, 22, 100);
  doc.setTextColor(30, 41, 59);
  doc.text(`${totalMarket.toLocaleString("sv-SE")} kr`, 110, 100);

  const tableData = sortedItems.map((i, idx) => [
    idx + 1,
    i.room || "Ospec.",
    i.title,
    `${i.brand || ""} ${i.model || ""}`.trim() || "—",
    i.serial_number || "—",
    i.purchase_date || "—",
    i.receipt_path ? "Finns ✓" : "Saknas",
    `${Number(i.estimated_replacement_cost_sek || 0).toLocaleString("sv-SE")} kr`
  ]);

  autoTable(doc, {
    startY: 108,
    head: [["#", "Rum", "Drabbat föremål", "Märke / Modell", "Serienr", "Inköpt", "Kvitto", "Nypris"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [185, 28, 28],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
      halign: "left"
    },
    bodyStyles: {
      fontSize: 8,
      textColor: 30
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 22, fontStyle: "bold" },
      2: { cellWidth: 44 },
      3: { cellWidth: 32 },
      4: { cellWidth: 20 },
      5: { cellWidth: 18 },
      6: { cellWidth: 16, halign: "center" },
      7: { cellWidth: 20, halign: "right" }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 200;

  const signY = Math.min(finalY + 14, 245);
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("Härmed intygas på heder och samvete att ovanstående förteckning och värden är sanningsenliga.", 15, signY);

  doc.line(15, signY + 18, 95, signY + 18);
  doc.line(110, signY + 18, 195, signY + 18);

  doc.setFontSize(8);
  doc.text("Ort och datum", 15, signY + 23);
  doc.text("Försäkringstagarens underskrift", 110, signY + 23);

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(`BoValvet Skadeunderlag · Sida ${i} av ${pageCount}`, 15, 290);
  }

  doc.save(`BoValvet-Skadeanmalan-${incidentType.replace(/[^a-zA-Z0-9åäöÅÄÖ]/g, "_")}-${dateStr}.pdf`);
}