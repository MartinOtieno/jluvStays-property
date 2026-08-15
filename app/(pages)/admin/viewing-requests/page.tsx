"use client";

import { useEffect, useState, Fragment } from "react";

interface ViewingRequest {
  _id: string;
  room: { name: string; type: string };
  user: { name: string; email: string; phone: string };
  preferredDate: string;
  message: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

const STATUS_STYLES = {
  pending:  "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-KE", {
    day: "numeric", month: "short", year: "numeric",
  });

const LIMIT = 10;

export default function AdminViewingRequestsPage() {
  const [requests, setRequests]     = useState<ViewingRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [success, setSuccess]       = useState("");
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [page, setPage]             = useState(1);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/viewing-request");
      const data = await res.json();
      if (data.success) setRequests(data.data);
    } catch (err) {
      console.error("Failed to load requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRequests(); }, []);

  // Reset to page 1 when tab changes
  useEffect(() => { setPage(1); }, [activeTab]);

  const updateStatus = async (id: string, status: ViewingRequest["status"]) => {
    setUpdatingId(id);
    try {
      const res  = await fetch(`/api/viewing-request/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setRequests((prev) => prev.map((r) => r._id === id ? { ...r, status } : r));
        setSuccess(`Request ${status} successfully!`);
        setTimeout(() => setSuccess(""), 3000);
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const counts = {
    all:      requests.length,
    pending:  requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
  };

  const filtered = activeTab === "all"
    ? requests
    : requests.filter((r) => r.status === activeTab);

  const totalPages = Math.ceil(filtered.length / LIMIT);
  const paginated  = filtered.slice((page - 1) * LIMIT, page * LIMIT);

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-xl font-semibold text-slate-900">Viewing Requests</h1>
        <p className="text-sm text-slate-400 mt-0.5">{requests.length} total requests</p>
      </div>

      {success && (
        <div className="p-3.5 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 bg-white rounded-xl p-1.5 border border-slate-100 shadow-sm w-fit">
        {(["all", "pending", "approved", "rejected"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize flex items-center gap-1.5 ${
              activeTab === tab
                ? "bg-blue-600 text-white"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${
              activeTab === tab ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-500"
            }`}>
              {counts[tab]}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-50">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                <div className="h-3 bg-slate-100 rounded w-1/5" />
                <div className="h-3 bg-slate-100 rounded w-1/6" />
                <div className="h-3 bg-slate-100 rounded w-1/6" />
                <div className="h-6 bg-slate-100 rounded-full w-20 ml-auto" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            <p className="text-3xl mb-3">👁</p>
            No {activeTab === "all" ? "" : activeTab} viewing requests.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wide">
                <th className="px-5 py-3.5 text-left font-medium">Room</th>
                <th className="px-5 py-3.5 text-left font-medium hidden sm:table-cell">Guest</th>
                <th className="px-5 py-3.5 text-left font-medium hidden md:table-cell">Email</th>
                <th className="px-5 py-3.5 text-left font-medium hidden lg:table-cell">Phone</th>
                <th className="px-5 py-3.5 text-left font-medium hidden md:table-cell">Preferred date</th>
                <th className="px-5 py-3.5 text-left font-medium">Status</th>
                <th className="px-5 py-3.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginated.map((request) => {
                const isPending  = request.status === "pending";
                const isUpdating = updatingId === request._id;

                return (
                  <Fragment key={request._id}>
                    <tr
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      onClick={() => setExpanded(expanded === request._id ? null : request._id)}
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-800">{request.room?.name}</p>
                        <p className="text-xs text-slate-400 capitalize">{request.room?.type}</p>
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <p className="text-slate-700 font-medium">{request.user?.name}</p>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">
                        {request.user?.email}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 hidden lg:table-cell">
                        {request.user?.phone || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 hidden md:table-cell">
                        {formatDate(request.preferredDate)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[request.status]}`}>
                          {request.status}
                        </span>
                      </td>

                      {/* Actions — buttons always visible, disabled once actioned */}
                      <td className="px-5 py-3.5">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Approve */}
                          <button
                            onClick={() => isPending && updateStatus(request._id, "approved")}
                            disabled={!isPending || isUpdating}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                              request.status === "approved"
                                ? "bg-green-50 border-green-200 text-green-400 cursor-not-allowed"
                                : isPending
                                ? "bg-green-600 hover:bg-green-700 border-green-600 text-white"
                                : "bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed"
                            }`}
                          >
                            {isUpdating ? "…" : "Approve"}
                          </button>

                          {/* Reject */}
                          <button
                            onClick={() => isPending && updateStatus(request._id, "rejected")}
                            disabled={!isPending || isUpdating}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                              request.status === "rejected"
                                ? "bg-red-50 border-red-200 text-red-300 cursor-not-allowed"
                                : isPending
                                ? "border-red-200 text-red-500 hover:bg-red-50"
                                : "bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed"
                            }`}
                          >
                            Reject
                          </button>

                          {/* WhatsApp */}
                          <a
                            href={`https://wa.me/${request.user?.phone?.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition"
                            title="WhatsApp guest"
                          >
                            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </a>
                        </div>
                      </td>
                    </tr>

                    {expanded === request._id && request.message && (
                      <tr className="bg-slate-50">
                        <td colSpan={7} className="px-5 py-3 text-sm text-slate-600">
                          <span className="text-xs text-slate-400 uppercase tracking-wide font-medium mr-2">
                            Message:
                          </span>
                          {request.message}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {page} of {totalPages} — showing {paginated.length} of {filtered.length} requests
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}