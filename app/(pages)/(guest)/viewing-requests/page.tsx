"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";
import toast, { Toaster } from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ListingImage {
  url: string;
  label?: string;
  caption?: string;
}

interface Listing {
  _id: string;
  name?: string;
  title?: string;
  type?: string;
  rentalType?: string;
  pricePerNight?: number;
  pricePerMonth?: number;
  price?: number;
  images?: ListingImage[] | string[];
}

interface ViewingRequest {
  _id: string;
  room?: Listing;
  unit?: Listing;
  property?: Listing;
  listing?: Listing;
  preferredDate: string;
  message: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

type FilterTab = "all" | "pending" | "approved" | "rejected";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200";

function getListing(
  request: ViewingRequest
): Listing | null {
  return (
    request.listing ||
    request.property ||
    request.unit ||
    request.room ||
    null
  );
}

function getListingName(listing: Listing | null) {
  if (!listing) return "JluvStays Property";

  return listing.name || listing.title || "JluvStays Property";
}

function getListingImage(listing: Listing | null): string {
  if (!listing?.images || listing.images.length === 0) {
    return PLACEHOLDER_IMAGE;
  }

  const firstImage = listing.images[0];

  if (typeof firstImage === "string") {
    return firstImage;
  }

  if (firstImage?.url) {
    return firstImage.url;
  }

  return PLACEHOLDER_IMAGE;
}

function getListingType(listing: Listing | null) {
  if (!listing) return "Accommodation";

  if (listing.rentalType) {
    switch (listing.rentalType) {
      case "short_term":
        return "Short-term stay";

      case "mid_term":
        return "Mid-term rental";

      case "long_term":
        return "Long-term rental";

      default:
        return listing.rentalType.replace(/_/g, " ");
    }
  }

  if (listing.type) {
    return listing.type.replace(/_/g, " ");
  }

  return "Accommodation";
}

function getListingPrice(listing: Listing | null) {
  if (!listing) return null;

  if (listing.pricePerNight !== undefined) {
    return {
      amount: listing.pricePerNight,
      suffix: "/night",
    };
  }

  if (listing.pricePerMonth !== undefined) {
    return {
      amount: listing.pricePerMonth,
      suffix: "/month",
    };
  }

  if (listing.price !== undefined) {
    return {
      amount: listing.price,
      suffix: "",
    };
  }

  return null;
}

function fmt(date: string) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return parsedDate.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(date: string) {
  const timestamp = new Date(date).getTime();

  if (Number.isNaN(timestamp)) {
    return "Unknown";
  }

  const diff = Date.now() - timestamp;

  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor(diff / 60_000);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (mins > 0) return `${mins}m ago`;

  return "Just now";
}

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    bg: "bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: "⏳",
  },

  approved: {
    label: "Approved",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    border: "border-emerald-200",
    icon: "✓",
  },

  rejected: {
    label: "Declined",
    bg: "bg-red-100",
    text: "text-red-600",
    border: "border-red-200",
    icon: "✕",
  },
};

function StatusBadge({
  status,
}: {
  status: ViewingRequest["status"];
}) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${config.bg} ${config.text} ${config.border}`}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GuestViewingRequestsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [requests, setRequests] = useState<ViewingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] =
    useState<FilterTab>("all");
  const [cancelling, setCancelling] =
    useState<string | null>(null);
  const [expanded, setExpanded] =
    useState<string | null>(null);

  const userId = (
    session?.user as { id?: string }
  )?.id;

  // ─── Authentication ────────────────────────────────────────────────────────

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  // ─── Fetch viewing requests ────────────────────────────────────────────────

  const loadRequests = async () => {
    if (!userId) return;

    setLoading(true);

    try {
      const response = await fetch(
        `/api/viewing-request?userId=${encodeURIComponent(
          userId
        )}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to load viewing requests."
        );
      }

      const data = await response.json();

      if (!data.success && !Array.isArray(data.data)) {
        throw new Error(
          data.message ||
            "Failed to load viewing requests."
        );
      }

      setRequests(
        Array.isArray(data.data) ? data.data : []
      );
    } catch (error) {
      console.error(
        "Viewing request loading error:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load viewing requests."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      status === "authenticated" &&
      userId
    ) {
      loadRequests();
    }
  }, [status, userId]);

  // ─── Cancel viewing request ────────────────────────────────────────────────

  const handleCancel = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to cancel this viewing request?"
    );

    if (!confirmed) return;

    setCancelling(id);

    try {
      const response = await fetch(
        `/api/viewing-request/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Failed to cancel viewing request."
        );
      }

      setRequests((previous) =>
        previous.filter(
          (request) => request._id !== id
        )
      );

      toast.success(
        "Viewing request cancelled."
      );
    } catch (error) {
      console.error(
        "Cancel viewing request error:",
        error
      );

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to cancel request."
      );
    } finally {
      setCancelling(null);
    }
  };

  // ─── Counts ────────────────────────────────────────────────────────────────

  const counts = {
    all: requests.length,

    pending: requests.filter(
      (request) => request.status === "pending"
    ).length,

    approved: requests.filter(
      (request) => request.status === "approved"
    ).length,

    rejected: requests.filter(
      (request) => request.status === "rejected"
    ).length,
  };

  const filtered =
    activeTab === "all"
      ? requests
      : requests.filter(
          (request) =>
            request.status === activeTab
        );

  const tabs: {
    key: FilterTab;
    label: string;
  }[] = [
    {
      key: "all",
      label: `All (${counts.all})`,
    },
    {
      key: "pending",
      label: `Pending (${counts.pending})`,
    },
    {
      key: "approved",
      label: `Approved (${counts.approved})`,
    },
    {
      key: "rejected",
      label: `Declined (${counts.rejected})`,
    },
  ];

  // ─── Authentication Loading ───────────────────────────────────────────────

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />

        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-[#7A1B0F] rounded-full animate-spin" />

          <p className="mt-4 text-sm text-gray-500">
            Loading your viewing requests...
          </p>
        </div>

        <Footer />
      </div>
    );
  }

  // ─── Page ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            borderRadius: "10px",
            background: "#1e293b",
            color: "#f8fafc",
            fontSize: "14px",
          },

          success: {
            iconTheme: {
              primary: "#7A1B0F",
              secondary: "#fff",
            },
          },

          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#fff",
            },
          },
        }}
      />

      <Navbar />

      {/* Header */}
      <section className="bg-[#7A1B0F] py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm font-semibold text-white/70 mb-2">
            JluvStays
          </p>

          <h1 className="text-3xl font-bold text-white mb-1">
            Viewing Requests
          </h1>

          <p className="text-white/80 text-sm">
            Track and manage your property viewing
            requests.
          </p>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-4 py-8">

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
          {[
            {
              label: "Pending",
              value: counts.pending,
              bg: "bg-amber-50",
              text: "text-amber-600",
              border: "border-amber-100",
            },

            {
              label: "Approved",
              value: counts.approved,
              bg: "bg-emerald-50",
              text: "text-emerald-600",
              border: "border-emerald-100",
            },

            {
              label: "Declined",
              value: counts.rejected,
              bg: "bg-red-50",
              text: "text-red-500",
              border: "border-red-100",
            },
          ].map((card) => (
            <div
              key={card.label}
              className={`${card.bg} border ${card.border} rounded-2xl p-4 text-center`}
            >
              <p
                className={`text-2xl font-bold ${card.text}`}
              >
                {card.value}
              </p>

              <p className="text-sm text-gray-500 mt-0.5">
                {card.label}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-100 rounded-xl p-1 w-fit shadow-sm mb-6 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() =>
                setActiveTab(tab.key)
              }
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? "bg-[#7A1B0F] text-white shadow"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse flex gap-4"
              >
                <div className="w-24 h-24 bg-gray-200 rounded-xl shrink-0" />

                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-5xl mb-4">
              👁️
            </p>

            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {activeTab === "all"
                ? "No viewing requests yet"
                : `No ${activeTab} requests`}
            </h3>

            <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
              {activeTab === "all"
                ? "Browse available properties and request a viewing before making a booking."
                : `You don't have any ${activeTab} viewing requests.`}
            </p>

            {activeTab === "all" && (
              <Link
                href="/listings"
                className="inline-block px-6 py-2.5 bg-[#7A1B0F] text-white rounded-xl text-sm font-semibold hover:bg-[#64160C] transition"
              >
                Browse Available Stays
              </Link>
            )}
          </div>
        )}

        {/* Viewing Request List */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-4">
            {filtered.map((request) => {
              const listing = getListing(request);

              const listingName =
                getListingName(listing);

              const listingImage =
                getListingImage(listing);

              const listingType =
                getListingType(listing);

              const price =
                getListingPrice(listing);

              const isExpanded =
                expanded === request._id;

              const isPending =
                request.status === "pending";

              const isFuture =
                new Date(request.preferredDate) >
                new Date();

              return (
                <article
                  key={request._id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition duration-200"
                >
                  <div className="flex flex-col sm:flex-row">

                    {/* Property Image */}
                    <div className="relative w-full sm:w-32 h-44 sm:h-auto shrink-0 bg-gray-100">
                      <Image
                        src={listingImage}
                        alt={listingName}
                        fill
                        sizes="128px"
                        className="object-cover"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-5">

                      {/* Property / Status */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                        <div>
                          <h3 className="font-bold text-gray-900">
                            {listingName}
                          </h3>

                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <p className="text-xs text-gray-400 capitalize">
                              {listingType}
                            </p>

                            {price && (
                              <>
                                <span className="text-gray-300">
                                  •
                                </span>

                                <p className="text-xs text-[#7A1B0F] font-medium">
                                  Ksh{" "}
                                  {price.amount.toLocaleString(
                                    "en-KE"
                                  )}
                                  {price.suffix}
                                </p>
                              </>
                            )}
                          </div>
                        </div>

                        <StatusBadge
                          status={request.status}
                        />
                      </div>

                      {/* Date Information */}
                      <div className="flex flex-wrap gap-3 mb-4">

                        <div className="bg-gray-50 rounded-xl px-4 py-2.5 text-center">
                          <p className="text-xs text-gray-400 mb-0.5">
                            Preferred Date
                          </p>

                          <p className="text-sm font-semibold text-gray-800">
                            {fmt(
                              request.preferredDate
                            )}
                          </p>
                        </div>

                        <div className="bg-[#D2CFCD]/30 rounded-xl px-4 py-2.5 text-center">
                          <p className="text-xs text-gray-500 mb-0.5">
                            Submitted
                          </p>

                          <p className="text-sm font-semibold text-gray-800">
                            {timeAgo(
                              request.createdAt
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Status Message */}
                      {request.status ===
                        "approved" && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 mb-3">
                          <p className="text-xs text-emerald-700 font-medium">
                            Your viewing has been
                            approved! Our team
                            will contact you to
                            confirm the viewing
                            details.
                          </p>
                        </div>
                      )}

                      {request.status ===
                        "rejected" && (
                        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 mb-3">
                          <p className="text-xs text-red-600 font-medium">
                            This viewing request
                            was declined. You can
                            request a different
                            date or browse other
                            available properties.
                          </p>
                        </div>
                      )}

                      {request.status ===
                        "pending" && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 mb-3">
                          <p className="text-xs text-amber-700 font-medium">
                            ⏳ Your request is
                            under review. We will
                            notify you once it has
                            been reviewed.
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-wrap">

                        {listing?._id && (
                          <Link
                            href={`/listings/${listing._id}`}
                            className="px-4 py-2 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition font-medium"
                          >
                            View Property
                          </Link>
                        )}

                        {request.message && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpanded(
                                isExpanded
                                  ? null
                                  : request._id
                              )
                            }
                            className="px-4 py-2 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition font-medium flex items-center gap-1.5"
                          >
                            {isExpanded
                              ? "Hide"
                              : "View"}{" "}
                            Message

                            <svg
                              className={`w-3.5 h-3.5 transition-transform ${
                                isExpanded
                                  ? "rotate-180"
                                  : ""
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>
                        )}

                        {isPending &&
                          isFuture && (
                            <button
                              type="button"
                              onClick={() =>
                                handleCancel(
                                  request._id
                                )
                              }
                              disabled={
                                cancelling ===
                                request._id
                              }
                              className="px-4 py-2 text-sm border border-red-200 text-red-500 hover:bg-red-50 rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed sm:ml-auto"
                            >
                              {cancelling ===
                              request._id
                                ? "Cancelling..."
                                : "Cancel Request"}
                            </button>
                          )}

                        {request.status ===
                          "rejected" && (
                          <Link
                            href="/listings"
                            className="px-4 py-2 text-sm bg-[#7A1B0F] hover:bg-[#64160C] text-white rounded-lg transition font-medium sm:ml-auto"
                          >
                            Browse Other Stays
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Message */}
                  {isExpanded &&
                    request.message && (
                      <div className="px-5 pb-5 border-t border-gray-50 pt-4">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                          Your message
                        </p>

                        <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-4 py-3 leading-relaxed">
                          {request.message}
                        </p>
                      </div>
                    )}
                </article>
              );
            })}
          </div>
        )}

        {/* Browse More */}
        {!loading && requests.length > 0 && (
          <div className="mt-8 text-center">
            <Link
              href="/listings"
              className="inline-block px-6 py-2.5 border-2 border-[#7A1B0F] text-[#7A1B0F] font-semibold rounded-xl hover:bg-[#7A1B0F] hover:text-white transition text-sm"
            >
              Browse More Stays
            </Link>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}