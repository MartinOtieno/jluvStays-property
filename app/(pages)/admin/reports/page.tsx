"use client";

import { useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportType = "bookings" | "viewings" | "rooms" | "users";

interface ReportRow {
  [key: string]: unknown;
}

const BRAND_COLOR = "#7A1B0F";

const REPORT_CONFIG: Record<
  ReportType,
  {
    label: string;
    icon: string;
    description: string;
    columns: string[];
  }
> = {
  bookings: {
    label: "Bookings Report",
    icon: "📅",
    description:
      "All booking records with guest, room, dates, amount and status.",
    columns: [
      "Guest",
      "Room",
      "Check-in",
      "Check-out",
      "Amount (Ksh)",
      "Status",
      "Date Created",
    ],
  },

  viewings: {
    label: "Viewing Requests",
    icon: "👁",
    description:
      "Viewing requests with requester, room, preferred date and status.",
    columns: [
      "Guest",
      "Room",
      "Preferred Date",
      "Status",
      "Assigned To",
      "Date Created",
    ],
  },

  rooms: {
    label: "Room Occupancy",
    icon: "🏠",
    description: "Room inventory with current status and pricing.",
    columns: [
      "Room Name",
      "Type",
      "Floor",
      "Price/Night (Ksh)",
      "Status",
    ],
  },

  users: {
    label: "User Registrations",
    icon: "👥",
    description: "Registered users with role, status and join date.",
    columns: ["Name", "Email", "Phone", "Role", "Status", "Joined"],
  },
};

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icons = {
  Download: () => (
    <svg
      width="15"
      height="15"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),

  Refresh: () => (
    <svg
      width="15"
      height="15"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
    </svg>
  ),

  File: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),

  ChevronDown: () => (
    <svg
      width="14"
      height="14"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  ),

  Alert: () => (
    <svg
      width="16"
      height="16"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

// ─── Data Shape Helpers ───────────────────────────────────────────────────────

function str(v: unknown): string {
  if (v === null || v === undefined) return "—";

  if (typeof v === "object") {
    return JSON.stringify(v);
  }

  return String(v);
}

function fmtDate(v: unknown): string {
  if (!v) return "—";

  const d = new Date(String(v));

  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-KE");
}

function fmtAmount(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";

  const n = Number(v);

  return isNaN(n) ? "—" : n.toLocaleString();
}

function buildRows(type: ReportType, data: ReportRow[]): string[][] {
  return data.map((item) => {
    const userName =
      (item.user as { name?: string })?.name ??
      (item.userName ? str(item.userName) : "—");

    const roomName =
      (item.room as { name?: string })?.name ??
      (item.roomName ? str(item.roomName) : "—");

    const assignedTo =
      (item.assignedTo as { name?: string })?.name ??
      (item.assignedTo ? str(item.assignedTo) : "Unassigned");

    if (type === "bookings") {
      return [
        userName,
        roomName,
        fmtDate(item.checkIn),
        fmtDate(item.checkOut),
        fmtAmount(item.totalPrice),
        str(item.status),
        fmtDate(item.createdAt),
      ];
    }

    if (type === "viewings") {
      return [
        userName,
        roomName,
        fmtDate(item.preferredDate),
        str(item.status),
        assignedTo,
        fmtDate(item.createdAt),
      ];
    }

    if (type === "rooms") {
      return [
        str(item.name),
        str(item.type),
        str(item.floor),
        fmtAmount(item.pricePerNight ?? item.priceMonthly),
        item.status
          ? str(item.status)
          : item.isAvailable === false
          ? "unavailable"
          : "available",
      ];
    }

    if (type === "users") {
      return [
        str(item.name),
        str(item.email),
        str(item.phone),
        str(item.role),
        str(item.status ?? "active"),
        fmtDate(item.createdAt),
      ];
    }

    return [];
  });
}

// ─── Export Helpers ───────────────────────────────────────────────────────────

function exportCSV(
  columns: string[],
  rows: string[][],
  filename: string
) {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;

  const lines = [
    columns.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ];

  const blob = new Blob([lines.join("\n")], {
    type: "text/csv",
  });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();

  URL.revokeObjectURL(url);
}

function exportJSON(
  columns: string[],
  rows: string[][],
  filename: string
) {
  const objects = rows.map((row) =>
    Object.fromEntries(
      columns.map((col, i) => [col, row[i]])
    )
  );

  const blob = new Blob(
    [JSON.stringify(objects, null, 2)],
    {
      type: "application/json",
    }
  );

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

function printPDF(
  title: string,
  columns: string[],
  rows: string[][]
) {
  const tableRows = rows
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell) =>
              `<td style="padding:6px 10px;border-bottom:1px solid #f1f5f9;font-size:12px">${cell}</td>`
          )
          .join("")}</tr>`
    )
    .join("");

  const html = `
    <html>
      <head>
        <title>${title}</title>

        <style>
          body {
            font-family: system-ui, sans-serif;
            margin: 32px;
            color: #0f172a;
          }

          h1 {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 4px;
          }

          p {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 24px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th {
            background: #f8fafc;
            padding: 8px 10px;
            text-align: left;
            font-size: 11px;
            font-weight: 600;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: .5px;
          }
        </style>
      </head>

      <body>
        <h1>${title}</h1>

        <p>
          Generated ${new Date().toLocaleString("en-KE")}
        </p>

        <table>
          <thead>
            <tr>
              ${columns.map((c) => `<th>${c}</th>`).join("")}
            </tr>
          </thead>

          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const win = window.open("", "_blank");

  if (!win) return;

  win.document.write(html);
  win.document.close();
  win.print();
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending:
    "bg-amber-50 text-amber-700 border border-amber-200",

  confirmed:
    "bg-emerald-50 text-emerald-700 border border-emerald-200",

  cancelled:
    "bg-red-50 text-red-600 border border-red-200",

  approved:
    "bg-emerald-50 text-emerald-700 border border-emerald-200",

  rejected:
    "bg-red-50 text-red-600 border border-red-200",

  completed:
    "bg-blue-50 text-blue-700 border border-blue-200",

  available:
    "bg-emerald-50 text-emerald-700 border border-emerald-200",

  unavailable:
    "bg-red-50 text-red-600 border border-red-200",

  occupied:
    "bg-blue-50 text-blue-700 border border-blue-200",

  reserved:
    "bg-violet-50 text-violet-700 border border-violet-200",

  maintenance:
    "bg-amber-50 text-amber-700 border border-amber-200",

  active:
    "bg-emerald-50 text-emerald-700 border border-emerald-200",

  suspended:
    "bg-red-50 text-red-600 border border-red-200",
};

function StatusCell({ value }: { value: string }) {
  const known = STATUS_COLORS[value?.toLowerCase()];

  if (!known) {
    return (
      <span className="text-sm text-slate-600">
        {value}
      </span>
    );
  }

  return (
    <span
      className={`px-2 py-0.5 text-[11px] font-semibold rounded-full capitalize ${known}`}
    >
      {value}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [reportType, setReportType] =
    useState<ReportType>("bookings");

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [rows, setRows] = useState<string[][]>([]);

  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [error, setError] = useState("");

  const config = REPORT_CONFIG[reportType];

  // ─── API Routes ───────────────────────────────────────────────────────────

  const API_MAP: Record<ReportType, string> = {
    bookings: "/api/bookings",
    viewings: "/api/viewing-request",
    rooms: "/api/rooms",
    users: "/api/users?limit=10000",
  };

  // ─── Status Options ───────────────────────────────────────────────────────

  const STATUS_OPTIONS: Record<
    ReportType,
    string[]
  > = {
    bookings: [
      "all",
      "pending",
      "confirmed",
      "cancelled",
    ],

    viewings: [
      "all",
      "pending",
      "approved",
      "rejected",
      "completed",
    ],

    rooms: [
      "all",
      "available",
      "unavailable",
    ],

    users: [
      "all",
      "active",
      "suspended",
    ],
  };

  // ─── Generate Report ──────────────────────────────────────────────────────

  const generate = useCallback(async () => {
    setLoading(true);
    setGenerated(false);
    setError("");

    try {
      const res = await fetch(API_MAP[reportType]);

      if (!res.ok) {
        const body = await res
          .json()
          .catch(() => ({}));

        throw new Error(
          body.message ?? `HTTP ${res.status}`
        );
      }

      const data = await res.json();

      let items: ReportRow[] =
        data.data ?? data.rooms ?? [];

      if (!Array.isArray(items)) {
        throw new Error(
          "Unexpected response format from server"
        );
      }

      // ─── Date Filter ──────────────────────────────────────────────────────

      if (dateFrom || dateTo) {
        items = items.filter((item) => {
          const d = new Date(
            String(
              item.createdAt ??
                item.preferredDate ??
                ""
            )
          );

          if (isNaN(d.getTime())) {
            return true;
          }

          if (
            dateFrom &&
            d < new Date(dateFrom)
          ) {
            return false;
          }

          if (
            dateTo &&
            d > new Date(`${dateTo}T23:59:59`)
          ) {
            return false;
          }

          return true;
        });
      }

      // ─── Status Filter ───────────────────────────────────────────────────

      if (statusFilter !== "all") {
        items = items.filter((item) => {
          if (
            reportType === "rooms" &&
            !item.status
          ) {
            const roomStatus =
              item.isAvailable === false
                ? "unavailable"
                : "available";

            return (
              roomStatus === statusFilter
            );
          }

          return (
            String(
              item.status ?? "active"
            ).toLowerCase() ===
            statusFilter
          );
        });
      }

      setRows(
        buildRows(reportType, items)
      );

      setGenerated(true);
    } catch (e: unknown) {
      const message =
        e instanceof Error
          ? e.message
          : "Unknown error";

      setError(
        `Failed to load report: ${message}`
      );

      console.error("[Reports]", e);
    } finally {
      setLoading(false);
    }
  }, [
    reportType,
    dateFrom,
    dateTo,
    statusFilter,
  ]);

  // ─── Export ───────────────────────────────────────────────────────────────

  const filename = `${reportType}-report-${new Date()
    .toISOString()
    .slice(0, 10)}`;

  // Brand-colored focus ring
  const inputCls =
    "border border-slate-300 rounded-xl px-3 py-2 text-sm text-[#7A1B0F] focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] bg-white";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Reports
        </h1>

        <p className="text-slate-500 text-sm mt-0.5">
          Generate and export reports for any part
          of the system
        </p>
      </div>

      {/* Report Type Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(
          Object.entries(
            REPORT_CONFIG
          ) as [
            ReportType,
            typeof REPORT_CONFIG[ReportType]
          ][]
        ).map(([key, cfg]) => {
          const selected =
            reportType === key;

          return (
            <button
              key={key}
              onClick={() => {
                setReportType(key);
                setGenerated(false);
                setError("");
                setStatusFilter("all");
              }}
              style={
                selected
                  ? {
                      borderColor:
                        BRAND_COLOR,
                      backgroundColor:
                        `${BRAND_COLOR}0D`,
                    }
                  : undefined
              }
              className={`text-left p-4 rounded-2xl border-2 transition ${
                selected
                  ? ""
                  : "border-slate-100 bg-white hover:border-slate-200"
              }`}
            >
              <span className="text-2xl block mb-2">
                {cfg.icon}
              </span>

              <p
                style={
                  selected
                    ? {
                        color: BRAND_COLOR,
                      }
                    : undefined
                }
                className={`text-sm font-semibold ${
                  selected
                    ? ""
                    : "text-slate-800"
                }`}
              >
                {cfg.label}
              </p>

              <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                {cfg.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-5">

        <h2 className="font-bold text-slate-900 text-sm mb-4">
          Filters
        </h2>

        <div className="flex flex-wrap gap-3 items-end">

          {/* From */}
          <div>
            <label className="block text-xs font-semibold text-black mb-1.5">
              From
            </label>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) =>
                setDateFrom(e.target.value)
              }
              style={
                {
                  "--tw-ring-color":
                    BRAND_COLOR,
                } as React.CSSProperties
              }
              className={inputCls}
            />
          </div>

          {/* To */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              To
            </label>

            <input
              type="date"
              value={dateTo}
              onChange={(e) =>
                setDateTo(e.target.value)
              }
              style={
                {
                  "--tw-ring-color":
                    BRAND_COLOR,
                } as React.CSSProperties
              }
              className={inputCls}
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Status
            </label>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value
                  )
                }
                style={
                  {
                    "--tw-ring-color":
                      BRAND_COLOR,
                  } as React.CSSProperties
                }
                className={`${inputCls} appearance-none pr-8`}
              >
                {STATUS_OPTIONS[
                  reportType
                ].map((s) => (
                  <option
                    key={s}
                    value={s}
                  >
                    {s === "all"
                      ? "All statuses"
                      : s
                          .charAt(0)
                          .toUpperCase() +
                        s.slice(1)}
                  </option>
                ))}
              </select>

              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Icons.ChevronDown />
              </span>
            </div>
          </div>

          {/* Generate */}
          <button
            onClick={generate}
            disabled={loading}
            style={{
              backgroundColor:
                BRAND_COLOR,
              boxShadow: `0 4px 10px ${BRAND_COLOR}33`,
            }}
            className="flex items-center gap-2 px-5 py-2 text-white text-sm font-semibold rounded-xl transition hover:opacity-90 disabled:opacity-60"
          >
            <Icons.Refresh />

            {loading
              ? "Generating…"
              : "Generate Report"}
          </button>

          {/* Export Buttons */}
          {generated && rows.length > 0 && (
            <div className="flex gap-2 ml-auto flex-wrap">

              {/* CSV */}
              <button
                onClick={() =>
                  exportCSV(
                    config.columns,
                    rows,
                    filename
                  )
                }
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition"
              >
                <Icons.Download />
                CSV
              </button>

              {/* JSON */}
              <button
                onClick={() =>
                  exportJSON(
                    config.columns,
                    rows,
                    filename
                  )
                }
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition"
              >
                <Icons.Download />
                JSON
              </button>

              {/* PDF */}
              <button
                onClick={() =>
                  printPDF(
                    config.label,
                    config.columns,
                    rows
                  )
                }
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition"
              >
                <Icons.File />
                PDF / Print
              </button>

            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          <Icons.Alert />
          <span>{error}</span>
        </div>
      )}

      {/* Results */}
      {generated && !error && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

          {/* Table Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">

            <div>
              <h2 className="font-bold text-slate-900 text-sm">
                {config.label}
              </h2>

              <p className="text-xs text-slate-400 mt-0.5">
                {rows.length} record
                {rows.length !== 1
                  ? "s"
                  : ""}{" "}
                found
              </p>
            </div>

            <span className="text-xs text-slate-400">
              Generated{" "}
              {new Date().toLocaleString(
                "en-KE",
                {
                  dateStyle: "medium",
                  timeStyle: "short",
                }
              )}
            </span>
          </div>

          {/* No Results */}
          {rows.length === 0 ? (
            <div className="py-16 text-center">

              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icons.File />
              </div>

              <p className="text-slate-500 font-medium">
                No records found
              </p>

              <p className="text-slate-400 text-sm mt-1">
                Try adjusting your filters and
                generate again
              </p>

            </div>
          ) : (

            /* Table */
            <div className="overflow-x-auto">

              <table className="w-full text-sm min-w-max">

                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">

                    {config.columns.map(
                      (col) => (
                        <th
                          key={col}
                          className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                        >
                          {col}
                        </th>
                      )
                    )}

                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-50">

                  {rows.map(
                    (row, i) => (
                      <tr
                        key={i}
                        className="hover:bg-slate-50 transition"
                      >

                        {row.map(
                          (cell, j) => {
                            const isStatus =
                              config.columns[
                                j
                              ]
                                .toLowerCase() ===
                              "status";

                            return (
                              <td
                                key={j}
                                className="px-4 py-3 whitespace-nowrap"
                              >
                                {isStatus ? (
                                  <StatusCell
                                    value={
                                      cell
                                    }
                                  />
                                ) : (
                                  <span className="text-slate-700">
                                    {
                                      cell
                                    }
                                  </span>
                                )}
                              </td>
                            );
                          }
                        )}

                      </tr>
                    )
                  )}

                </tbody>
              </table>

            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!generated &&
        !loading &&
        !error && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-20 text-center">

            <div
              style={{
                color: BRAND_COLOR,
              }}
              className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4"
            >
              <Icons.File />
            </div>

            <p className="text-slate-600 font-semibold">
              No report generated yet
            </p>

            <p className="text-slate-400 text-sm mt-1">
              Select a report type, apply filters
              if needed, then click{" "}
              <strong>
                Generate Report
              </strong>
              .
            </p>

          </div>
        )}

    </div>
  );
}