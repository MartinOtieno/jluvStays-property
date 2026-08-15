"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DAY_MS, DURATION_RULES, toDateInputValue, validateDuration, type RentalType } from "@/lib/durationRules";

const DURATION_OPTIONS: { value: RentalType; label: string; hint: string }[] = [
  { value: "short_term", label: "Just a few days", hint: "Short Term — single room, daily rate" },
  { value: "mid_term", label: "A few months", hint: "Mid Term — whole unit, monthly rate" },
  { value: "long_term", label: "About a year", hint: "Long Term — whole unit, monthly rate" },
];

export default function RoomFinderModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<0 | 1>(0);
  const [rentalType, setRentalType] = useState<RentalType | null>(null);
  const [moveInDate, setMoveInDate] = useState("");
  const [moveOutDate, setMoveOutDate] = useState("");
  const [error, setError] = useState("");

  const rule = rentalType ? DURATION_RULES[rentalType] : null;

  const today = useMemo(() => toDateInputValue(new Date()), []);

  // Dynamic bounds for the move-out picker, based on the chosen move-in
  // date and the active rental type's duration rule. Purely a UX guide —
  // submit() below is the actual source of truth for validation.
  const moveOutBounds = useMemo(() => {
    if (!rule || !moveInDate) return { min: undefined, max: undefined };
    const base = new Date(moveInDate);
    const min = new Date(base.getTime() + rule.minDays * DAY_MS);
    const max =
      rule.maxDays === Infinity ? undefined : new Date(base.getTime() + rule.maxDays * DAY_MS);
    return {
      min: toDateInputValue(min),
      max: max ? toDateInputValue(max) : undefined,
    };
  }, [rule, moveInDate]);

  function reset() {
    setStep(0);
    setRentalType(null);
    setMoveInDate("");
    setMoveOutDate("");
    setError("");
  }

  function close() {
    setIsOpen(false);
    reset();
  }

  function chooseDuration(value: RentalType) {
    setRentalType(value);
    setMoveInDate("");
    setMoveOutDate("");
    setError("");
    setStep(1);
  }

  function submit() {
    if (!rentalType || !rule) return;

    const validationError = validateDuration(rentalType, moveInDate, moveOutDate);
    if (validationError) {
      setError(validationError);
      return;
    }

    const params = new URLSearchParams({
      type: rentalType,
      moveIn: moveInDate,
      moveOut: moveOutDate,
    });
    router.push(`/listings?${params.toString()}`);
    close();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-semibold rounded-xl text-lg transition duration-200 backdrop-blur-sm"
      >
        What type of room are you looking today?
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="room-finder-heading"
          onClick={close}
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl leading-none"
            >
              &times;
            </button>

            {step === 0 && (
              <>
                <h2 id="room-finder-heading" className="text-2xl font-bold text-gray-900 mb-2">
                  How long do you need a place?
                </h2>
                <p className="text-gray-500 mb-6">
                  We&apos;ll show you the right kind of listing.
                </p>
                <div className="space-y-3">
                  {DURATION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => chooseDuration(option.value)}
                      className="w-full text-left px-5 py-4 rounded-xl border border-gray-200 hover:border-[#7A1B0F] hover:bg-[#7A1B0F]/5 transition"
                    >
                      <span className="block font-semibold text-gray-900">{option.label}</span>
                      <span className="block text-sm text-gray-500 mt-0.5">{option.hint}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 1 && rentalType && rule && (
              <>
                <h2 id="room-finder-heading" className="text-2xl font-bold text-gray-900 mb-2">
                  When do you need it?
                </h2>
                <p className="text-gray-500 mb-6">{rule.helperText}</p>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="moveIn" className="block text-sm font-medium text-gray-700 mb-1">
                      Move-in date
                    </label>
                    <input
                      id="moveIn"
                      type="date"
                      min={today}
                      value={moveInDate}
                      onChange={(e) => {
                        setMoveInDate(e.target.value);
                        setMoveOutDate("");
                        setError("");
                      }}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7A1B0F]"
                    />
                  </div>
                  <div>
                    <label htmlFor="moveOut" className="block text-sm font-medium text-gray-700 mb-1">
                      Move-out date
                    </label>
                    <input
                      id="moveOut"
                      type="date"
                      min={moveOutBounds.min}
                      max={moveOutBounds.max}
                      value={moveOutDate}
                      disabled={!moveInDate}
                      onChange={(e) => {
                        setMoveOutDate(e.target.value);
                        setError("");
                      }}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7A1B0F] disabled:bg-gray-50 disabled:text-gray-400"
                    />
                    {!moveInDate && (
                      <p className="text-xs text-gray-400 mt-1">Choose a move-in date first.</p>
                    )}
                  </div>
                </div>

                {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setStep(0)}
                    className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    className="flex-1 px-5 py-2.5 rounded-xl bg-[#7A1B0F] hover:opacity-90 text-white font-semibold transition"
                  >
                    Show me listings
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}