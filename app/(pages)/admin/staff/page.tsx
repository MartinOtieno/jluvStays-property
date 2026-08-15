"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface StaffUser {
  _id: string;
  name: string;
  email: string;
  photo?: string;
}

interface StaffMember {
  _id: string;
  user: StaffUser;
  employeeNumber: string;
  position: string;
  department: string;
  hireDate?: string;
  salary?: number | string;
  isActive: boolean;
  order?: number;
}

interface UserOption {
  _id: string;
  name: string;
  email: string;
}

type ModalMode = "add" | "edit" | null;

interface StaffForm {
  userId: string;
  employeeNumber: string;
  position: string;
  department: string;
  hireDate: string;
  salary: string;
  order: string;
  isActive: boolean;
}

const EMPTY_FORM: StaffForm = {
  userId: "",
  employeeNumber: "",
  position: "",
  department: "",
  hireDate: "",
  salary: "",
  order: "0",
  isActive: true,
};

const COMMON_POSITIONS = [
  "Property Manager",
  "Receptionist",
  "Caretaker",
  "Accountant",
  "Security",
  "Maintenance",
];

const POSITION_PALETTE = [
  "bg-[#7A1B0F]/10 text-[#7A1B0F]",
  "bg-blue-50 text-blue-700",
  "bg-violet-50 text-violet-700",
  "bg-amber-50 text-amber-700",
  "bg-emerald-50 text-emerald-700",
  "bg-slate-100 text-slate-700",
];

function positionColor(position: string): string {
  if (!position) {
    return "bg-slate-100 text-slate-600";
  }

  const sum = position
    .split("")
    .reduce(
      (acc, character) =>
        acc + character.charCodeAt(0),
      0
    );

  return POSITION_PALETTE[
    sum % POSITION_PALETTE.length
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────────

const Icons = {
  Plus: () => (
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
  ),

  Edit: () => (
    <svg
      width="14"
      height="14"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),

  Trash: () => (
    <svg
      width="14"
      height="14"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
    </svg>
  ),

  Ban: () => (
    <svg
      width="14"
      height="14"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="12" cy="12" r="10" />
      <line
        x1="4.93"
        y1="4.93"
        x2="19.07"
        y2="19.07"
      />
    </svg>
  ),

  Check: () => (
    <svg
      width="14"
      height="14"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),

  Close: () => (
    <svg
      width="18"
      height="18"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),

  Search: () => (
    <svg
      width="16"
      height="16"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),

  Staff: () => (
    <svg
      width="20"
      height="20"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20v-1a6 6 0 016-6h4a6 6 0 016 6v1" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),

  Key: () => (
    <svg
      width="14"
      height="14"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
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

  Building: () => (
    <svg
      width="14"
      height="14"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M3 21h18M6 21V4a1 1 0 011-1h10a1 1 0 011 1v17M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" />
    </svg>
  ),
};

// ─────────────────────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────────────────────

function Avatar({
  name,
  photo,
  size = 40,
}: {
  name: string;
  photo?: string;
  size?: number;
}) {
  const safeName = name?.trim() || "?";

  const initials =
    safeName === "?"
      ? "?"
      : safeName
          .split(" ")
          .filter(Boolean)
          .map((word) => word[0])
          .slice(0, 2)
          .join("")
          .toUpperCase();

  const colors = [
    "bg-[#7A1B0F]",
    "bg-[#64160C]",
    "bg-[#8F2A1C]",
    "bg-[#5F150B]",
    "bg-[#A33A2A]",
    "bg-[#6E1A10]",
  ];

  const color =
    colors[
      (safeName.charCodeAt(0) || 0) %
        colors.length
    ];

  const hasPhoto =
    photo &&
    photo.trim() !== "" &&
    photo !== "/avatar.png";

  if (hasPhoto) {
    return (
      <Image
        src={photo}
        alt={safeName}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0 ring-2 ring-white shadow-sm"
        style={{
          width: size,
          height: size,
        }}
        sizes={`${size}px`}
      />
    );
  }

  return (
    <div
      className={`${color} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ring-2 ring-white shadow-sm`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
      }}
    >
      {initials}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Staff Modal
// ─────────────────────────────────────────────────────────────────────────────

function StaffModal({
  mode,
  member,
  users,
  onClose,
  onSave,
}: {
  mode: ModalMode;
  member: StaffMember | null;
  users: UserOption[];
  onClose: () => void;
  onSave: () => void;
}) {
  const isEdit = mode === "edit";

  const [form, setForm] =
    useState<StaffForm>(
      isEdit && member
        ? {
            userId:
              member.user?._id ?? "",
            employeeNumber:
              member.employeeNumber ?? "",
            position:
              member.position ?? "",
            department:
              member.department ?? "",
            hireDate:
              member.hireDate ?? "",
            salary:
              member.salary != null
                ? String(member.salary)
                : "",
            order:
              member.order != null
                ? String(member.order)
                : "0",
            isActive:
              member.isActive,
          }
        : EMPTY_FORM
    );

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const firstRef =
    useRef<HTMLSelectElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  function setField<K extends keyof StaffForm>(
    field: K,
    value: StaffForm[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  const handleChange =
    (
      field: keyof Pick<
        StaffForm,
        | "userId"
        | "employeeNumber"
        | "position"
        | "department"
        | "hireDate"
        | "salary"
        | "order"
      >
    ) =>
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement
      >
    ) => {
      setField(
        field,
        event.target.value as StaffForm[typeof field]
      );
    };

  async function handleSubmit() {
    if (
      !form.userId ||
      !form.employeeNumber ||
      !form.position.trim()
    ) {
      setError(
        "User, employee number and position are required."
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url = isEdit
        ? `/api/staff/${member!._id}`
        : "/api/staff";

      const method = isEdit
        ? "PUT"
        : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          ...form,
          position:
            form.position.trim(),
          salary: form.salary
            ? Number(form.salary)
            : undefined,
          order: Number(form.order),
        }),
      });

      if (!response.ok) {
        const data =
          await response.json();

        throw new Error(
          data.message ??
            "Something went wrong"
        );
      }

      onSave();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to save"
      );
    } finally {
      setSaving(false);
    }
  }

  const Label = ({
    children,
  }: {
    children: React.ReactNode;
  }) => (
    <label className="block text-xs font-semibold text-black mb-1.5">
      {children}
    </label>
  );

  const inputCls =
    "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-black bg-white focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] focus:border-transparent";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-black">
              {isEdit
                ? "Edit Staff Member"
                : "Add Staff Member"}
            </h2>

            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit
                ? "Update staff information"
                : "Add a new member to your team"}
            </p>
          </div>

          <button
            onClick={onClose}
            className="text-slate-500 hover:text-black p-1 rounded-lg hover:bg-slate-100"
          >
            <Icons.Close />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
              {error}
            </p>
          )}

          <div>
            <Label>Assign to User</Label>

            <div className="relative">
              <select
                ref={firstRef}
                value={form.userId}
                onChange={handleChange(
                  "userId"
                )}
                disabled={isEdit}
                className={`${inputCls} appearance-none pr-8 disabled:bg-slate-50`}
              >
                <option value="">
                  Select a user…
                </option>

                {users.map((user) => (
                  <option
                    key={user._id}
                    value={user._id}
                  >
                    {user.name} —{" "}
                    {user.email}
                  </option>
                ))}
              </select>

              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                <Icons.ChevronDown />
              </span>
            </div>

            {isEdit && (
              <p className="text-xs text-slate-500 mt-1">
                User cannot be changed when
                editing.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>
                Employee Number
              </Label>

              <input
                value={form.employeeNumber}
                onChange={handleChange(
                  "employeeNumber"
                )}
                placeholder="EMP-001"
                className={inputCls}
              />
            </div>

            <div>
              <Label>
                Position / Job Title
              </Label>

              <input
                value={form.position}
                onChange={handleChange(
                  "position"
                )}
                placeholder="e.g. Property Manager"
                list="position-suggestions"
                className={inputCls}
              />

              <datalist id="position-suggestions">
                {COMMON_POSITIONS.map(
                  (position) => (
                    <option
                      key={position}
                      value={position}
                    />
                  )
                )}
              </datalist>
            </div>

            <div>
              <Label>Department</Label>

              <input
                value={form.department}
                onChange={handleChange(
                  "department"
                )}
                placeholder="e.g. Operations"
                className={inputCls}
              />
            </div>

            <div>
              <Label>Hire Date</Label>

              <input
                type="date"
                value={form.hireDate}
                onChange={handleChange(
                  "hireDate"
                )}
                className={inputCls}
              />
            </div>

            <div>
              <Label>
                Monthly Salary (Ksh)
              </Label>

              <input
                type="number"
                value={form.salary}
                onChange={handleChange(
                  "salary"
                )}
                placeholder="e.g. 45000"
                className={inputCls}
              />
            </div>

            <div>
              <Label>
                Display Order
              </Label>

              <input
                type="number"
                value={form.order}
                onChange={handleChange(
                  "order"
                )}
                placeholder="0"
                className={inputCls}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-black border border-slate-200 rounded-xl hover:bg-slate-50 transition"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 text-sm font-semibold bg-[#7A1B0F] text-white rounded-xl hover:bg-[#64160C] transition disabled:opacity-60"
          >
            {saving
              ? "Saving…"
              : isEdit
              ? "Save Changes"
              : "Add Staff Member"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reset Password Modal
// ─────────────────────────────────────────────────────────────────────────────

function ResetPasswordModal({
  member,
  onClose,
  onSave,
}: {
  member: StaffMember;
  onClose: () => void;
  onSave: () => void;
}) {
  const [password, setPassword] =
    useState("");

  const [confirm, setConfirm] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleReset() {
    if (!password) {
      setError(
        "Enter a new password."
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must be at least 6 characters."
      );
      return;
    }

    if (password !== confirm) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/staff/${member._id}/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            password,
          }),
        }
      );

      if (!response.ok) {
        const data =
          await response
            .json()
            .catch(() => ({}));

        throw new Error(
          (
            data as {
              message?: string;
            }
          ).message ??
            "Reset failed"
        );
      }

      onSave();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to reset password"
      );
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] focus:border-transparent";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-black">
            Reset Password
          </h2>

          <button
            onClick={onClose}
            className="text-black"
          >
            <Icons.Close />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <Avatar
              name={member.user.name}
              photo={
                member.user.photo
              }
              size={36}
            />

            <div className="min-w-0">
              <p className="text-sm font-semibold text-black truncate">
                {member.user.name}
              </p>

              <p className="text-xs text-slate-500 truncate">
                {member.user.email}
              </p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-xl">
              {error}
            </p>
          )}

          <div>
            <label className="block text-xs font-semibold text-black mb-1.5">
              New Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="Min. 6 characters"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-black mb-1.5">
              Confirm Password
            </label>

            <input
              type="password"
              value={confirm}
              onChange={(event) =>
                setConfirm(
                  event.target.value
                )
              }
              placeholder="Re-enter password"
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex gap-2.5 px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 transition"
          >
            Cancel
          </button>

          <button
            onClick={handleReset}
            disabled={saving}
            className="flex-1 px-4 py-2 text-sm font-semibold bg-[#7A1B0F] text-white rounded-xl hover:bg-[#64160C] transition disabled:opacity-60"
          >
            {saving
              ? "Resetting…"
              : "Reset Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete Confirmation
// ─────────────────────────────────────────────────────────────────────────────

function DeleteConfirm({
  member,
  onClose,
  onConfirm,
}: {
  member: StaffMember;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [deleting, setDeleting] =
    useState(false);

  async function handleDelete() {
    setDeleting(true);
    await onConfirm();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
          <Icons.Trash />
        </div>

        <h3 className="font-bold text-black mb-1">
          Remove staff member?
        </h3>

        <p className="text-slate-600 text-sm mb-6">
          <span className="font-semibold text-black">
            {member.user.name}
          </span>{" "}
          will be removed from staff. Their
          user account will not be deleted.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm border border-slate-200 rounded-xl hover:bg-slate-50 transition"
          >
            Cancel
          </button>

          <button
            disabled={deleting}
            onClick={handleDelete}
            className="flex-1 px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 transition disabled:opacity-60"
          >
            {deleting
              ? "Removing…"
              : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function StaffPage() {
  const [staff, setStaff] =
    useState<StaffMember[]>([]);

  const [users, setUsers] =
    useState<UserOption[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [posFilter, setPosFilter] =
    useState("all");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [modalMode, setModalMode] =
    useState<ModalMode>(null);

  const [selectedMember, setSelectedMember] =
    useState<StaffMember | null>(null);

  const [deleteTarget, setDeleteTarget] =
    useState<StaffMember | null>(null);

  const [resetTarget, setResetTarget] =
    useState<StaffMember | null>(null);

  const [toast, setToast] =
    useState("");

  const showToast = (message: string) => {
    setToast(message);

    setTimeout(() => {
      setToast("");
    }, 3000);
  };

  const loadAll = useCallback(
    async () => {
      setLoading(true);

      try {
        const [staffResponse, usersResponse] =
          await Promise.all([
            fetch("/api/staff"),
            fetch("/api/users"),
          ]);

        if (
          !staffResponse.ok ||
          !usersResponse.ok
        ) {
          throw new Error(
            "Failed to fetch data"
          );
        }

        const staffData =
          await staffResponse.json();

        const usersData =
          await usersResponse.json();

        setStaff(
          staffData.data ?? []
        );

        setUsers(
          usersData.data ?? []
        );
      } catch (error) {
        console.error(
          "Failed to load staff data:",
          error
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function toggleActive(
    member: StaffMember
  ) {
    try {
      const response = await fetch(
        `/api/staff/${member._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            isActive:
              !member.isActive,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          "Toggle failed"
        );
      }

      showToast(
        `${member.user.name} ${
          !member.isActive
            ? "activated"
            : "deactivated"
        }.`
      );

      loadAll();
    } catch (error) {
      console.error(
        "toggleActive error:",
        error
      );

      showToast(
        "Failed to update status."
      );
    }
  }

  async function deleteMember(
    id: string
  ) {
    try {
      const response = await fetch(
        `/api/staff/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Delete failed"
        );
      }

      setDeleteTarget(null);

      showToast(
        "Staff member removed."
      );

      loadAll();
    } catch (error) {
      console.error(
        "deleteMember error:",
        error
      );

      setDeleteTarget(null);

      showToast(
        "Failed to remove staff member."
      );
    }
  }

  const positionOptions =
    Array.from(
      new Set(
        staff
          .map(
            (member) =>
              member.position
          )
          .filter(Boolean)
      )
    ).sort((a, b) =>
      a.localeCompare(b)
    );

  const filtered = staff.filter(
    (member) => {
      if (!member.user) {
        return false;
      }

      const query =
        search.toLowerCase();

      const matchSearch =
        !query ||
        member.user.name
          ?.toLowerCase()
          .includes(query) ||
        member.user.email
          ?.toLowerCase()
          .includes(query) ||
        member.employeeNumber
          ?.toLowerCase()
          .includes(query) ||
        member.department
          ?.toLowerCase()
          .includes(query) ||
        member.position
          ?.toLowerCase()
          .includes(query);

      const matchPosition =
        posFilter === "all" ||
        member.position ===
          posFilter;

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active"
          ? member.isActive
          : !member.isActive);

      return (
        matchSearch &&
        matchPosition &&
        matchStatus
      );
    }
  );

  const stats = {
    total: staff.length,

    active: staff.filter(
      (member) =>
        member.isActive
    ).length,

    inactive: staff.filter(
      (member) =>
        !member.isActive
    ).length,
  };

  function formatSalary(
    salary?: number | string
  ) {
    if (
      salary === undefined ||
      salary === null ||
      salary === ""
    ) {
      return "—";
    }

    return `Ksh ${Number(
      salary
    ).toLocaleString("en-KE")}`;
  }

  function formatDate(
    date?: string
  ) {
    if (!date) {
      return "—";
    }

    const parsed =
      new Date(date);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return "—";
    }

    return parsed.toLocaleDateString(
      "en-US",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  const selectCls =
    "appearance-none pl-3 pr-9 py-2.5 text-sm text-black border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] focus:border-transparent bg-white";

  return (
    <div className="space-y-6 pb-8">

      {/* ───────────────── Toast ───────────────── */}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] bg-slate-900 text-white text-sm px-4 py-3 rounded-xl shadow-xl">
          {toast}
        </div>
      )}

      {/* ───────────────── Header ───────────────── */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#7A1B0F]/10 text-[#7A1B0F] flex items-center justify-center">
              <Icons.Staff />
            </div>

            <h1 className="text-2xl font-bold text-black">
              Staff
            </h1>
          </div>

          <p className="text-slate-500 text-sm">
            Manage your team members, roles and
            account access.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedMember(null);
            setModalMode("add");
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7A1B0F] hover:bg-[#64160C] text-white text-sm font-semibold rounded-xl transition shadow-sm shadow-[#7A1B0F]/20"
        >
          <Icons.Plus />
          Add Staff Member
        </button>
      </div>

      {/* ───────────────── Stats ───────────────── */}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-black tabular-nums">
                {stats.total}
              </p>

              <p className="text-slate-500 text-xs mt-1">
                Total Staff
              </p>
            </div>

            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <Icons.Staff />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-emerald-600 tabular-nums">
                {stats.active}
              </p>

              <p className="text-slate-500 text-xs mt-1">
                Active Staff
              </p>
            </div>

            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Icons.Check />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-red-500 tabular-nums">
                {stats.inactive}
              </p>

              <p className="text-slate-500 text-xs mt-1">
                Inactive Staff
              </p>
            </div>

            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
              <Icons.Ban />
            </div>
          </div>
        </div>

      </div>

      {/* ───────────────── Filters ───────────────── */}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">

        <div className="flex flex-col lg:flex-row gap-3">

          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icons.Search />
            </span>

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search staff by name, email, employee number, position or department..."
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl text-black focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] focus:border-transparent"
            />
          </div>

          <div className="flex gap-2 flex-wrap">

            <div className="relative">
              <select
                value={posFilter}
                onChange={(event) =>
                  setPosFilter(
                    event.target.value
                  )
                }
                className={selectCls}
              >
                <option value="all">
                  All positions
                </option>

                {positionOptions.map(
                  (position) => (
                    <option
                      key={position}
                      value={position}
                    >
                      {position}
                    </option>
                  )
                )}
              </select>

              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                <Icons.ChevronDown />
              </span>
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                className={selectCls}
              >
                <option value="all">
                  All statuses
                </option>

                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>
              </select>

              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                <Icons.ChevronDown />
              </span>
            </div>

          </div>
        </div>
      </div>

      {/* ───────────────── Staff Table ───────────────── */}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

        {/* Loading */}

        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  {[
                    "Staff Member",
                    "Position",
                    "Department",
                    "Hire Date",
                    "Salary",
                    "Status",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {Array.from({
                  length: 6,
                }).map((_, index) => (
                  <tr
                    key={index}
                    className="animate-pulse border-b border-slate-100"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200" />

                        <div className="space-y-2">
                          <div className="h-3 bg-slate-200 rounded w-32" />
                          <div className="h-2.5 bg-slate-100 rounded w-44" />
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="h-6 bg-slate-100 rounded-lg w-24" />
                    </td>

                    <td className="px-5 py-4">
                      <div className="h-3 bg-slate-100 rounded w-24" />
                    </td>

                    <td className="px-5 py-4">
                      <div className="h-3 bg-slate-100 rounded w-20" />
                    </td>

                    <td className="px-5 py-4">
                      <div className="h-3 bg-slate-100 rounded w-24" />
                    </td>

                    <td className="px-5 py-4">
                      <div className="h-6 bg-slate-100 rounded-full w-16" />
                    </td>

                    <td className="px-5 py-4">
                      <div className="h-8 bg-slate-100 rounded-lg w-28" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : filtered.length === 0 ? (

          /* Empty */

          <div className="py-20 text-center px-6">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-500">
              <Icons.Staff />
            </div>

            <p className="text-black font-semibold">
              No staff found
            </p>

            <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
              {staff.length === 0
                ? "Add your first team member to get started."
                : "Try adjusting your search or filters."}
            </p>

            {staff.length === 0 && (
              <button
                onClick={() => {
                  setSelectedMember(null);
                  setModalMode("add");
                }}
                className="inline-flex items-center gap-2 mt-5 px-4 py-2.5 bg-[#7A1B0F] text-white text-sm font-semibold rounded-xl hover:bg-[#64160C]"
              >
                <Icons.Plus />
                Add Staff Member
              </button>
            )}
          </div>

        ) : (

          /* Table */

          <>
            <div className="overflow-x-auto">

              <table className="w-full min-w-[1000px]">

                {/* Table Header */}

                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">

                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Staff Member
                    </th>

                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Position
                    </th>

                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Department
                    </th>

                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Hire Date
                    </th>

                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Salary
                    </th>

                    <th className="px-5 py-3.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Status
                    </th>

                    <th className="px-5 py-3.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>

                  </tr>
                </thead>

                {/* Table Body */}

                <tbody className="divide-y divide-slate-100">

                  {filtered.map(
                    (member) => (
                      <tr
                        key={member._id}
                        className="group hover:bg-slate-50/60 transition-colors"
                      >

                        {/* Staff Member */}

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-3 min-w-[250px]">

                            <Avatar
                              name={
                                member.user
                                  ?.name ??
                                "?"
                              }
                              photo={
                                member.user
                                  ?.photo
                              }
                              size={42}
                            />

                            <div className="min-w-0">

                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-black truncate max-w-[190px]">
                                  {
                                    member.user
                                      ?.name
                                  }
                                </p>
                              </div>

                              <p className="text-xs text-slate-500 truncate max-w-[210px] mt-0.5">
                                {
                                  member.user
                                    ?.email
                                }
                              </p>

                              <span className="inline-flex mt-1.5 text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {
                                  member.employeeNumber
                                }
                              </span>

                            </div>

                          </div>

                        </td>

                        {/* Position */}

                        <td className="px-5 py-4">

                          <span
                            className={`inline-flex items-center px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap ${positionColor(
                              member.position
                            )}`}
                          >
                            {member.position ||
                              "—"}
                          </span>

                        </td>

                        {/* Department */}

                        <td className="px-5 py-4">

                          <div className="flex items-center gap-2">

                            <span className="text-slate-400">
                              <Icons.Building />
                            </span>

                            <span className="text-sm text-slate-700 whitespace-nowrap">
                              {member.department ||
                                "—"}
                            </span>

                          </div>

                        </td>

                        {/* Hire Date */}

                        <td className="px-5 py-4">

                          <span className="text-sm text-slate-700 whitespace-nowrap">
                            {formatDate(
                              member.hireDate
                            )}
                          </span>

                        </td>

                        {/* Salary */}

                        <td className="px-5 py-4">

                          <div>
                            <p className="text-sm font-semibold text-slate-800 whitespace-nowrap">
                              {formatSalary(
                                member.salary
                              )}
                            </p>

                            {member.salary !==
                              undefined &&
                              member.salary !==
                                null &&
                              member.salary !==
                                "" && (
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Monthly
                                </p>
                              )}
                          </div>

                        </td>

                        {/* Status */}

                        <td className="px-5 py-4">

                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-semibold ${
                              member.isActive
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >

                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                member.isActive
                                  ? "bg-emerald-500"
                                  : "bg-slate-400"
                              }`}
                            />

                            {member.isActive
                              ? "Active"
                              : "Inactive"}

                          </span>

                        </td>

                        {/* Actions */}

                        <td className="px-5 py-4">

                          <div className="flex items-center justify-end gap-1">

                            <button
                              onClick={() => {
                                setSelectedMember(
                                  member
                                );

                                setModalMode(
                                  "edit"
                                );
                              }}
                              title="Edit staff"
                              className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-[#7A1B0F] hover:bg-[#7A1B0F]/10 rounded-lg transition"
                            >
                              <Icons.Edit />
                            </button>

                            <button
                              onClick={() =>
                                toggleActive(
                                  member
                                )
                              }
                              title={
                                member.isActive
                                  ? "Deactivate"
                                  : "Activate"
                              }
                              className={`w-8 h-8 flex items-center justify-center rounded-lg transition ${
                                member.isActive
                                  ? "text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                                  : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              }`}
                            >
                              {member.isActive ? (
                                <Icons.Ban />
                              ) : (
                                <Icons.Check />
                              )}
                            </button>

                            <button
                              onClick={() =>
                                setResetTarget(
                                  member
                                )
                              }
                              title="Reset password"
                              className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition"
                            >
                              <Icons.Key />
                            </button>

                            <button
                              onClick={() =>
                                setDeleteTarget(
                                  member
                                )
                              }
                              title="Remove staff"
                              className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                              <Icons.Trash />
                            </button>

                          </div>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>

            {/* ───────────────── Table Footer ───────────────── */}

            <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

              <p className="text-xs text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {filtered.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">
                  {staff.length}
                </span>{" "}
                staff members
              </p>

              {(search ||
                posFilter !== "all" ||
                statusFilter !==
                  "all") && (
                <button
                  onClick={() => {
                    setSearch("");
                    setPosFilter(
                      "all"
                    );
                    setStatusFilter(
                      "all"
                    );
                  }}
                  className="text-xs font-semibold text-[#7A1B0F] hover:underline"
                >
                  Clear filters
                </button>
              )}

            </div>
          </>
        )}

      </div>

      {/* ───────────────── Modals ───────────────── */}

      {modalMode && (
        <StaffModal
          mode={modalMode}
          member={selectedMember}
          users={users}
          onClose={() =>
            setModalMode(null)
          }
          onSave={() => {
            setModalMode(null);

            loadAll();

            showToast(
              modalMode === "add"
                ? "Staff member added."
                : "Staff member updated."
            );
          }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          member={deleteTarget}
          onClose={() =>
            setDeleteTarget(null)
          }
          onConfirm={() =>
            deleteMember(
              deleteTarget._id
            )
          }
        />
      )}

      {resetTarget && (
        <ResetPasswordModal
          member={resetTarget}
          onClose={() =>
            setResetTarget(null)
          }
          onSave={() => {
            setResetTarget(null);

            showToast(
              "Password reset successfully."
            );
          }}
        />
      )}

    </div>
  );
}