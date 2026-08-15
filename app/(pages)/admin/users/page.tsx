"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";

type UserRole = "admin" | "staff" | "tenant" | "guest";

type StaffPosition =
  | "Property Manager"
  | "Receptionist"
  | "Caretaker"
  | "Accountant"
  | "Security"
  | "Maintenance"
  | string;

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role?: UserRole;
  status?: "active" | "suspended";
  photo?: string;
  createdAt?: string;
}

interface StaffProfile {
  _id: string;
  user?: {
    _id?: string;
    name?: string;
    email?: string;
    photo?: string;
  };
  employeeNumber?: string;
  position?: StaffPosition;
  department?: string;
  isActive?: boolean;
}

type DrawerMode = "edit" | "add" | null;
type FilterTab = "all" | "admin" | "staff" | "tenant" | "guest";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  staff: "Staff",
  tenant: "Tenant",
  guest: "Guest",
};

const STAFF_POSITIONS = [
  "Property Manager",
  "Receptionist",
  "Caretaker",
  "Accountant",
  "Security",
  "Maintenance",
] as const;

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "admin", label: "Admin" },
  { key: "staff", label: "Staff" },
  { key: "tenant", label: "Tenant" },
  { key: "guest", label: "Guest" },
];

const DEFAULT_FORM: Omit<User, "_id" | "createdAt"> = {
  name: "",
  email: "",
  phone: "",
  role: "guest",
  status: "active",
  photo: "",
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-[#7A1B0F]/10 text-[#7A1B0F] border border-[#7A1B0F]/20",
  staff: "bg-[#7A1B0F]/10 text-[#7A1B0F] border border-[#7A1B0F]/20",
  tenant: "bg-slate-100 text-black border border-slate-200",
  guest: "bg-slate-100 text-black border border-slate-200",
};

function getStaffPosition(
  user: User,
  staffProfiles: StaffProfile[]
): string | null {
  if (user.role !== "staff") return null;

  const profile = staffProfiles.find(
    (staff) =>
      staff.user?._id === user._id ||
      staff.user?.email?.toLowerCase() === user.email?.toLowerCase()
  );

  return profile?.position || null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [staffPosition, setStaffPosition] = useState("all");

  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);

  const [formData, setFormData] =
    useState<Omit<User, "_id" | "createdAt">>(DEFAULT_FORM);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const [total, setTotal] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function showToast(
    msg: string,
    type: "success" | "error" = "success"
  ) {
    setToast({ msg, type });

    setTimeout(() => {
      setToast(null);
    }, 3000);
  }

  const fetchUsers = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      params.set("limit", "100");

      if (activeTab !== "all") {
        params.set("role", activeTab);
      }

      if (search.trim()) {
        params.set("search", search.trim());
      }

      const [usersRes, staffRes] = await Promise.all([
        fetch(`/api/users?${params.toString()}`),
        fetch("/api/staff"),
      ]);

      const usersData = await usersRes.json();
      const staffData = await staffRes.json().catch(() => ({}));

      if (!usersRes.ok || !usersData.success) {
        showToast("Failed to load users", "error");
        return;
      }

      setUsers(usersData.data ?? []);
      setTotal(usersData.total ?? usersData.data?.length ?? 0);

      if (staffRes.ok) {
        setStaffProfiles(staffData.data ?? []);
      } else {
        setStaffProfiles([]);
      }
    } catch {
      showToast("Failed to load users", "error");
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  useEffect(() => {
    const delay = setTimeout(fetchUsers, 300);

    return () => clearTimeout(delay);
  }, [fetchUsers]);

  function openAdd() {
    setFormData(DEFAULT_FORM);
    setPhotoPreview(null);
    setEditingId(null);
    setDrawerMode("add");
  }

  function openEdit(user: User) {
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      role: user.role || "guest",
      status: user.status || "active",
      photo: user.photo || "",
    });

    setPhotoPreview(user.photo || null);
    setEditingId(user._id);
    setDrawerMode("edit");
  }

  function closeDrawer() {
    setDrawerMode(null);
    setEditingId(null);
    setPhotoPreview(null);
  }

  function handlePhotoChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = (ev) => {
      const result = ev.target?.result as string;

      setPhotoPreview(result);

      setFormData((f) => ({
        ...f,
        photo: result,
      }));
    };

    reader.readAsDataURL(file);
  }

  async function saveUser() {
    if (!formData.name.trim() || !formData.email.trim()) {
      showToast("Name and email are required", "error");
      return;
    }

    setSaving(true);

    try {
      const endpoint =
        drawerMode === "add"
          ? "/api/users"
          : editingId
            ? `/api/users/${editingId}`
            : null;

      if (!endpoint) return;

      const response = await fetch(endpoint, {
        method: drawerMode === "add" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));

        throw new Error(
          data.message || "Something went wrong"
        );
      }

      showToast(
        drawerMode === "add"
          ? "User added successfully"
          : "User updated successfully"
      );

      closeDrawer();

      fetchUsers();
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Something went wrong",
        "error"
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(id: string) {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      showToast("User deleted");

      fetchUsers();
    } catch {
      showToast("Delete failed", "error");
    } finally {
      setConfirmDelete(null);
    }
  }

  async function toggleStatus(user: User) {
    const newStatus =
      user.status === "active" ? "suspended" : "active";

    try {
      const response = await fetch(`/api/users/${user._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Status update failed");
      }

      showToast(
        `Account ${
          newStatus === "active"
            ? "activated"
            : "suspended"
        }`
      );

      fetchUsers();
    } catch {
      showToast("Status update failed", "error");
    }
  }

  const drawerOpen = drawerMode !== null;

  const visibleUsers = users.filter((user) => {
    if (activeTab === "staff" && staffPosition !== "all") {
      const position = getStaffPosition(
        user,
        staffProfiles
      );

      if (position !== staffPosition) {
        return false;
      }
    }

    return true;
  });

  const staffCounts = STAFF_POSITIONS.reduce(
    (acc, position) => {
      acc[position] = users.filter(
        (user) =>
          user.role === "staff" &&
          getStaffPosition(
            user,
            staffProfiles
          ) === position
      ).length;

      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-black">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
            toast.type === "success"
              ? "bg-emerald-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 text-red-600">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>

            <div className="text-center">
              <h3 className="font-bold text-black mb-1">
                Delete user?
              </h3>

              <p className="text-sm text-slate-600 mb-6">
                This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() =>
                  setConfirmDelete(null)
                }
                className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-xl text-black hover:bg-slate-50 transition"
              >
                Cancel
              </button>

              <button
                onClick={() =>
                  deleteUser(confirmDelete)
                }
                className="flex-1 px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="flex-1 bg-black/30 backdrop-blur-sm"
            onClick={closeDrawer}
          />

          <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-black">
                  {drawerMode === "add"
                    ? "Add New User"
                    : "Edit User"}
                </h2>

                <p className="text-xs text-slate-600 mt-0.5">
                  Manage account information and access level
                </p>
              </div>

              <button
                onClick={closeDrawer}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition text-black"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
              {/* Photo */}
              <div className="flex flex-col items-center gap-3">
                <div
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="relative w-20 h-20 rounded-full cursor-pointer group overflow-hidden border-2 border-dashed border-slate-200 hover:border-[#7A1B0F] transition"
                >
                  {photoPreview ? (
                    <Image
                      src={photoPreview}
                      alt="Preview"
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50">
                      <svg
                        className="w-7 h-7 text-black"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0118.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />

                <p className="text-xs text-slate-600">
                  Click to upload photo
                </p>
              </div>

              {/* Text fields */}
              {[
                {
                  label: "Full Name",
                  key: "name",
                  type: "text",
                  placeholder: "Jane Doe",
                },
                {
                  label: "Email Address",
                  key: "email",
                  type: "email",
                  placeholder: "jane@example.com",
                },
                {
                  label: "Phone Number",
                  key: "phone",
                  type: "tel",
                  placeholder: "+254 700 000 000",
                },
              ].map(
                ({
                  label,
                  key,
                  type,
                  placeholder,
                }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-black mb-1.5">
                      {label}
                    </label>

                    <input
                      type={type}
                      placeholder={placeholder}
                      value={
                        (
                          formData as Record<
                            string,
                            string
                          >
                        )[key] || ""
                      }
                      onChange={(e) =>
                        setFormData((f) => ({
                          ...f,
                          [key]: e.target.value,
                        }))
                      }
                      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-black placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] focus:border-transparent transition"
                    />
                  </div>
                )
              )}

              {/* Access Role */}
              <div>
                <label className="block text-xs font-semibold text-black mb-1.5">
                  Access Role
                </label>

                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      role: e.target.value as UserRole,
                    }))
                  }
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] focus:border-transparent transition bg-white"
                >
                  <option value="admin">
                    Admin
                  </option>

                  {/* <option value="staff">
                    Staff
                  </option> */}

                  <option value="tenant">
                    Tenant
                  </option>

                  <option value="guest">
                    Guest
                  </option>
                </select>

                <p className="text-xs text-slate-600 mt-1.5">
                  Choose the level of access for this account.
                </p>
              </div>

              {/* Account status */}
              <div>
                <label className="block text-xs font-semibold text-black mb-2">
                  Account Status
                </label>

                <div className="flex gap-2">
                  {(
                    ["active", "suspended"] as const
                  ).map((status) => (
                    <button
                      key={status}
                      onClick={() =>
                        setFormData((f) => ({
                          ...f,
                          status,
                        }))
                      }
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition ${
                        formData.status === status
                          ? status === "active"
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "bg-red-600 border-red-600 text-white"
                          : "border-slate-200 text-black hover:bg-slate-50"
                      }`}
                    >
                      {status.charAt(0).toUpperCase() +
                        status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
              <button
                onClick={closeDrawer}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-black border border-slate-200 rounded-xl hover:bg-slate-50 transition"
              >
                Cancel
              </button>

              <button
                onClick={saveUser}
                disabled={saving}
                className="flex-1 px-4 py-2.5 text-sm font-semibold bg-[#7A1B0F] hover:bg-[#64160C] disabled:opacity-60 text-white rounded-xl transition"
              >
                {saving
                  ? "Saving…"
                  : drawerMode === "add"
                    ? "Add User"
                    : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Page */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-black">
              Users
            </h1>

            <p className="text-sm text-slate-600 mt-0.5">
              Manage users, access roles and account status
            </p>
          </div>

          <button
            onClick={openAdd}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7A1B0F] hover:bg-[#64160C] text-white text-sm font-semibold rounded-xl transition shadow-sm"
          >
            <svg
              width="16"
              height="16"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path d="M12 5v14M5 12h14" />
            </svg>

            Add User
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black">
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle
                    cx="11"
                    cy="11"
                    r="8"
                  />

                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </span>

              <input
                type="text"
                placeholder="Search by name, email or phone..."
                className="w-full pl-9 pr-3 py-2.5 text-sm text-black border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] focus:border-transparent transition"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />
            </div>

            {/* Role filters */}
            <div className="flex gap-2 flex-wrap">
              {FILTER_TABS.map(
                ({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setActiveTab(key);

                      if (key !== "staff") {
                        setStaffPosition("all");
                      }
                    }}
                    className={`px-3.5 py-2.5 rounded-xl text-sm font-semibold border transition ${
                      activeTab === key
                        ? "bg-[#7A1B0F] border-[#7A1B0F] text-white shadow-sm"
                        : "border-slate-200 bg-white text-black hover:border-[#7A1B0F] hover:text-[#7A1B0F]"
                    }`}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Staff filters */}
          {activeTab === "staff" && (
            <div className="border-t border-slate-100 pt-4">
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-sm font-semibold text-black">
                    Staff Categories
                  </p>

                  <p className="text-xs text-slate-600 mt-0.5">
                    Filter staff by their job title.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      setStaffPosition("all")
                    }
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                      staffPosition === "all"
                        ? "bg-[#7A1B0F] border-[#7A1B0F] text-white"
                        : "border-slate-200 bg-white text-black hover:border-[#7A1B0F] hover:text-[#7A1B0F]"
                    }`}
                  >
                    All Staff
                  </button>

                  {STAFF_POSITIONS.map(
                    (position) => (
                      <button
                        key={position}
                        onClick={() =>
                          setStaffPosition(position)
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                          staffPosition === position
                            ? "bg-[#7A1B0F] border-[#7A1B0F] text-white"
                            : "bg-[#7A1B0F]/10 border-transparent text-[#7A1B0F] hover:bg-[#7A1B0F]/20"
                        }`}
                      >
                        {position}

                        <span className="ml-1.5 opacity-70">
                          {staffCounts[position] ?? 0}
                        </span>
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 5 }).map(
                (_, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[minmax(280px,2fr)_minmax(150px,1fr)_120px_120px_120px] gap-6 items-center px-6 py-4 animate-pulse"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 bg-slate-200 rounded-full flex-shrink-0" />

                      <div className="space-y-2">
                        <div className="h-3.5 bg-slate-200 rounded w-32" />
                        <div className="h-3 bg-slate-100 rounded w-48" />
                      </div>
                    </div>

                    <div className="h-3 bg-slate-100 rounded w-28" />

                    <div className="h-6 bg-slate-100 rounded-full w-20 mx-auto" />

                    <div className="h-6 bg-slate-100 rounded-full w-20 mx-auto" />

                    <div className="h-8 bg-slate-100 rounded-lg w-24 ml-auto" />
                  </div>
                )
              )}
            </div>
          ) : visibleUsers.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-black">
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.8}
                >
                  <circle
                    cx="12"
                    cy="8"
                    r="4"
                  />

                  <path d="M4 20v-1a6 6 0 016-6h4a6 6 0 016 6v1" />
                </svg>
              </div>

              <p className="text-black font-semibold">
                No users found
              </p>

              <p className="text-slate-600 text-sm mt-1">
                {activeTab === "staff" &&
                staffPosition !== "all"
                  ? `No staff members found in ${staffPosition}.`
                  : "Try adjusting your search or filters."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <div className="min-w-[900px]">
                  {/* Header */}
                  <div className="grid grid-cols-[minmax(280px,2fr)_minmax(150px,1fr)_120px_120px_120px] gap-6 items-center px-6 py-4 bg-slate-50 border-b border-slate-200">
                    <div className="text-[11px] font-bold text-black uppercase tracking-wider">
                      User
                    </div>

                    <div className="text-[11px] font-bold text-black uppercase tracking-wider">
                      Phone
                    </div>

                    <div className="text-[11px] font-bold text-black uppercase tracking-wider text-center">
                      Role
                    </div>

                    <div className="text-[11px] font-bold text-black uppercase tracking-wider text-center">
                      Status
                    </div>

                    <div className="text-[11px] font-bold text-black uppercase tracking-wider text-right">
                      Actions
                    </div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-slate-100">
                    {visibleUsers.map((user) => {
                      const role = user.role ?? "guest";

                      return (
                        <div
                          key={user._id}
                          className="grid grid-cols-[minmax(280px,2fr)_minmax(150px,1fr)_120px_120px_120px] gap-6 items-center px-6 py-4 hover:bg-[#7A1B0F]/[0.025] transition-colors duration-150"
                        >
                          {/* User */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-slate-100 border border-slate-200">
                              <Image
                                src={
                                  user.photo?.trim()
                                    ? user.photo
                                    : "/avatar.png"
                                }
                                alt={user.name}
                                fill
                                sizes="44px"
                                className="object-cover"
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-black truncate">
                                {user.name}
                              </p>

                              <p className="text-xs text-slate-600 mt-1 truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>

                          {/* Phone */}
                          <div className="min-w-0">
                            <p className="text-sm text-black truncate">
                              {user.phone || "—"}
                            </p>
                          </div>

                          {/* Role */}
                          <div className="flex justify-center">
                            <span
                              className={`inline-flex items-center justify-center min-w-[76px] px-3 py-1.5 rounded-full text-[11px] font-bold ${
                                ROLE_COLORS[role]
                              }`}
                            >
                              {ROLE_LABELS[role]}
                            </span>
                          </div>

                          {/* Status */}
                          <div className="flex justify-center">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold ${
                                user.status ===
                                "suspended"
                                  ? "bg-red-50 text-red-700 border border-red-200"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  user.status ===
                                  "suspended"
                                    ? "bg-red-600"
                                    : "bg-emerald-600"
                                }`}
                              />

                              {user.status ===
                              "suspended"
                                ? "Suspended"
                                : "Active"}
                            </span>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-end gap-1">
                            {/* Edit */}
                            <button
                              onClick={() =>
                                openEdit(user)
                              }
                              title="Edit user"
                              className="w-9 h-9 flex items-center justify-center rounded-lg text-black hover:text-[#7A1B0F] hover:bg-[#7A1B0F]/10 transition"
                            >
                              <svg
                                width="15"
                                height="15"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />

                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </button>

                            {/* Toggle status */}
                            <button
                              onClick={() =>
                                toggleStatus(user)
                              }
                              title={
                                user.status ===
                                "active"
                                  ? "Suspend account"
                                  : "Activate account"
                              }
                              className={`w-9 h-9 flex items-center justify-center rounded-lg transition ${
                                user.status ===
                                "active"
                                  ? "text-black hover:text-amber-600 hover:bg-amber-50"
                                  : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              }`}
                            >
                              {user.status ===
                              "active" ? (
                                <svg
                                  width="15"
                                  height="15"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <circle
                                    cx="12"
                                    cy="12"
                                    r="9"
                                  />

                                  <path d="M5.5 5.5l13 13" />
                                </svg>
                              ) : (
                                <svg
                                  width="15"
                                  height="15"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path d="M20 6L9 17l-5-5" />
                                </svg>
                              )}
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() =>
                                setConfirmDelete(
                                  user._id
                                )
                              }
                              title="Delete user"
                              className="w-9 h-9 flex items-center justify-center rounded-lg text-black hover:text-red-600 hover:bg-red-50 transition"
                            >
                              <svg
                                width="15"
                                height="15"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <polyline points="3 6 5 6 21 6" />

                                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />

                                <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Mobile */}
              <div className="md:hidden divide-y divide-slate-100">
                {visibleUsers.map((user) => {
                  const role = user.role ?? "guest";

                  return (
                    <div
                      key={user._id}
                      className="p-4 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative w-11 h-11 rounded-full overflow-hidden flex-shrink-0 bg-slate-100 border border-slate-200">
                          <Image
                            src={
                              user.photo?.trim()
                                ? user.photo
                                : "/avatar.png"
                            }
                            alt={user.name}
                            fill
                            sizes="44px"
                            className="object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-black truncate">
                            {user.name}
                          </p>

                          <p className="text-xs text-slate-600 truncate mt-0.5">
                            {user.email}
                          </p>

                          <p className="text-xs text-slate-600 mt-1">
                            {user.phone ||
                              "No phone number"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-bold ${
                              ROLE_COLORS[role]
                            }`}
                          >
                            {ROLE_LABELS[role]}
                          </span>

                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold ${
                              user.status ===
                              "suspended"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                user.status ===
                                "suspended"
                                  ? "bg-red-600"
                                  : "bg-emerald-600"
                              }`}
                            />

                            {user.status ===
                            "suspended"
                              ? "Suspended"
                              : "Active"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Edit */}
                          <button
                            onClick={() =>
                              openEdit(user)
                            }
                            title="Edit user"
                            className="w-9 h-9 flex items-center justify-center rounded-lg text-black hover:text-[#7A1B0F] hover:bg-[#7A1B0F]/10 transition"
                          >
                            <svg
                              width="15"
                              height="15"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />

                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>

                          {/* Toggle */}
                          <button
                            onClick={() =>
                              toggleStatus(user)
                            }
                            title={
                              user.status ===
                              "active"
                                ? "Suspend account"
                                : "Activate account"
                            }
                            className={`w-9 h-9 flex items-center justify-center rounded-lg transition ${
                              user.status ===
                              "active"
                                ? "text-black hover:text-amber-600 hover:bg-amber-50"
                                : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            }`}
                          >
                            {user.status ===
                            "active" ? (
                              <svg
                                width="15"
                                height="15"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="9"
                                />

                                <path d="M5.5 5.5l13 13" />
                              </svg>
                            ) : (
                              <svg
                                width="15"
                                height="15"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            )}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() =>
                              setConfirmDelete(
                                user._id
                              )
                            }
                            title="Delete user"
                            className="w-9 h-9 flex items-center justify-center rounded-lg text-black hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <svg
                              width="15"
                              height="15"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <polyline points="3 6 5 6 21 6" />

                              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />

                              <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
                <p className="text-xs font-medium text-black">
                  Showing{" "}
                  <span className="font-bold text-[#7A1B0F]">
                    {visibleUsers.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-bold">
                    {total}
                  </span>{" "}
                  users
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}