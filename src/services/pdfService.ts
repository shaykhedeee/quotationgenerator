/**
 * Pure jsPDF PDF generator – NO html2canvas, NO CSS rendering.
 * Draws every element programmatically so it works 100% of the time
 * regardless of Tailwind version or browser color-space support.
 */
import { jsPDF } from 'jspdf';
import { Quotation, CompanyProfile } from '../types';

// ── Colour palette ────────────────────────────────────────────────────────────
type RGB = [number, number, number];
const NAVY:      RGB = [26,  46,  90];
const WHITE:     RGB = [255, 255, 255];
const SLATE_50:  RGB = [248, 250, 252];
const SLATE_100: RGB = [241, 245, 249];
const SLATE_200: RGB = [226, 232, 240];
const SLATE_300: RGB = [203, 213, 225];
const SLATE_400: RGB = [148, 163, 184];
const SLATE_500: RGB = [100, 116, 139];
const SLATE_600: RGB = [71,  85,  105];
const SLATE_700: RGB = [51,  65,  85];
const SLATE_900: RGB = [15,  23,  42];
const EMERALD:   RGB = [4,   120, 87];
const RED:       RGB = [220, 38,  38];
const LIGHT_BLUE: RGB = [235, 241, 255];
const NAVY_SOFT:  RGB = [180, 200, 235];
const GOLD:       RGB = [184, 148, 66];

// ── Page geometry ─────────────────────────────────────────────────────────────
const PW   = 210;   // A4 width  mm
const PH   = 297;   // A4 height mm
const ML   = 14;    // left margin
const MR   = 14;    // right margin
const CW   = PW - ML - MR;  // content width = 182 mm
const RE   = ML + CW;        // right edge   = 196 mm

// ── Table column left-edges (absolute mm) ────────────────────────────────────
// #(12) | Desc(70) | Dim(26) | Sqft(18) | Rate(24) | Amt(32) = 182
const TC = {
  num:  ML,
  desc: ML + 12,
  dim:  ML + 82,
  sqft: ML + 108,
  rate: ML + 126,
  amt:  ML + 150,
  end:  RE,
};
const COL_W = {
  num:  12,
  desc: 70,
  dim:  26,
  sqft: 18,
  rate: 24,
  amt:  32,
};

// ── Number formatter ─────────────────────────────────────────────────────────
const fmt  = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 0 });
const Rs   = (n: number) => `Rs. ${fmt(n)}`;

// ── Amount in words ──────────────────────────────────────────────────────────
function amountInWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const below100 = (n: number): string => {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
  };
  const below1000 = (n: number): string => {
    if (n < 100) return below100(n);
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + below100(n % 100) : '');
  };

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  if (rupees === 0) return 'Zero Rupees Only';

  let result = '';
  if (rupees >= 1_00_00_000) {
    result += below1000(Math.floor(rupees / 1_00_00_000)) + ' Crore ';
    const rem = rupees % 1_00_00_000;
    if (rem >= 1_00_000) result += below1000(Math.floor(rem / 1_00_000)) + ' Lakh ';
    if (rem % 1_00_000 >= 1000) result += below1000(Math.floor((rem % 1_00_000) / 1000)) + ' Thousand ';
    if (rem % 1000 > 0) result += below1000(rem % 1000);
  } else if (rupees >= 1_00_000) {
    result += below1000(Math.floor(rupees / 1_00_000)) + ' Lakh ';
    const rem = rupees % 1_00_000;
    if (rem >= 1000) result += below1000(Math.floor(rem / 1000)) + ' Thousand ';
    if (rem % 1000 > 0) result += below1000(rem % 1000);
  } else if (rupees >= 1000) {
    result += below1000(Math.floor(rupees / 1000)) + ' Thousand ';
    if (rupees % 1000 > 0) result += below1000(rupees % 1000);
  } else {
    result = below1000(rupees);
  }

  result = result.trim() + ' Rupees';
  if (paise > 0) result += ' and ' + below100(paise) + ' Paise';
  result += ' Only';
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
export function generateQuotationPDF(quotation: Quotation, companyProfile?: CompanyProfile): void {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  let y = 0;
  let pageNum = 1;
  let insideTable = false; // used to re-draw table header after page break

  // ── Helper setters ──────────────────────────────────────────────────────────
  const tc  = (c: RGB) => pdf.setTextColor(c[0], c[1], c[2]);
  const fc  = (c: RGB) => pdf.setFillColor(c[0], c[1], c[2]);
  const dc  = (c: RGB) => pdf.setDrawColor(c[0], c[1], c[2]);
  const lw  = (w: number) => pdf.setLineWidth(w);
  const sf  = (style: 'normal'|'bold'|'italic', size: number) => {
    pdf.setFont('helvetica', style);
    pdf.setFontSize(size);
  };

  // ── Footer ──────────────────────────────────────────────────────────────────
  const drawFooter = () => {
    fc(NAVY);
    pdf.rect(0, PH - 11, PW, 11, 'F');
    sf('normal', 6.5);
    tc(WHITE);
    pdf.text(companyProfile?.name || 'SPACES 360', ML, PH - 4.5);
    pdf.text(quotation.quoteNumber, PW / 2, PH - 4.5, { align: 'center' });
    pdf.text(companyProfile?.phone || '', RE, PH - 4.5, { align: 'right' });
    sf('bold', 6.5);
    pdf.text(`Page ${pageNum}`, PW / 2, PH - 1.5, { align: 'center' });
  };

  // ── DRAFT / CONFIDENTIAL watermark ─────────────────────────────────────────
  const drawWatermark = (label: string, color: RGB) => {
    pdf.saveGraphicsState();
    pdf.setGState(new (pdf as any).GState({ opacity: 0.07 }));
    sf('bold', 72);
    tc(color);
    pdf.text(label, PW / 2, PH / 2, { align: 'center', angle: 45 });
    pdf.restoreGraphicsState();
  };

  // ── Table header row (re-drawable after page break) ─────────────────────────
  const drawTableHeader = () => {
    fc(NAVY); pdf.rect(ML, y, CW, 7, 'F');
    sf('bold', 6); tc(WHITE);
    pdf.text('#',          TC.num  + 2,           y + 5);
    pdf.text('DESCRIPTION',TC.desc + 1,           y + 5);
    pdf.text('DIMENSIONS', TC.dim  + 1,           y + 5);
    pdf.text('SQFT',       TC.sqft + COL_W.sqft - 1, y + 5, { align: 'right' });
    pdf.text('RATE',       TC.rate + COL_W.rate - 1,  y + 5, { align: 'right' });
    pdf.text('AMOUNT',     TC.end  - 1,           y + 5, { align: 'right' });
    y += 7;
  };

  // ── Page-break guard ────────────────────────────────────────────────────────
  const guard = (needed: number) => {
    if (y + needed > PH - 16) {
      drawFooter();
      pdf.addPage();
      pageNum++;
      y = 10;
      if (quotation.status === 'DRAFT') drawWatermark('DRAFT', SLATE_400);
      if (insideTable) drawTableHeader();
    }
  };

  // ── Horizontal rule ─────────────────────────────────────────────────────────
  const rule = (c: RGB = SLATE_200, weight = 0.2) => {
    dc(c); lw(weight);
    pdf.line(ML, y, RE, y);
    y += 3;
  };

  // ── Section title ───────────────────────────────────────────────────────────
  const secTitle = (text: string) => {
    guard(12);
    sf('bold', 7.5); tc(SLATE_500);
    pdf.text(text, ML, y);
    dc(SLATE_300); lw(0.25);
    pdf.line(ML, y + 1.5, RE, y + 1.5);
    y += 5;
  };

  // ════════════════════════════════════════════════════════════════════════════
  // 0. COVER PAGE  (full-page branded cover)
  // ════════════════════════════════════════════════════════════════════════════
  // Deep navy background
  fc(NAVY);
  pdf.rect(0, 0, PW, PH, 'F');

  // Diagonal accent band (bottom-right triangle-ish)
  fc([20, 38, 78]);
  pdf.rect(PW * 0.5, 0, PW, PH, 'F');

  // Top gold accent bar
  fc(GOLD);
  pdf.rect(0, 0, PW, 2.5, 'F');

  // Bottom gold accent bar
  fc(GOLD);
  pdf.rect(0, PH - 2.5, PW, 2.5, 'F');

  // Right-side vertical accent
  fc(GOLD);
  pdf.rect(PW - 8, 0, 8, PH, 'F');

  // Cover – Company name (large)
  sf('bold', 32);
  tc(WHITE);
  pdf.text((companyProfile?.name || 'SPACES 360').toUpperCase(), ML, 55);

  sf('normal', 9);
  pdf.setTextColor(NAVY_SOFT[0], NAVY_SOFT[1], NAVY_SOFT[2]);
  pdf.text((companyProfile?.tagline || 'Interior Architecture & Design').toUpperCase(), ML, 65);

  // Divider line
  fc(GOLD);
  pdf.rect(ML, 72, 60, 0.6, 'F');

  // Cover – Quote word
  sf('bold', 13);
  tc(GOLD);
  pdf.text('INTERIOR DESIGN PROPOSAL', ML, 88);

  // Cover – Client block
  sf('normal', 9);
  tc(WHITE);
  pdf.text('Prepared for:', ML, 102);
  sf('bold', 22);
  const clientLines = pdf.splitTextToSize(quotation.clientName || 'Valued Client', PW - ML - 20) as string[];
  clientLines.forEach((line, i) => pdf.text(line, ML, 115 + i * 14));

  if (quotation.projectLocation) {
    sf('normal', 9);
    pdf.setTextColor(160, 180, 220);
    pdf.text(quotation.projectLocation, ML, 115 + clientLines.length * 14 + 4);
  }

  // Cover – Quote number + date block
  const coverInfoY = 185;
  sf('bold', 7.5);
  tc(GOLD);
  pdf.text('QUOTATION NO.', ML, coverInfoY);
  sf('bold', 12);
  tc(WHITE);
  pdf.text(quotation.quoteNumber, ML, coverInfoY + 7);

  const dIssue = new Date(quotation.dateOfIssue).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const dValid = new Date(quotation.validUntil).toLocaleDateString('en-GB',  { day: '2-digit', month: 'long', year: 'numeric' });

  sf('bold', 7.5); tc(GOLD);
  pdf.text('DATE OF ISSUE', ML + 60, coverInfoY);
  sf('normal', 9); tc(WHITE);
  pdf.text(dIssue, ML + 60, coverInfoY + 7);

  sf('bold', 7.5); tc(GOLD);
  pdf.text('VALID UNTIL', ML + 120, coverInfoY);
  sf('normal', 9); tc(WHITE);
  pdf.text(dValid, ML + 120, coverInfoY + 7);

  // Cover – Grand total teaser
  fc([255, 255, 255, 0.08] as any);
  const totalBoxY = 210;
  fc(NAVY_SOFT);
  pdf.setFillColor(40, 65, 120);
  pdf.rect(ML, totalBoxY, CW - 10, 24, 'F');
  sf('bold', 7.5); tc(GOLD);
  pdf.text('TOTAL CONTRACT VALUE', ML + 4, totalBoxY + 7);
  sf('bold', 18); tc(WHITE);
  pdf.text(`Rs. ${fmt(quotation.grandTotal)}`, ML + 4, totalBoxY + 20);
  sf('normal', 7); pdf.setTextColor(160, 180, 220);
  const wordsLine = amountInWords(quotation.grandTotal);
  pdf.text(wordsLine, CW + 4, totalBoxY + 20, { align: 'right' });

  // Cover – project type badge
  if (quotation.projectType) {
    sf('normal', 8); tc(WHITE);
    pdf.text(`Project: ${quotation.projectType}`, ML, 244);
  }
  if (quotation.projectDuration) {
    sf('normal', 8); pdf.setTextColor(160, 180, 220);
    pdf.text(`Duration: ${quotation.projectDuration}`, ML, 252);
  }

  // Cover – notes / executive summary
  if (quotation.notes) {
    sf('italic', 7.5);
    pdf.setTextColor(140, 165, 210);
    const noteLines = pdf.splitTextToSize(quotation.notes, CW - 15) as string[];
    noteLines.slice(0, 4).forEach((line, i) => pdf.text(line, ML, 265 + i * 4.5));
  }

  // Cover – Company contact footer
  sf('normal', 6.5);
  pdf.setTextColor(130, 155, 200);
  const contactParts = [companyProfile?.phone, companyProfile?.email, companyProfile?.website].filter(Boolean).join('  |  ');
  if (contactParts) pdf.text(contactParts, ML, PH - 8);
  if (companyProfile?.gstNo) pdf.text(`GSTIN: ${companyProfile.gstNo}`, RE, PH - 8, { align: 'right' });

  // DRAFT watermark on cover too
  if (quotation.status === 'DRAFT') {
    pdf.saveGraphicsState();
    try {
      pdf.setGState(new (pdf as any).GState({ opacity: 0.12 }));
    } catch (_) { /* GState may not be available in all jsPDF versions */ }
    sf('bold', 80);
    pdf.setTextColor(255, 255, 255);
    pdf.text('DRAFT', PW / 2, PH / 2, { align: 'center', angle: 45 });
    pdf.restoreGraphicsState();
  }

  // ── Start page 2 ────────────────────────────────────────────────────────────
  pdf.addPage();
  pageNum++;

  if (quotation.status === 'DRAFT') drawWatermark('DRAFT', SLATE_400);

  y = 0;

  // ════════════════════════════════════════════════════════════════════════════
  // 1. HEADER BAND
  // ════════════════════════════════════════════════════════════════════════════
  fc(NAVY);
  pdf.rect(0, 0, PW, 48, 'F');

  // Subtle diagonal accent
  fc([20, 40, 80]);
  pdf.rect(PW * 0.55, 0, PW, 48, 'F');

  // Gold accent line
  fc(GOLD);
  pdf.rect(0, 48, PW, 1.2, 'F');

  // Company name
  sf('bold', 20); tc(WHITE);
  pdf.text((companyProfile?.name || 'SPACES 360').toUpperCase(), ML, 20);

  sf('normal', 7.5);
  pdf.setTextColor(NAVY_SOFT[0], NAVY_SOFT[1], NAVY_SOFT[2]);
  pdf.text((companyProfile?.tagline || 'Interior Architecture').toUpperCase(), ML, 28);

  if (companyProfile?.address) {
    sf('normal', 6.5);
    pdf.setTextColor(160, 180, 218);
    pdf.text(companyProfile.address, ML, 35);
  }

  const phone   = companyProfile?.phone   || '';
  const email   = companyProfile?.email   || '';
  const website = companyProfile?.website || '';
  const contact = [phone, email, website].filter(Boolean).join('  •  ');
  if (contact) {
    sf('normal', 6.5); pdf.setTextColor(160, 180, 218);
    pdf.text(contact, ML, 42);
  }

  // Right column – quote meta
  sf('bold', 14); tc(WHITE);
  pdf.text('QUOTATION', RE, 13, { align: 'right' });

  sf('normal', 8.5); pdf.setTextColor(200, 218, 248);
  pdf.text(quotation.quoteNumber, RE, 22, { align: 'right' });

  sf('normal', 7); pdf.setTextColor(160, 180, 218);
  const dIssue2 = new Date(quotation.dateOfIssue).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const dValid2 = new Date(quotation.validUntil).toLocaleDateString('en-GB',  { day: '2-digit', month: 'short', year: 'numeric' });
  pdf.text(`Dated:  ${dIssue2}`, RE, 30, { align: 'right' });
  pdf.text(`Valid:   ${dValid2}`, RE, 37, { align: 'right' });
  if (quotation.projectDuration) {
    pdf.text(`Duration: ${quotation.projectDuration}`, RE, 44, { align: 'right' });
  }

  y = 56;

  // ════════════════════════════════════════════════════════════════════════════
  // 2. CLIENT + COMPANY INFO ROW
  // ════════════════════════════════════════════════════════════════════════════
  const clientBoxW = Math.floor(CW * 0.57);
  const compBoxW   = CW - clientBoxW - 3;
  const BOX_H      = quotation.clientPhone || quotation.clientEmail ? 34 : 30;

  // Client box
  fc(SLATE_50); dc(SLATE_200); lw(0.3);
  pdf.rect(ML, y, clientBoxW, BOX_H, 'FD');

  sf('bold', 5.5); tc(SLATE_400);
  pdf.text('PREPARED FOR', ML + 4, y + 5.5);

  sf('bold', 12); tc(SLATE_900);
  const clientName = quotation.clientName || 'Valued Client';
  const maxNameW = clientBoxW - 8;
  const nameTrimmed = pdf.splitTextToSize(clientName, maxNameW)[0] as string;
  pdf.text(nameTrimmed, ML + 4, y + 14);

  sf('normal', 7.5); tc(SLATE_500);
  let clientY = y + 20;
  if (quotation.projectLocation) {
    const loc = pdf.splitTextToSize(quotation.projectLocation, clientBoxW - 8)[0] as string;
    pdf.text(loc, ML + 4, clientY);
    clientY += 5;
  }
  if (quotation.clientPhone) {
    sf('normal', 6.5); tc(SLATE_400);
    pdf.text(`☎  ${quotation.clientPhone}`, ML + 4, clientY);
    clientY += 4.5;
  }
  if (quotation.clientEmail) {
    sf('normal', 6.5); tc(SLATE_400);
    pdf.text(`✉  ${quotation.clientEmail}`, ML + 4, clientY);
  }
  sf('bold', 7.5); tc(NAVY);
  if (quotation.projectType) pdf.text(quotation.projectType, ML + 4, y + BOX_H - 4);

  // Company info box
  const cBX = ML + clientBoxW + 3;
  fc(NAVY); pdf.rect(cBX, y, compBoxW, BOX_H, 'F');

  sf('bold', 7.5); tc(WHITE);
  pdf.text(companyProfile?.name || 'SPACES 360', cBX + 4, y + 8);

  sf('normal', 6.5); pdf.setTextColor(200, 218, 248);
  const details = [
    companyProfile?.phone,
    companyProfile?.email,
    companyProfile?.website,
    companyProfile?.gstNo ? `GSTIN: ${companyProfile.gstNo}` : null,
  ].filter(Boolean) as string[];
  details.forEach((d, i) => pdf.text(d, cBX + 4, y + 15 + i * 4.8));

  // Status badge
  const statusColors: Record<string, RGB> = {
    APPROVED: EMERALD, REJECTED: RED, SENT: [37, 99, 235], DRAFT: SLATE_400,
  };
  const sBadgeColor = statusColors[quotation.status] || SLATE_400;
  dc(sBadgeColor); fc([...sBadgeColor] as RGB); lw(0.5);
  fc(WHITE); pdf.rect(cBX + compBoxW - 28, y + BOX_H - 10, 26, 7, 'F');
  dc(sBadgeColor); pdf.rect(cBX + compBoxW - 28, y + BOX_H - 10, 26, 7, 'S');
  sf('bold', 5.5); tc(sBadgeColor);
  pdf.text(quotation.status, cBX + compBoxW - 15, y + BOX_H - 5, { align: 'center' });

  y += BOX_H + 6;

  // ════════════════════════════════════════════════════════════════════════════
  // 2b. EXECUTIVE NOTES (if any)
  // ════════════════════════════════════════════════════════════════════════════
  if (quotation.notes) {
    guard(20);
    fc(LIGHT_BLUE); dc(SLATE_200); lw(0.25);
    const noteLines = pdf.splitTextToSize(quotation.notes, CW - 10) as string[];
    const noteH = noteLines.length * 4.2 + 8;
    pdf.rect(ML, y, CW, noteH, 'FD');
    sf('bold', 6); tc(NAVY);
    pdf.text('PROJECT OVERVIEW', ML + 4, y + 5);
    sf('italic', 7); tc(SLATE_700);
    noteLines.forEach((line, i) => pdf.text(line, ML + 4, y + 10 + i * 4.2));
    y += noteH + 6;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 3. ITEMS TABLE
  // ════════════════════════════════════════════════════════════════════════════
  sf('bold', 7.5); tc(SLATE_500);
  pdf.text('DETAILED ESTIMATE', ML, y - 2);

  insideTable = true;
  drawTableHeader();

  // Group items by category
  const grouped: Record<string, typeof quotation.items> = {};
  (quotation.items || []).forEach(item => {
    const cat = item.category || 'General';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  let rowCount = 0;

  Object.entries(grouped).forEach(([category, items], catIdx) => {
    guard(12);

    // Category header
    fc(SLATE_100); dc(SLATE_200); lw(0.1);
    pdf.rect(ML, y, CW, 6, 'FD');
    sf('bold', 7.5); tc(NAVY);
    pdf.text(`  ${catIdx + 1}.  ${category.toUpperCase()}`, ML + 3, y + 4.5);

    const secTotal = items.reduce((s, i) => s + (i.amount || 0), 0);
    sf('normal', 6); tc(SLATE_500);
    pdf.text(`Sub: Rs. ${fmtN(secTotal)}`, RE - 1, y + 4.5, { align: 'right' });
    y += 6;

    items.forEach((item, idx) => {
      const descLines = pdf.splitTextToSize(item.description || '', COL_W.desc - 2) as string[];
      const hasImage = !!item.image;
      const imageH = hasImage ? 18 : 0;
      const rowH = Math.max(8, Math.max(descLines.length * 4.3 + 3.5, imageH + 4));

      guard(rowH + 1);

      // Row background (zebra)
      if (rowCount % 2 === 1) {
        fc(SLATE_50); pdf.rect(ML, y, CW, rowH, 'F');
      }

      // Bottom divider
      dc(SLATE_200); lw(0.1);
      pdf.line(ML, y + rowH, RE, y + rowH);

      const ry = y + 5; // text baseline

      // #
      sf('normal', 6.5); tc(SLATE_400);
      pdf.text(`${catIdx + 1}.${idx + 1}`, TC.num + 2, ry);

      // Item image (thumbnail, left of description)
      if (hasImage) {
        try {
          pdf.addImage(item.image!, 'JPEG', TC.desc + 1, y + 1, 14, imageH - 2);
        } catch (_) { /* ignore invalid image data */ }
      }
      const descX = hasImage ? TC.desc + 17 : TC.desc + 1;
      const descW = hasImage ? COL_W.desc - 17 : COL_W.desc - 2;
      const descLinesClamped = pdf.splitTextToSize(item.description || '', descW) as string[];

      // Description
      sf('bold', 7.5); tc(SLATE_900);
      descLinesClamped.forEach((line, li) => pdf.text(line, descX, ry + li * 4.3));

      // Item notes (small)
      if (item.notes) {
        const noteLine = pdf.splitTextToSize(item.notes, descW) as string[];
        sf('italic', 6); tc(SLATE_400);
        noteLine.slice(0, 1).forEach((line) => pdf.text(line, descX, ry + descLinesClamped.length * 4.3 + 1));
      }

      // Dimensions
      sf('normal', 7); tc(SLATE_600);
      pdf.text(item.dimensions || '-', TC.dim + 1, ry);

      // Sqft
      const sqftTxt = item.sqft > 0 ? item.sqft.toString() : '-';
      pdf.text(sqftTxt, TC.sqft + COL_W.sqft - 1, ry, { align: 'right' });

      // Rate
      const rateTxt = item.rate > 0 ? item.rate.toLocaleString('en-IN') : '-';
      pdf.text(rateTxt, TC.rate + COL_W.rate - 1, ry, { align: 'right' });

      // Amount
      sf('bold', 7.5); tc(NAVY);
      pdf.text(Rs(item.amount), RE - 1, ry, { align: 'right' });

      y += rowH;
      rowCount++;
    });
  });

  insideTable = false;
  y += 6;

  // ════════════════════════════════════════════════════════════════════════════
  // 4. SUPPLEMENTARY / OPTIONAL ITEMS
  // ════════════════════════════════════════════════════════════════════════════
  if (quotation.requestedItems && quotation.requestedItems.length > 0) {
    guard(20);
    secTitle('SUPPLEMENTARY / OPTIONAL WORKS');

    // Dashed border table
    dc(SLATE_300); lw(0.25);
    pdf.setLineDashPattern([2, 1.5], 0);

    quotation.requestedItems.forEach((item, idx) => {
      const descLines = pdf.splitTextToSize(item.description || '', 110) as string[];
      const rowH = Math.max(8, descLines.length * 4.3 + 3.5);
      guard(rowH);

      if (idx % 2 === 0) { fc(SLATE_50); pdf.rect(ML, y, CW, rowH, 'F'); }
      dc(SLATE_200); lw(0.1); pdf.setLineDashPattern([], 0);
      pdf.line(ML, y + rowH, RE, y + rowH);
      pdf.setLineDashPattern([2, 1.5], 0);

      sf('bold', 7); tc(NAVY);
      pdf.text(`${idx + 1}`, ML + 3, y + 5);
      sf('bold', 7); tc(SLATE_600);
      pdf.text(item.category || 'General', ML + 10, y + 5);
      sf('normal', 7); tc(SLATE_700);
      descLines.forEach((line, li) => pdf.text(line, ML + 46, y + 5 + li * 4.3));
      sf('bold', 7.5); tc(NAVY);
      const amtTxt = (item.amount > 0) ? Rs(item.amount) : 'Rate TBD';
      pdf.text(amtTxt, RE - 1, y + 5, { align: 'right' });
      y += rowH;
    });
    pdf.setLineDashPattern([], 0);
    y += 6;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 5. PAYMENT SCHEDULE
  // ════════════════════════════════════════════════════════════════════════════
  if (quotation.paymentSchedule && quotation.paymentSchedule.length > 0) {
    guard(20 + quotation.paymentSchedule.length * 7);
    secTitle('PAYMENT SCHEDULE');
    quotation.paymentSchedule.forEach((p, i) => {
      guard(8);
      if (i % 2 === 0) { fc(SLATE_50); pdf.rect(ML, y, CW, 7, 'F'); }
      dc(SLATE_200); lw(0.1); pdf.line(ML, y + 7, RE, y + 7);
      sf('normal', 7.5); tc(SLATE_700);
      pdf.text(p.milestone, ML + 3, y + 5);
      pdf.text(`${p.percentage}%`, ML + 120, y + 5, { align: 'center' });
      sf('bold', 7.5); tc(NAVY);
      pdf.text(Rs(p.amount), RE - 1, y + 5, { align: 'right' });
      y += 7;
    });
    y += 5;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 6. MATERIAL SPECIFICATIONS
  // ════════════════════════════════════════════════════════════════════════════
  if (quotation.specifications && quotation.specifications.length > 0) {
    guard(20);
    secTitle('MATERIAL SPECIFICATIONS');
    quotation.specifications.forEach(spec => {
      const lines = pdf.splitTextToSize('• ' + spec, CW - 6) as string[];
      guard(lines.length * 4 + 2);
      sf('normal', 7); tc(SLATE_700);
      lines.forEach((line, i) => pdf.text(line, ML + 2, y + i * 4));
      y += lines.length * 4 + 1.5;
    });
    y += 5;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 7. TERMS & CONDITIONS
  // ════════════════════════════════════════════════════════════════════════════
  if (quotation.terms && quotation.terms.length > 0) {
    guard(20);
    secTitle('TERMS & CONDITIONS');
    quotation.terms.forEach((term, idx) => {
      const lines = pdf.splitTextToSize(`${idx + 1}. ${term}`, CW - 6) as string[];
      guard(lines.length * 4 + 2);
      sf('normal', 7); tc(SLATE_700);
      lines.forEach((line, i) => pdf.text(line, ML + 2, y + i * 4));
      y += lines.length * 4 + 1.5;
    });
    y += 5;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 8. FINANCIAL SUMMARY BOX
  // ════════════════════════════════════════════════════════════════════════════
  guard(70);
  rule(SLATE_200, 0.4);

  const FIN_W = 84;
  const FIN_X = RE - FIN_W;
  let fy = y;

  const finRow = (
    label: string,
    value: string,
    opts?: { bold?: boolean; color?: RGB; size?: number }
  ) => {
    const sz = opts?.size ?? 7.5;
    pdf.setFontSize(sz);
    pdf.setFont('helvetica', opts?.bold ? 'bold' : 'normal');
    tc(SLATE_500); pdf.text(label, FIN_X, fy);
    tc(opts?.color ?? SLATE_700); pdf.text(value, RE - 1, fy, { align: 'right' });
    fy += sz < 9 ? 5.5 : 7;
  };

  finRow('Subtotal', Rs(quotation.subtotal));
  if (quotation.discount > 0)
    finRow(`Discount`, `- Rs. ${fmt(quotation.discount)}`, { color: RED });
  if (quotation.isGstEnabled)
    finRow(`GST (${quotation.gstPercentage || 18}%)`, Rs(quotation.gst));

  fy += 2;
  // Grand total highlight box
  fc(LIGHT_BLUE); dc(NAVY); lw(0.5);
  pdf.rect(FIN_X - 3, fy - 2, FIN_W + 4, 14, 'FD');
  sf('bold', 9); tc(NAVY);
  pdf.text('GRAND TOTAL', FIN_X + 1, fy + 7.5);
  sf('bold', 13);
  pdf.text(`Rs. ${fmt(quotation.grandTotal)}`, RE - 1, fy + 8.5, { align: 'right' });
  fy += 17;

  // Amount in words
  sf('italic', 6.5); tc(SLATE_500);
  const words = amountInWords(quotation.grandTotal);
  pdf.text(`( ${words} )`, FIN_X, fy);
  fy += 6;

  y = Math.max(y + 42, fy + 4);

  // ════════════════════════════════════════════════════════════════════════════
  // 9. BANK DETAILS + AUTHORIZED SIGNATURE
  // ════════════════════════════════════════════════════════════════════════════
  guard(50);
  rule(SLATE_300, 0.3);

  const BANK_W = CW * 0.52;
  const SIG_X  = ML + BANK_W + 5;
  const SIG_W  = CW - BANK_W - 5;

  // Section labels
  sf('bold', 7.5); tc(NAVY);
  pdf.text('BANK DETAILS', ML, y);
  pdf.text('AUTHORIZED SIGNATORY', SIG_X, y);
  y += 5;

  const bankStartY = y;

  const bkRows: [string, string][] = [
    ['Account Name', quotation.bankDetails?.accountName || ''],
    ['Bank',         quotation.bankDetails?.bankName     || ''],
    ['Account No.',  quotation.bankDetails?.accountNumber || ''],
    ['IFSC Code',    quotation.bankDetails?.ifscCode      || ''],
    ['Branch',       quotation.bankDetails?.branch        || ''],
  ];
  if (quotation.bankDetails?.upiId)
    bkRows.push(['UPI ID', quotation.bankDetails.upiId]);

  bkRows.forEach(([label, value]) => {
    sf('bold', 6); tc(SLATE_400);
    pdf.text(label, ML, y);
    sf('normal', 7); tc(SLATE_900);
    const vLines = pdf.splitTextToSize(value, BANK_W - 30) as string[];
    vLines.forEach((vl, vli) => pdf.text(vl, ML + 28, y + vli * 3.8));
    y += Math.max(5, vLines.length * 3.8 + 1.5);
  });

  // Signature block (right side, aligned with bank start)
  let sigY = bankStartY;

  // Try to embed company signature image
  if (companyProfile?.signature) {
    try {
      pdf.addImage(companyProfile.signature, 'PNG', SIG_X, sigY, SIG_W - 4, 20);
      sigY += 22;
    } catch (_) {
      sf('italic', 17); tc(NAVY);
      pdf.text(companyProfile?.name || 'Spaces 360', SIG_X, sigY + 14);
      sigY += 20;
    }
  } else {
    sf('italic', 17); tc(NAVY);
    pdf.text(companyProfile?.name || 'Spaces 360', SIG_X, sigY + 14);
    sigY += 20;
  }

  dc(SLATE_900); lw(0.4);
  pdf.line(SIG_X, sigY, SIG_X + SIG_W - 2, sigY);
  sigY += 4;
  sf('bold', 6); tc(SLATE_500);
  pdf.text('STAMP & SIGNATURE', SIG_X, sigY);

  y = Math.max(y, sigY) + 10;

  // ════════════════════════════════════════════════════════════════════════════
  // 10. CLIENT ACCEPTANCE
  // ════════════════════════════════════════════════════════════════════════════
  guard(28);

  // Dashed divider
  dc(SLATE_300); lw(0.2);
  pdf.setLineDashPattern([2, 1.5], 0);
  pdf.line(ML, y, RE, y);
  pdf.setLineDashPattern([], 0);
  y += 5;

  sf('bold', 7); tc(SLATE_500);
  pdf.text('CLIENT ACCEPTANCE', ML, y);
  y += 4;
  sf('normal', 6.5); tc(SLATE_500);
  pdf.text(
    'I/We hereby accept the proposal, specifications, and terms mentioned in this document.',
    ML, y
  );
  y += 7;

  if (quotation.status === 'APPROVED') {
    sf('italic', 17); tc(EMERALD);
    pdf.text(quotation.clientName || 'Accepted', ML, y + 10);
    y += 15;
    sf('bold', 7); tc(EMERALD);
    pdf.text('ACCEPTED  ✓', ML, y);
  } else {
    dc(SLATE_900); lw(0.4);
    pdf.line(ML, y + 9, ML + 60, y + 9);
    pdf.line(ML + 75, y + 9, ML + 140, y + 9);
    y += 14;
    sf('bold', 6); tc(SLATE_500);
    pdf.text('CLIENT SIGNATURE & DATE', ML, y);
    pdf.text('DATE', ML + 75, y);
  }

  // Final footer
  drawFooter();

  // ── Save ─────────────────────────────────────────────────────────────────────
  const safe = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_');
  pdf.save(`${quotation.quoteNumber}_${safe(quotation.clientName || 'Quote')}.pdf`);
}
