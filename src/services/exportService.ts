import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PurchaseOrder, DnRecord, ActivityLog } from '../types';
import { PO_HEADERS, DN_HEADERS, formatPoToRow, formatDnToRow } from './googleSheets';

export function exportPoListToExcel(pos: PurchaseOrder[], tabName: string) {
  const rows = pos.map((po) => {
    const arr = formatPoToRow(po);
    const obj: Record<string, string | number> = {};
    PO_HEADERS.forEach((h, i) => {
      obj[h] = arr[i];
    });
    return obj;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, tabName.slice(0, 31));
  XLSX.writeFile(workbook, `Instamart_${tabName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
  doc.text(`Generated on ${new Date().toLocaleString()} · Total Records: ${pos.length}`, 40, 52);

  const head = [[
    'PO Number',
    'Order Date',
    'Warehouse',
    'Item ID & Name',
    'Qty',
    'Invoice',
    'Ship Date',
    'Appt ID / Date',
    'Boxes / Dim',
    'Logistics / Tracking',
    'PUC / ASN / Bag',
    'Pickup',
    'Stage / GRN',
    'Updated By',
  ]];

  const body = pos.map((po) => [
    po.poNumber,
    po.orderDate,
    po.warehouseName,
    `${po.itemId}\n${po.itemName}`,
    String(po.totalQty),
    po.invoiceNo || '-',
    po.shipDate || '-',
    `${po.appointmentId || '-'}\n${po.appointmentDate || ''}`,
    `${po.noOfBoxes} (${po.boxDimensions || '-'})`,
    `${po.logisticsPortal || '-'}\n${po.pickupTrackingId || '-'}`,
    `PUC:${po.puc || '-'} ASN:${po.asn || '-'}\nBag:${po.clearBagNo || '-'}`,
    po.pickupStatus,
    `${po.workflowStage}\n${po.grnNumber || ''}`,
    `${po.updatedByName}\n(${po.updatedByEmpId})`,
  ]);

  autoTable(doc, {
    startY: 64,
    head,
    body,
    styles: { fontSize: 7, cellPadding: 4 },
    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
  });

  doc.save(`Instamart_${tabTitle.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
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

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Instamart DN Tracker');
  XLSX.writeFile(workbook, `Instamart_DN_Tracker_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
  doc.text(`Generated on ${new Date().toLocaleString()} · Total DN Records: ${dns.length}`, 40, 52);

  const head = [[
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
  ]];

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
  XLSX.writeFile(workbook, `Instamart_Admin_Activity_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportAuditLogsToPdf(logs: ActivityLog[]) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text('Instamart Admin — Employee Activity & Audit Log', 40, 36);
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Generated on ${new Date().toLocaleString()} · Total Entries: ${logs.length}`, 40, 52);

  const head = [['Employee Name', 'Employee ID', 'Team', 'Action', 'Module', 'Reference No.', 'Details']];
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
