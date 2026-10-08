import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PurchaseOrder, DnRecord, ActivityLog, PoLineItem } from '../types';
import { PoFormValues } from '../components/PoFormModal';
import { DnFormValues } from '../components/DnFormModal';

export const PO_HEADERS = [
  'PO Number',
  'Order Date',
  'PO Expiry Date',
  'Warehouse Name',
  'Item ID',
  'Item Name',
  'All PO Line Items (SKU | Name | Qty)',
  'Total Qty',
  'Invoice No.',
  'Ship Date',
  'Appointment ID',
  'Appointment Date',
  'SO',
  'Status',
  'No. of Boxes',
  'Box Dimensions',
  'Logistics Portal',
  'Pickup Tracking ID',
  'PUC',
  'ASN',
  'Clear Bag No.',
  'Comment',
  'Pickup Status',
  'Print Verified',
  'Workflow Stage',
  'Inward Status',
  'GRN Number',
  'GRN DN Summary',
  'Created By (Name & ID)',
  'Last Updated By (Name & ID)',
];

export const DN_HEADERS = [
  'DN Date',
  'DN Number',
  'Facility Name',
  'Parent PO Details',
  'DN SKU ID | Item Name',
  'DN QTY',
  'WH POC Name / Contact Details',
  'LR No',
  'Uploaded DN Report File',
  'Created By (Name & ID)',
  'Last Updated By (Name & ID)',
];

export function formatLineItemsSummary(po: PurchaseOrder): string {
  if (Array.isArray(po.lineItems) && po.lineItems.length > 0) {
    return po.lineItems
      .map((li) => `${li.itemId} | ${li.itemName} (Qty: ${li.qty})`)
      .join(' ; ');
  }
  return `${po.itemId} | ${po.itemName} (Qty: ${po.totalQty})`;
}

export function formatPoToRow(po: PurchaseOrder): (string | number)[] {
  return [
    po.poNumber,
    po.orderDate,
    po.poExpiryDate || '',
    po.warehouseName,
    po.itemId,
    po.itemName,
    formatLineItemsSummary(po),
    po.totalQty,
    po.invoiceNo,
    po.shipDate,
    po.appointmentId,
    po.appointmentDate,
    po.so,
    po.status,
    po.noOfBoxes,
    po.boxDimensions,
    po.logisticsPortal,
    po.pickupTrackingId,
    po.puc,
    po.asn,
    po.clearBagNo,
    po.comment,
    po.pickupStatus,
    po.printVerified || 'NO',
    po.workflowStage,
    po.inwardStatus,
    po.grnNumber,
    po.grnDnSummary,
    `${po.createdByName} (${po.createdByEmpId})`,
    `${po.updatedByName} (${po.updatedByEmpId})`,
  ];
}

export function formatDnToRow(dn: DnRecord): (string | number)[] {
  return [
    dn.dnDate,
    dn.dnNumber,
    dn.facilityName,
    dn.parentPoDetails,
    dn.dnSkuIdItemName,
    dn.dnQty,
    dn.whPocDetails,
    dn.lrNo,
    dn.reportFileName || 'No File Attached',
    `${dn.createdByName} (${dn.createdByEmpId})`,
    `${dn.updatedByName} (${dn.updatedByEmpId})`,
  ];
}

// Export entire Master Excel Workbook (.xlsx)
export function exportMasterWorkbookToExcel(
  purchaseOrders: PurchaseOrder[],
  dnRecords: DnRecord[],
  activityLogs: ActivityLog[]
) {
  const workbook = XLSX.utils.book_new();

  const makePoSheet = (list: PurchaseOrder[]) => {
    if (list.length === 0) {
      const emptyObj: Record<string, string> = {};
      PO_HEADERS.forEach((h) => {
        emptyObj[h] = '';
      });
      return XLSX.utils.json_to_sheet([emptyObj]);
    }
    const rows = list.map((po) => {
      const arr = formatPoToRow(po);
      const obj: Record<string, string | number> = {};
      PO_HEADERS.forEach((h, i) => {
        obj[h] = arr[i];
      });
      return obj;
    });
    return XLSX.utils.json_to_sheet(rows);
  };

  const makeDnSheet = (list: DnRecord[]) => {
    if (list.length === 0) {
      const emptyObj: Record<string, string> = {};
      DN_HEADERS.forEach((h) => {
        emptyObj[h] = '';
      });
      return XLSX.utils.json_to_sheet([emptyObj]);
    }
    const rows = list.map((dn) => {
      const arr = formatDnToRow(dn);
      const obj: Record<string, string | number> = {};
      DN_HEADERS.forEach((h, i) => {
        obj[h] = arr[i];
      });
      return obj;
    });
    return XLSX.utils.json_to_sheet(rows);
  };

  XLSX.utils.book_append_sheet(
    workbook,
    makePoSheet(purchaseOrders.filter((p) => p.workflowStage === 'PO_ENTRY')),
    'PO Entry'
  );
  XLSX.utils.book_append_sheet(
    workbook,
    makePoSheet(purchaseOrders),
    'Logistics Hub'
  );
  XLSX.utils.book_append_sheet(
    workbook,
    makePoSheet(purchaseOrders),
    'Print Verification'
  );
  XLSX.utils.book_append_sheet(
    workbook,
    makePoSheet(purchaseOrders.filter((p) => p.workflowStage === 'IN_TRANSIT')),
    'In Transit'
  );
  XLSX.utils.book_append_sheet(
    workbook,
    makePoSheet(purchaseOrders.filter((p) => p.workflowStage === 'GRN')),
    'GRN'
  );
  XLSX.utils.book_append_sheet(
    workbook,
    makeDnSheet(dnRecords),
    'Instamart DN Tracker'
  );

  const auditRows = activityLogs.map((l) => ({
    'Employee Name': l.employeeName,
    'Employee ID': l.employeeId,
    'Team Role': l.employeeRole.toUpperCase(),
    'Action': l.action,
    'Module': l.module,
    'Reference (PO / DN)': l.referenceNo,
    'Details': l.details,
  }));
  if (auditRows.length > 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(auditRows),
      'Employee Audit Log'
    );
  }

  XLSX.writeFile(
    workbook,
    `Instamart_Master_Workbook_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

// Parse uploaded Excel (.xlsx / .xls / .csv) file for bulk PO Entry / Update (groups multiple rows with same PO Number into multi-item POs)
export async function parseExcelForPoEntries(file: File): Promise<PoFormValues[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
    defval: '',
  });

  const groupedByPo = new Map<string, PoFormValues>();

  for (const row of rawRows) {
    const poNumber = String(
      row['PO Number'] ?? row['poNumber'] ?? row['PO_Number'] ?? row['PO'] ?? ''
    ).trim();
    if (!poNumber) continue;

    const key = poNumber.toUpperCase();
    const itemId = String(
      row['Item ID'] ?? row['itemId'] ?? row['SKU'] ?? 'SKU-001'
    ).trim();
    const itemName = String(
      row['Item Name'] ?? row['itemName'] ?? row['Item'] ?? 'Instamart Item'
    ).trim();
    const rowQty = Number(row['Total Qty'] ?? row['totalQty'] ?? row['Qty'] ?? 1) || 1;

    const pickupRaw = String(
      row['Pickup Status'] ?? row['pickupStatus'] ?? row['Pickup'] ?? 'NO'
    )
      .trim()
      .toUpperCase();

    const existing = groupedByPo.get(key);
    if (existing) {
      const nextLines: PoLineItem[] = [
        ...existing.lineItems,
        { itemId, itemName, qty: rowQty },
      ];
      const sumQty = nextLines.reduce((acc, l) => acc + (Number(l.qty) || 0), 0);
      existing.lineItems = nextLines;
      existing.totalQty = sumQty;
      existing.itemId = `${nextLines[0].itemId} (+${nextLines.length - 1} more)`.slice(0, 60);
      existing.itemName = nextLines
        .map((l) => `${l.itemName} (${l.qty})`)
        .join(', ')
        .slice(0, 200);
    } else {
      groupedByPo.set(key, {
        poNumber,
        orderDate: String(
          row['Order Date'] ?? row['orderDate'] ?? new Date().toISOString().slice(0, 10)
        ).trim(),
        poExpiryDate: String(
          row['PO Expiry Date'] ?? row['poExpiryDate'] ?? row['Expiry Date'] ?? ''
        ).trim(),
        warehouseName: String(
          row['Warehouse Name'] ?? row['warehouseName'] ?? row['Warehouse'] ?? 'General Hub'
        ).trim(),
        itemId,
        itemName,
        totalQty: rowQty,
        lineItems: [{ itemId, itemName, qty: rowQty }],
        invoiceNo: String(row['Invoice No.'] ?? row['invoiceNo'] ?? row['Invoice'] ?? '').trim(),
        shipDate: String(row['Ship Date'] ?? row['shipDate'] ?? '').trim(),
        appointmentId: String(
          row['Appointment ID'] ?? row['appointmentId'] ?? ''
        ).trim(),
        appointmentDate: String(
          row['Appointment Date'] ?? row['appointmentDate'] ?? ''
        ).trim(),
        so: String(row['SO'] ?? row['so'] ?? '').trim(),
        status: String(row['Status'] ?? row['status'] ?? 'Scheduled').trim(),
        noOfBoxes: Number(row['No. of Boxes'] ?? row['noOfBoxes'] ?? row['Boxes'] ?? 0) || 0,
        boxDimensions: String(
          row['Box Dimensions'] ?? row['boxDimensions'] ?? ''
        ).trim(),
        logisticsPortal: String(
          row['Logistics Portal'] ?? row['logisticsPortal'] ?? ''
        ).trim(),
        pickupTrackingId: String(
          row['Pickup Tracking ID'] ?? row['pickupTrackingId'] ?? ''
        ).trim(),
        puc: String(row['PUC'] ?? row['puc'] ?? '').trim(),
        asn: String(row['ASN'] ?? row['asn'] ?? '').trim(),
        clearBagNo: String(row['Clear Bag No.'] ?? row['clearBagNo'] ?? '').trim(),
        comment: String(row['Comment'] ?? row['comment'] ?? '').trim(),
        pickupStatus: pickupRaw === 'YES' ? 'YES' : 'NO',
      });
    }
  }
  return Array.from(groupedByPo.values());
}

// Parse uploaded Excel (.xlsx / .xls / .csv) file for bulk DN Tracker Entry / Update
export async function parseExcelForDnEntries(file: File): Promise<DnFormValues[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName =
    workbook.SheetNames.find((n) => n.toLowerCase().includes('dn')) ||
    workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
    defval: '',
  });

  const parsed: DnFormValues[] = [];
  for (const row of rawRows) {
    const dnNumber = String(
      row['DN Number'] ?? row['dnNumber'] ?? row['DN_Number'] ?? row['DN'] ?? ''
    ).trim();
    if (!dnNumber) continue;

    parsed.push({
      dnDate: String(
        row['DN Date'] ?? row['dnDate'] ?? new Date().toISOString().slice(0, 10)
      ).trim(),
      dnNumber,
      facilityName: String(
        row['Facility Name'] ?? row['facilityName'] ?? row['Warehouse'] ?? 'General Facility'
      ).trim(),
      parentPoDetails: String(
        row['Parent PO Details'] ?? row['parentPoDetails'] ?? row['PO Number'] ?? 'N/A'
      ).trim(),
      dnSkuIdItemName: String(
        row['DN SKU ID | Item Name'] ?? row['dnSkuIdItemName'] ?? row['Item Name'] ?? 'Item'
      ).trim(),
      dnQty: Number(row['DN QTY'] ?? row['dnQty'] ?? row['Qty'] ?? 0) || 0,
      whPocDetails: String(
        row['WH POC Name / Contact Details'] ?? row['whPocDetails'] ?? ''
      ).trim(),
      lrNo: String(row['LR No'] ?? row['lrNo'] ?? '').trim(),
      reportFileName: file.name,
      reportFileType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      reportFileSize: file.size,
      reportFileDataUrl: '',
    });
  }
  return parsed;
}

export function exportPoListToExcel(pos: PurchaseOrder[], tabName: string) {
  const rows = pos.map((po) => {
    const arr = formatPoToRow(po);
    const obj: Record<string, string | number> = {};
    PO_HEADERS.forEach((h, i) => {
      obj[h] = arr[i];
    });
    return obj;
  });

  if (rows.length === 0) {
    const emptyObj: Record<string, string> = {};
    PO_HEADERS.forEach((h) => {
      emptyObj[h] = '';
    });
    rows.push(emptyObj);
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, tabName.slice(0, 31));
  XLSX.writeFile(
    workbook,
    `Instamart_${tabName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

export function exportSinglePoToExcel(po: PurchaseOrder) {
  const lines =
    Array.isArray(po.lineItems) && po.lineItems.length > 0
      ? po.lineItems
      : [{ itemId: po.itemId, itemName: po.itemName, qty: po.totalQty }];

  const rows = lines.map((li, idx) => ({
    'PO Number': po.poNumber,
    'Order Date': po.orderDate,
    'PO Expiry Date': po.poExpiryDate || '-',
    'Warehouse Name': po.warehouseName,
    'Line #': idx + 1,
    'Item ID': li.itemId,
    'Item Name': li.itemName,
    'Line Qty': li.qty,
    'Total PO Qty': po.totalQty,
    'Invoice No.': po.invoiceNo,
    'Ship Date': po.shipDate,
    'Appointment ID': po.appointmentId,
    'Appointment Date': po.appointmentDate,
    'SO': po.so,
    'Status': po.status,
    'No. of Boxes': po.noOfBoxes,
    'Box Dimensions': po.boxDimensions,
    'Logistics Partner': po.logisticsPortal,
    'Pickup Tracking ID': po.pickupTrackingId,
    'PUC': po.puc,
    'ASN': po.asn,
    'Clear Bag No.': po.clearBagNo,
    'Print Verified': po.printVerified || 'NO',
    'Verified By': po.printVerifiedBy || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, po.poNumber.slice(0, 31));
  XLSX.writeFile(workbook, `Instamart_PO_${po.poNumber}_PrintSheet.xlsx`);
}

export function exportSinglePoToPdf(po: PurchaseOrder) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  doc.setFontSize(15);
  doc.text(`Instamart Purchase Order & Print Verification Slip`, 40, 40);
  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(
    `PO Number: ${po.poNumber}   |   Order Date: ${po.orderDate}   |   Expiry Date: ${
      po.poExpiryDate || 'N/A'
    }`,
    40,
    60
  );
  doc.text(
    `Warehouse: ${po.warehouseName}   |   Print Verified: ${
      po.printVerified || 'NO'
    } (${po.printVerifiedBy || 'Pending'})`,
    40,
    76
  );

  const metaBody = [
    ['Invoice No.', po.invoiceNo || '-', 'Ship Date', po.shipDate || '-'],
    ['Appointment ID', po.appointmentId || '-', 'Appointment Date', po.appointmentDate || '-'],
    ['Sales Order (SO)', po.so || '-', 'Status / Stage', `${po.status} (${po.workflowStage})`],
    ['No. of Boxes', String(po.noOfBoxes), 'Box Dimensions', po.boxDimensions || '-'],
    ['Logistics Partner', po.logisticsPortal || '-', 'Pickup Tracking ID', po.pickupTrackingId || '-'],
    ['PUC / ASN', `${po.puc || '-'} / ${po.asn || '-'}`, 'Clear Bag No.', po.clearBagNo || '-'],
  ];

  autoTable(doc, {
    startY: 92,
    head: [['Field', 'Value', 'Field', 'Value']],
    body: metaBody,
    styles: { fontSize: 8.5, cellPadding: 5 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
  });

  const lines =
    Array.isArray(po.lineItems) && po.lineItems.length > 0
      ? po.lineItems
      : [{ itemId: po.itemId, itemName: po.itemName, qty: po.totalQty }];

  const finalY = (doc as any).lastAutoTable?.finalY || 240;
  doc.setFontSize(11);
  doc.setTextColor(20);
  doc.text(
    `PO Line Items (${lines.length} Items · Total Qty: ${po.totalQty})`,
    40,
    finalY + 24
  );

  autoTable(doc, {
    startY: finalY + 34,
    head: [['#', 'Item ID (SKU)', 'Product Item Name', 'Qty']],
    body: lines.map((li, i) => [
      String(i + 1),
      li.itemId,
      li.itemName,
      String(li.qty),
    ]),
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [234, 88, 12], textColor: 255 },
  });

  doc.save(`Instamart_PO_${po.poNumber}_Document.pdf`);
}

export function exportPoListToCsv(pos: PurchaseOrder[], tabName: string) {
  const rows = pos.map((po) => {
    const arr = formatPoToRow(po);
    const obj: Record<string, string | number> = {};
    PO_HEADERS.forEach((h, i) => {
      obj[h] = arr[i];
    });
    return obj;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Instamart_${tabName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPoListToPdf(pos: PurchaseOrder[], tabTitle: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text(`Instamart Operations — ${tabTitle}`, 40, 36);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    `Generated on ${new Date().toLocaleString()} · Total Records: ${pos.length}`,
    40,
    52
  );

  const head = [
    [
      'PO Number',
      'Order / Expiry',
      'Warehouse',
      'Items (SKU & Name)',
      'Total Qty',
      'Invoice / Ship',
      'Appt ID / Date',
      'Boxes / Dim',
      'Logistics / Tracking',
      'PUC / ASN / Bag',
      'Print Verified',
      'Pickup / Stage',
      'Updated By',
    ],
  ];

  const body = pos.map((po) => [
    po.poNumber,
    `Ord: ${po.orderDate}\nExp: ${po.poExpiryDate || '-'}`,
    po.warehouseName,
    formatLineItemsSummary(po),
    String(po.totalQty),
    `${po.invoiceNo || '-'}\n${po.shipDate || '-'}`,
    `${po.appointmentId || '-'}\n${po.appointmentDate || ''}`,
    `${po.noOfBoxes} (${po.boxDimensions || '-'})`,
    `${po.logisticsPortal || '-'}\n${po.pickupTrackingId || '-'}`,
    `PUC:${po.puc || '-'} ASN:${po.asn || '-'}\nBag:${po.clearBagNo || '-'}`,
    po.printVerified || 'NO',
    `${po.pickupStatus} / ${po.workflowStage}`,
    `${po.updatedByName}\n(${po.updatedByEmpId})`,
  ]);

  autoTable(doc, {
    startY: 64,
    head,
    body,
    styles: { fontSize: 7, cellPadding: 4 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
  });

  doc.save(
    `Instamart_${tabTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`
  );
}

export function exportDnListToExcel(dns: DnRecord[]) {
  const rows = dns.map((dn) => {
    const arr = formatDnToRow(dn);
    const obj: Record<string, string | number> = {};
    DN_HEADERS.forEach((h, i) => {
      obj[h] = arr[i];
    });
    return obj;
  });

  if (rows.length === 0) {
    const emptyObj: Record<string, string> = {};
    DN_HEADERS.forEach((h) => {
      emptyObj[h] = '';
    });
    rows.push(emptyObj);
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Instamart DN Tracker');
  XLSX.writeFile(
    workbook,
    `Instamart_DN_Tracker_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

export function exportDnListToCsv(dns: DnRecord[]) {
  const rows = dns.map((dn) => {
    const arr = formatDnToRow(dn);
    const obj: Record<string, string | number> = {};
    DN_HEADERS.forEach((h, i) => {
      obj[h] = arr[i];
    });
    return obj;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Instamart_DN_Tracker_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportDnListToPdf(dns: DnRecord[]) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text('Instamart DN Tracker Report', 40, 36);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    `Generated on ${new Date().toLocaleString()} · Total DN Records: ${dns.length}`,
    40,
    52
  );

  const head = [
    [
      'DN Date',
      'DN Number',
      'Facility Name',
      'Parent PO Details',
      'DN SKU ID | Item Name',
      'DN QTY',
      'WH POC Name / Contact',
      'LR No',
      'Uploaded Report',
      'Updated By',
    ],
  ];

  const body = dns.map((dn) => [
    dn.dnDate,
    dn.dnNumber,
    dn.facilityName,
    dn.parentPoDetails,
    dn.dnSkuIdItemName,
    String(dn.dnQty),
    dn.whPocDetails,
    dn.lrNo,
    dn.reportFileName || 'None',
    `${dn.updatedByName} (${dn.updatedByEmpId})`,
  ]);

  autoTable(doc, {
    startY: 64,
    head,
    body,
    styles: { fontSize: 8, cellPadding: 5 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
  });

  doc.save(`Instamart_DN_Tracker_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportAuditLogsToExcel(logs: ActivityLog[]) {
  const rows = logs.map((l) => ({
    'Employee Name': l.employeeName,
    'Employee ID': l.employeeId,
    'Team Role': l.employeeRole.toUpperCase(),
    'Action': l.action,
    'Module': l.module,
    'Reference (PO / DN)': l.referenceNo,
    'Details': l.details,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Admin Employee Activity');
  XLSX.writeFile(
    workbook,
    `Instamart_Admin_Activity_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

export function exportAuditLogsToPdf(logs: ActivityLog[]) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text('Instamart Admin — Employee Activity & Audit Log', 40, 36);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    `Generated on ${new Date().toLocaleString()} · Total Entries: ${logs.length}`,
    40,
    52
  );

  const head = [
    ['Employee Name', 'Employee ID', 'Team', 'Action', 'Module', 'Reference No.', 'Details'],
  ];
  const body = logs.map((l) => [
    l.employeeName,
    l.employeeId,
    l.employeeRole.toUpperCase(),
    l.action,
    l.module,
    l.referenceNo,
    l.details,
  ]);

  autoTable(doc, {
    startY: 64,
    head,
    body,
    styles: { fontSize: 8, cellPadding: 5 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
  });

  doc.save(`Instamart_Admin_Activity_${new Date().toISOString().slice(0, 10)}.pdf`);
}
