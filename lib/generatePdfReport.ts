import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface VaultItemReport {
  title: string;
  category: string;
  room?: string;
  brand: string;
  model: string;
  estimated_replacement_cost_sek: number;
  market_value_sek: number;
  condition: string;
  serial_number?: string;
  notes?: string;
}

export const generateVaultPdf = (
  items: VaultItemReport[],
  userEmail: string,
  totalReplacementSek: number
) => {
  const doc = new jsPDF();
  const today = new Date().toLocaleDateString("sv-SE");

  // Rubrik & Dokumenthuvud
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(0, 0, 210, 24, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("PRYLKOLL - INVENTARIEFÖRTECKNING & SKADEUNDERLAG", 14, 16);

  // Ägaruppgifter och datum
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Rapport skapad: ${today}`, 14, 32);
  doc.text(`Ägare / Konto: ${userEmail}`, 14, 38);
  doc.text(`Antal inventerade föremål: ${items.length} st`, 14, 44);

  // Sammanfattningsruta (Nypris & Återanskaffning)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(120, 28, 76, 20, 2, 2, "FD");

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text("TOTALT ÅTERANSKAFFNINGSVÄRDE", 124, 34);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`${totalReplacementSek.toLocaleString("sv-SE")} SEK`, 124, 43);

  // Tabell med inventarier inklusive Rum/Placering
  const tableRows = items.map((item, idx) => [
    idx + 1,
    item.title,
    item.room || "Ospecificerat",
    `${item.brand || "-"} ${item.model ? `\nModell: ${item.model}` : ""}`,
    item.serial_number || "Ej angivet",
    item.condition || "Gott",
    `${Number(item.estimated_replacement_cost_sek || 0).toLocaleString("sv-SE")} kr`,
  ]);

  autoTable(doc, {
    startY: 52,
    head: [["#", "Föremål", "Rum / Plats", "Märke / Modell", "Serienummer", "Skick", "Nypris (SEK)"]],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: "bold",
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 36 },
      2: { cellWidth: 28 },
      3: { cellWidth: 40 },
      4: { cellWidth: 30 },
      5: { cellWidth: 20 },
      6: { cellWidth: 26, halign: "right" },
    },
  });

  // Sidfot
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `PrylKoll Automatiskt Skadeunderlag • Sida ${i} av ${pageCount} • Verifierad inventarieförteckning`,
      14,
      290
    );
  }

  doc.save(`PrylKoll_Inventarieforteckning_${today}.pdf`);
};