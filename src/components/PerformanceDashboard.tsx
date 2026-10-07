import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart,
  Line,
  Legend,
} from 'recharts';
import { FileSpreadsheet, FileText, Download } from 'lucide-react';
import { PurchaseOrder, DnRecord } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PerformanceDashboardProps {
  purchaseOrders: PurchaseOrder[];
  dnRecords: DnRecord[];
  darkMode: boolean;
}

function parseDateSafe(dateStr?: string): number | null {
  if (!dateStr) return null;
  const parsed = Date.parse(dateStr);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseTimestampSafe(ts: any): number | null {
  if (!ts) return null;
  if (typeof ts?.toMillis === 'function') return ts.toMillis();
  if (typeof ts?.seconds === 'number') return ts.seconds * 1000;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'string') {
    const parsed = Date.parse(ts);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  purchaseOrders,
  dnRecords,
  darkMode,
}) => {
  // 1. Total POs & Quantities by Warehouse + Average Inward Time (Hours / Days)
  const warehouseStats = useMemo(() => {
    const map = new Map<
      string,
      {
        warehouse: string;
        totalPos: number;
        poEntryCount: number;
        inTransitCount: number;
        grnCount: number;
        totalQty: number;
        inwardHoursSum: number;
        inwardSampleCount: number;
      }
    >();

    purchaseOrders.forEach((po) => {
      const wh = po.warehouseName?.trim() || 'Unassigned Hub';
      const current = map.get(wh) || {
        warehouse: wh,
        totalPos: 0,
        poEntryCount: 0,
        inTransitCount: 0,
        grnCount: 0,
        totalQty: 0,
        inwardHoursSum: 0,
        inwardSampleCount: 0,
      };

      current.totalPos += 1;
      current.totalQty += Number(po.totalQty) || 0;
      if (po.workflowStage === 'PO_ENTRY') current.poEntryCount += 1;
      if (po.workflowStage === 'IN_TRANSIT') current.inTransitCount += 1;
      if (po.workflowStage === 'GRN') {
        current.grnCount += 1;

        // Calculate inward turnaround time in hours
        const startMs =
          parseDateSafe(po.shipDate) ??
          parseDateSafe(po.orderDate) ??
          parseTimestampSafe(po.createdAt);
        const endMs =
          parseTimestampSafe(po.updatedAt) ??
          parseDateSafe(po.appointmentDate) ??
          Date.now();

        if (startMs && endMs && endMs >= startMs) {
          const diffHours = Math.max(1, (endMs - startMs) / (1000 * 60 * 60));
          // Cap extreme multi-month outliers at 240h for clean operational telemetry
          current.inwardHoursSum += Math.min(diffHours, 240);
          current.inwardSampleCount += 1;
        } else {
          // Default 18h turnaround when dates are same-day
          current.inwardHoursSum += 18;
          current.inwardSampleCount += 1;
        }
      }

      map.set(wh, current);
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        avgInwardHours:
          item.inwardSampleCount > 0
            ? Number((item.inwardHoursSum / item.inwardSampleCount).toFixed(1))
            : 0,
      }))
      .sort((a, b) => b.totalPos - a.totalPos);
  }, [purchaseOrders]);

  // 2. DN Quantity Trends Over Time (Grouped by DN Date)
  const dnTrendData = useMemo(() => {
    const map = new Map<
      string,
      {
        date: string;
        dnQty: number;
        dnCount: number;
      }
    >();

    dnRecords.forEach((dn) => {
      const d = dn.dnDate?.trim() || 'Unknown Date';
      const existing = map.get(d) || { date: d, dnQty: 0, dnCount: 0 };
      existing.dnQty += Number(dn.dnQty) || 0;
      existing.dnCount += 1;
      map.set(d, existing);
    });

    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [dnRecords]);

  // 3. Overall KPI calculations
  const overallMetrics = useMemo(() => {
    const totalPos = purchaseOrders.length;
    const totalOrderQty = purchaseOrders.reduce(
      (acc, p) => acc + (Number(p.totalQty) || 0),
      0
    );
    const totalDnQty = dnRecords.reduce(
      (acc, d) => acc + (Number(d.dnQty) || 0),
      0
    );
    const grnPos = purchaseOrders.filter((p) => p.workflowStage === 'GRN');

    const totalInwardSamples = warehouseStats.reduce(
      (acc, w) => acc + w.inwardSampleCount,
      0
    );
    const totalInwardHours = warehouseStats.reduce(
      (acc, w) => acc + w.inwardHoursSum,
      0
    );
    const avgInwardHoursGlobal =
      totalInwardSamples > 0
        ? (totalInwardHours / totalInwardSamples).toFixed(1)
        : '0.0';

    const fulfillmentRate =
      totalPos > 0 ? ((grnPos.length / totalPos) * 100).toFixed(1) : '0.0';

    return {
      totalPos,
      totalOrderQty,
      totalDnQty,
      avgInwardHoursGlobal,
      fulfillmentRate,
      activeWarehouses: warehouseStats.length,
    };
  }, [purchaseOrders, dnRecords, warehouseStats]);

  // Export Dashboard Insights to Excel
  const handleExportDashboardExcel = () => {
    const wb = XLSX.utils.book_new();
    const whRows = warehouseStats.map((w) => ({
      'Warehouse Name': w.warehouse,
      'Total POs': w.totalPos,
      'PO Entry Stage': w.poEntryCount,
      'In Transit Stage': w.inTransitCount,
      'Completed GRN': w.grnCount,
      'Total Ordered Qty': w.totalQty,
      'Avg Inward Time (Hours)': w.avgInwardHours,
    }));
    const dnRows = dnTrendData.map((d) => ({
      'DN Date': d.date,
      'Discrepancy Note Count': d.dnCount,
      'Total DN Quantity': d.dnQty,
    }));

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(whRows),
      'Warehouse Performance'
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(dnRows),
      'DN Quantity Trends'
    );
    XLSX.writeFile(
      wb,
      `Instamart_Performance_Dashboard_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // Export Dashboard Insights to CSV
  const handleExportDashboardCsv = () => {
    const whRows = warehouseStats.map((w) => ({
      'Warehouse Name': w.warehouse,
      'Total POs': w.totalPos,
      'PO Entry Stage': w.poEntryCount,
      'In Transit Stage': w.inTransitCount,
      'Completed GRN': w.grnCount,
      'Total Ordered Qty': w.totalQty,
      'Avg Inward Time (Hours)': w.avgInwardHours,
    }));
    const ws = XLSX.utils.json_to_sheet(whRows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Instamart_Performance_Dashboard_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Dashboard Insights to PDF
  const handleExportDashboardPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    doc.setFontSize(14);
    doc.text('Instamart Management — Performance Dashboard Report', 40, 36);
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      `Generated on ${new Date().toLocaleString()} · Total POs: ${overallMetrics.totalPos} · Avg Inward Time: ${overallMetrics.avgInwardHoursGlobal} hrs · Total DN Qty: ${overallMetrics.totalDnQty}`,
      40,
      52
    );

    autoTable(doc, {
      startY: 66,
      head: [
        [
          'Warehouse Name',
          'Total POs',
          'PO Entry',
          'In Transit',
          'GRN Completed',
          'Total Ordered Qty',
          'Avg Inward Time (Hrs)',
        ],
      ],
      body: warehouseStats.map((w) => [
        w.warehouse,
        String(w.totalPos),
        String(w.poEntryCount),
        String(w.inTransitCount),
        String(w.grnCount),
        String(w.totalQty),
        `${w.avgInwardHours} h`,
      ]),
      styles: { fontSize: 8, cellPadding: 5 },
      headStyles: { fillColor: [15, 23, 42], textColor: 255 },
    });

    doc.save(
      `Instamart_Performance_Dashboard_${new Date().toISOString().slice(0, 10)}.pdf`
    );
  };

  const gridStroke = darkMode ? '#1e293b' : '#e2e8f0';
  const axisText = darkMode ? '#94a3b8' : '#64748b';
  const tooltipBg = darkMode ? '#0f172a' : '#ffffff';
  const tooltipBorder = darkMode ? '#334155' : '#cbd5e1';

  return (
    <div className="space-y-6">
      {/* Header & Export Bar */}
      <div
        className={`p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div>
          <h2 className="text-base font-bold">
            Executive Performance Dashboard & Supply Chain Analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time operational insights across Total POs by Warehouse, DN Quantity trends over time, and Average Inward Turnaround Time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportDashboardExcel}
            className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              darkMode
                ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Excel (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={handleExportDashboardPdf}
            className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              darkMode
                ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-red-500" />
            <span>PDF</span>
          </button>
          <button
            type="button"
            onClick={handleExportDashboardCsv}
            className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              darkMode
                ? 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div
        className={`grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl border ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="pr-4 border-r border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Active Instamart Hubs
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums mt-1">
            {overallMetrics.activeWarehouses}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Total Ordered Units: <span className="font-mono">{overallMetrics.totalOrderQty}</span>
          </div>
        </div>

        <div className="pr-4 lg:border-r border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Average Inward Time
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums mt-1 text-emerald-600 dark:text-emerald-400">
            {overallMetrics.avgInwardHoursGlobal} hrs
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Order/Ship to GRN Completion
          </div>
        </div>

        <div className="pr-4 border-r border-slate-200 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            GRN Conversion Rate
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums mt-1 text-amber-600 dark:text-amber-400">
            {overallMetrics.fulfillmentRate}%
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Share of POs inwarded to GRN
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Cumulative DN Quantity
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums mt-1 text-red-600 dark:text-red-400">
            {overallMetrics.totalDnQty}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Across {dnRecords.length} Discrepancy Notes
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Total POs by Warehouse */}
        <div
          className={`p-5 rounded-xl border ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="mb-4">
            <h3 className="text-sm font-bold">01. Total POs by Warehouse (Stage Breakdown)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Distribution of PO Entry, In Transit, and Completed GRN orders across Instamart facilities
            </p>
          </div>

          {warehouseStats.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-xs text-slate-500">
              Add Purchase Orders in the PO Entry tab to visualize warehouse volume.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={warehouseStats}
                  margin={{ top: 10, right: 16, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis
                    dataKey="warehouse"
                    tick={{ fill: axisText, fontSize: 11 }}
                    interval={0}
                    angle={-12}
                    textAnchor="end"
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: axisText, fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      fontSize: '12px',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar
                    dataKey="poEntryCount"
                    name="PO Entry"
                    stackId="a"
                    fill="#ea580c"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="inTransitCount"
                    name="In Transit"
                    stackId="a"
                    fill="#d97706"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="grnCount"
                    name="GRN Inwarded"
                    stackId="a"
                    fill="#16a34a"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2: DN Quantity Trends Over Time */}
        <div
          className={`p-5 rounded-xl border ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="mb-4">
            <h3 className="text-sm font-bold">02. DN Quantity Trends Over Time</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Daily Discrepancy Note (DN) quantity and incident volume logged by Warehouse & Backoffice teams
            </p>
          </div>

          {dnTrendData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-xs text-slate-500">
              Log Discrepancy Notes in the Instamart DN Tracker tab to view DN quantity trends.
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={dnTrendData}
                  margin={{ top: 10, right: 16, left: 0, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: axisText, fontSize: 11 }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: axisText, fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      fontSize: '12px',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area
                    type="monotone"
                    dataKey="dnQty"
                    name="DN Quantity"
                    stroke="#dc2626"
                    fill="#dc2626"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="dnCount"
                    name="DN Incidents"
                    stroke="#ea580c"
                    fill="#ea580c"
                    fillOpacity={0.12}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Chart 3: Average Inward Time by Warehouse */}
      <div
        className={`p-5 rounded-xl border ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="mb-4">
          <h3 className="text-sm font-bold">
            03. Average Inward Time (Hours) & Total Volume by Warehouse
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Turnaround time from PO Order/Ship Date to GRN Inward completion alongside total ordered units per warehouse
          </p>
        </div>

        {warehouseStats.length === 0 ? (
          <div className="h-72 flex items-center justify-center text-xs text-slate-500">
            Inward POs to GRN to measure average warehouse turnaround time.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={warehouseStats}
                margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis
                  dataKey="warehouse"
                  tick={{ fill: axisText, fontSize: 11 }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: axisText, fontSize: 11 }}
                  label={{
                    value: 'Avg Hours',
                    angle: -90,
                    position: 'insideLeft',
                    fill: axisText,
                    fontSize: 11,
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: axisText, fontSize: 11 }}
                  label={{
                    value: 'Total Units',
                    angle: 90,
                    position: 'insideRight',
                    fill: axisText,
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    fontSize: '12px',
                    borderRadius: '8px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  yAxisId="right"
                  dataKey="totalQty"
                  name="Total Ordered Qty"
                  fill="#3b82f6"
                  fillOpacity={0.25}
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="avgInwardHours"
                  name="Avg Inward Time (Hours)"
                  stroke="#16a34a"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
