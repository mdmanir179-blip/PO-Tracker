import { PurchaseOrder, DnRecord } from '../types';
import { getAccessToken } from '../firebase';

export const SHEET_TABS = {
  PO_ENTRY: 'PO Entry',
  IN_TRANSIT: 'In Transit',
  GRN: 'GRN',
  DN_TRACKER: 'Instamart DN Tracker',
} as const;

export const PO_HEADERS = [
  'PO Number',
  'Order Date',
  'Warehouse Name',
  'Item ID',
  'Item Name',
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

export function formatPoToRow(po: PurchaseOrder): (string | number)[] {
  return [
    po.poNumber,
    po.orderDate,
    po.warehouseName,
    po.itemId,
    po.itemName,
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

export async function createInstamartSpreadsheet(title = 'Instamart PO & DN Live Tracker'): Promise<string> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Google Sheets token unavailable. Please reconnect Google Sheets.');
  }

  const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        { properties: { title: SHEET_TABS.PO_ENTRY, gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: SHEET_TABS.IN_TRANSIT, gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: SHEET_TABS.GRN, gridProperties: { frozenRowCount: 1 } } },
        { properties: { title: SHEET_TABS.DN_TRACKER, gridProperties: { frozenRowCount: 1 } } },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create Google Sheet: ${errText}`);
  }

  const data = await res.json();
  return data.spreadsheetId as string;
}

export async function ensureSheetTabsExist(spreadsheetId: string): Promise<void> {
  const token = getAccessToken();
  if (!token || !spreadsheetId) return;

  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!metaRes.ok) {
    throw new Error('Unable to access the specified Google Sheet. Verify the Spreadsheet ID and permissions.');
  }

  const metaData = await metaRes.json();
  const existingTitles = new Set<string>(
    (metaData.sheets || []).map((s: any) => s.properties?.title)
  );

  const requiredTabs = Object.values(SHEET_TABS);
  const requests = requiredTabs
    .filter((tabName) => !existingTitles.has(tabName))
    .map((tabName) => ({
      addSheet: {
        properties: {
          title: tabName,
          gridProperties: { frozenRowCount: 1 },
        },
      },
    }));

  if (requests.length > 0) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });
  }
}

export async function syncAllTabsToGoogleSheet(
  spreadsheetId: string,
  purchaseOrders: PurchaseOrder[],
  dnRecords: DnRecord[]
): Promise<void> {
  const token = getAccessToken();
  if (!token || !spreadsheetId) return;

  await ensureSheetTabsExist(spreadsheetId);

  const poEntryRows = [
    PO_HEADERS,
    ...purchaseOrders
      .filter((po) => po.workflowStage === 'PO_ENTRY')
      .map(formatPoToRow),
  ];

  const inTransitRows = [
    PO_HEADERS,
    ...purchaseOrders
      .filter((po) => po.workflowStage === 'IN_TRANSIT')
      .map(formatPoToRow),
  ];

  const grnRows = [
    PO_HEADERS,
    ...purchaseOrders
      .filter((po) => po.workflowStage === 'GRN')
      .map(formatPoToRow),
  ];

  const dnRows = [
    DN_HEADERS,
    ...dnRecords.map(formatDnToRow),
  ];

  // Clear existing values in all 4 tabs first so moved items are cleanly shifted
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ranges: [
          `'${SHEET_TABS.PO_ENTRY}'!A1:AA2000`,
          `'${SHEET_TABS.IN_TRANSIT}'!A1:AA2000`,
          `'${SHEET_TABS.GRN}'!A1:AA2000`,
          `'${SHEET_TABS.DN_TRACKER}'!A1:L2000`,
        ],
      }),
    }
  );

  // Batch write updated values to all 4 tabs
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: [
          {
            range: `'${SHEET_TABS.PO_ENTRY}'!A1`,
            values: poEntryRows,
          },
          {
            range: `'${SHEET_TABS.IN_TRANSIT}'!A1`,
            values: inTransitRows,
          },
          {
            range: `'${SHEET_TABS.GRN}'!A1`,
            values: grnRows,
          },
          {
            range: `'${SHEET_TABS.DN_TRACKER}'!A1`,
            values: dnRows,
          },
        ],
      }),
    }
  );

  if (!updateRes.ok) {
    const errText = await updateRes.text();
    throw new Error(`Google Sheets sync failed: ${errText}`);
  }
}
