/* eslint-disable @typescript-eslint/no-explicit-any */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PropertyInfo {
  name: string;
  property_type: string;
  address?: string;
  insurance_company?: string;
  policy_number?: string;
  coverage_limit_sek: number;
  deductible_sek: number;
}

interface VaultItem {
  id: string;
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
  purchase_date?: string;
  purchase_store?: string;
  purchase_price_sek?: number;
  receipt_path?: string;
}

export interface IncidentReportParams {
  incidentType: string;
  incidentDate: string;
  policeReportNumber?: string;
  description?: string;
  property: PropertyInfo;
  userEmail: string;
  items: VaultItem[];
}

// 1. STANDARD INVENTARIELISTA (PDF)
export function generateVaultPdf(items: VaultItem[], userEmail: string, totalValuation: number) {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59);
  doc.text("BoValvet - Inventarieförteckning", 14, 22);

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Ägare: ${userEmail}`, 14, 29);
  doc.text(`Genererad: ${new Date().toLocaleDateString("sv-SE")} ${new Date().toLocaleTimeString("sv-SE")}`, 14, 34);

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, 39, 182, 18, 3, 3, "FD");

  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);
  doc.text(`Totalt inventerade föremål: ${items.length} st`, 18, 50);
  doc.setFont("helvetica", "bold");
  doc.text(`Samlat nypris: ${totalValuation.toLocaleString("sv-SE")} kr`, 110, 50);
  doc.setFont("helvetica", "normal");

  const tableData = items.map((item) => [
    item.title,
    item.category,
    item.room || "Ospecificerat",
    `${item.brand} ${item.model || ""}`.trim(),
    item.serial_number || "-",
    item.receipt_path ? "Ja" : "Nej",
    `${Number(item.estimated_replacement_cost_sek).toLocaleString("sv-SE")} kr`,
    `${Number(item.market_value_sek).toLocaleString("sv-SE")} kr`,
  ]);

  autoTable(doc, {
    startY: 63,
    head: [["Föremål", "Kategori", "Rum", "Märke / Modell", "Serienr", "Kvitto", "Nypris", "Beg. värde"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 32 },
      3: { cellWidth: 30 },
      4: { cellWidth: 22 },
      5: { cellWidth: 14, halign: "center" },
      6: { halign: "right" },
      7: { halign: "right" },
    },
  });

  doc.save(`BoValvet-Inventarium-${new Date().toISOString().split("T")[0]}.pdf`);
}

// 2. SKARP SKADEANMÄLAN / INCIDENTRAPPORT (PDF)
export function generateIncidentPdf(params: IncidentReportParams) {
  const doc = new jsPDF();
  const { incidentType, incidentDate, policeReportNumber, description, property, userEmail, items } = params;

  const totalReplacement = items.reduce((sum, i) => sum + (Number(i.estimated_replacement_cost_sek) || 0), 0);
  const totalMarket = items.reduce((sum, i) => sum + (Number(i.market_value_sek) || 0), 0);
  const deductible = property.deductible_sek || 1500;
  const netClaim = Math.max(0, totalReplacement - deductible);

  // Röd accent för skadeanmälan
  doc.setFillColor(225, 29, 72);
  doc.rect(0, 0, 210, 8, "F");

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(159, 18, 57);
  doc.text("SKADEANMÄLAN & FÖRSÄKRINGSUNDERLAG", 14, 22);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Rapport skapad via BoValvet: ${new Date().toLocaleDateString("sv-SE")}`, 14, 28);

  // RUTA 1: INCIDENTUPPGIFTER
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 205, 211);
  doc.roundedRect(14, 33, 88, 38, 2, 2, "FD");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(159, 18, 57);
  doc.text("HÄNDELSE & SKADA", 18, 40);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(`Typ av skada:`, 18, 47);
  doc.setFont("helvetica", "bold");
  doc.text(`${incidentType}`, 45, 47);

  doc.setFont("helvetica", "normal");
  doc.text(`Händelsedatum:`, 18, 53);
  doc.text(`${incidentDate}`, 45, 53);

  doc.text(`Polisdiarienr:`, 18, 59);
  doc.text(`${policeReportNumber || "Ej tillämpligt"}`, 45, 59);

  doc.text(`Anmälare:`, 18, 65);
  doc.text(`${userEmail}`, 45, 65);

  // RUTA 2: FÖRSÄKRING & BOSTAD
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(108, 33, 88, 38, 2, 2, "FD");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text("BOSTAD & FÖRSÄKRING", 112, 40);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(51, 65, 85);
  doc.text(`Bostad:`, 112, 47);
  doc.text(`${property.name} (${property.property_type})`, 140, 47);

  doc.text(`Adress:`, 112, 53);
  doc.text(`${property.address || "Ej angiven"}`, 140, 53);

  doc.text(`Försäkringsbolag:`, 112, 59);
  doc.text(`${property.insurance_company || "Ej angivet"}`, 140, 59);

  doc.text(`Avtals-/Polisnr:`, 112, 65);
  doc.text(`${property.policy_number || "Ej angivet"}`, 140, 65);

  let currentY = 75;

  if (description) {
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, currentY, 182, 14, 2, 2, "FD");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Händelsebeskrivning: ${description}`, 18, currentY + 9);
    currentY += 19;
  }

  // TABELL ÖVER DRABBADE FÖREMÅL
  const tableData = items.map((item) => [
    item.title,
    item.room || "-",
    `${item.brand} ${item.model || ""}`.trim(),
    item.serial_number || "Ej angivet",
    item.purchase_date ? `${item.purchase_date} (${item.purchase_store || ""})` : "-",
    item.receipt_path ? "Sparat i valv" : "Saknas",
    `${Number(item.estimated_replacement_cost_sek).toLocaleString("sv-SE")} kr`,
    `${Number(item.market_value_sek).toLocaleString("sv-SE")} kr`,
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [["Drabbat föremål", "Rum", "Fabrikat / Modell", "Serienummer / PNC", "Inköp", "Kvitto", "Nypris", "Beg. värde"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [159, 18, 57], textColor: 255, fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { cellWidth: 32 },
      2: { cellWidth: 28 },
      3: { cellWidth: 26 },
      4: { cellWidth: 26 },
      5: { cellWidth: 16 },
      6: { halign: "right" },
      7: { halign: "right" },
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;

  // ERSÄTTNINGSKALKYL & SAMMANFATTNING
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(159, 18, 57);
  doc.roundedRect(110, finalY, 86, 32, 2, 2, "FD");

  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Drabbade föremål:`, 114, finalY + 7);
  doc.text(`${items.length} st`, 188, finalY + 7, { align: "right" });

  doc.text(`Totalt återanskaffningsvärde:`, 114, finalY + 13);
  doc.text(`${totalReplacement.toLocaleString("sv-SE")} kr`, 188, finalY + 13, { align: "right" });

  doc.text(`Avtalad självrisk:`, 114, finalY + 19);
  doc.text(`- ${deductible.toLocaleString("sv-SE")} kr`, 188, finalY + 19, { align: "right" });

  doc.setDrawColor(226, 232, 240);
  doc.line(114, finalY + 22, 192, finalY + 22);

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(159, 18, 57);
  doc.text(`Beräknat ersättningsanspråk:`, 114, finalY + 28);
  doc.text(`${netClaim.toLocaleString("sv-SE")} kr`, 188, finalY + 28, { align: "right" });

  doc.save(`Skadeanmalan-${incidentType}-${incidentDate}.pdf`);
}