"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DAY_MS,
  DURATION_RULES,
  toDateInputValue,
  validateDuration,
  type RentalType,
} from "@/lib/durationRules";

const PRIMARY_COLOR = "#7A1B0F";

const DURATION_OPTIONS: {
  value: RentalType;
  label: string;
  hint: string;
}[] = [
  {
    value: "short_term",
    label: "Just a few days",
    hint: "Short Term • Single room • Daily rate",
  },
  {
    value: "mid_term",
    label: "A few months",
    hint: "Mid Term • Whole unit • Monthly rate",
  },
  {
    value: "long_term",
    label: "About a year",
    hint: "Long Term • Whole unit • Monthly rate",
  },
];

function formatReadableDate(date: string) {
  if (!date) return "";

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function RoomFinderModal() {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<0 | 1>(0);

  const [rentalType, setRentalType] =
    useState<RentalType | null>(null);

  const [moveInDate, setMoveInDate] = useState("");
  const [moveOutDate, setMoveOutDate] = useState("");

  const [error, setError] = useState("");

  const rule = rentalType
    ? DURATION_RULES[rentalType]
    : null;

  const today = useMemo(
    () => toDateInputValue(new Date()),
    []
  );

  // ─────────────────────────────────────────────
  // MOVE-OUT DATE LIMITS
  // ─────────────────────────────────────────────

  const moveOutBounds = useMemo(() => {
    if (!rule || !moveInDate) {
      return {
        min: undefined,
        max: undefined,
      };
    }

    const base = new Date(`${moveInDate}T00:00:00`);

    const min = new Date(
      base.getTime() + rule.minDays * DAY_MS
    );

    const max =
      rule.maxDays === Infinity
        ? undefined
        : new Date(
            base.getTime() + rule.maxDays * DAY_MS
          );

    return {
      min: toDateInputValue(min),
      max: max
        ? toDateInputValue(max)
        : undefined,
    };
  }, [rule, moveInDate]);

  // ─────────────────────────────────────────────
  // RESET
  // ─────────────────────────────────────────────

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

  // ─────────────────────────────────────────────
  // CHOOSE RENTAL TYPE
  // ─────────────────────────────────────────────

  function chooseDuration(value: RentalType) {
    setRentalType(value);
    setMoveInDate("");
    setMoveOutDate("");
    setError("");
    setStep(1);
  }

  // ─────────────────────────────────────────────
  // SUBMIT
  // ─────────────────────────────────────────────

  function submit() {
    if (!rentalType || !rule) return;

    const validationError = validateDuration(
      rentalType,
      moveInDate,
      moveOutDate
    );

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
      {/* ═══════════════════════════════════════
          OPEN BUTTON
      ═══════════════════════════════════════ */}

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="
          px-8
          py-4
          bg-white/10
          hover:bg-white/20
          border
          border-white/30
          text-white
          font-semibold
          rounded-xl
          text-lg
          transition
          duration-200
          backdrop-blur-sm
        "
      >
        What type of room are you looking for?
      </button>

      {/* ═══════════════════════════════════════
          MODAL
      ═══════════════════════════════════════ */}

      {isOpen && (
        <div
          className="
            fixed
            inset-0
            z-50
            flex
            items-center
            justify-center
            bg-black/60
            backdrop-blur-sm
            px-4
            py-6
          "
          role="dialog"
          aria-modal="true"
          aria-labelledby="room-finder-heading"
          onClick={close}
        >
          <div
            className="
              relative
              w-full
              max-w-2xl
              max-h-[92vh]
              overflow-y-auto
              bg-white
              rounded-3xl
              shadow-2xl
            "
            onClick={(e) => e.stopPropagation()}
          >
            {/* ═════════════════════════════════
                HEADER
            ═════════════════════════════════ */}

            <div className="px-7 sm:px-9 pt-7 sm:pt-8 pb-5">
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="
                  absolute
                  top-5
                  right-5
                  w-9
                  h-9
                  rounded-full
                  flex
                  items-center
                  justify-center
                  bg-gray-100
                  text-gray-500
                  hover:bg-gray-200
                  hover:text-gray-800
                  text-xl
                  transition
                "
              >
                ×
              </button>

              {/* Step indicator */}

              <div className="flex items-center gap-3 pr-10 mb-7">
                <div className="flex items-center gap-2">
                  <div
                    className="
                      w-8
                      h-8
                      rounded-full
                      flex
                      items-center
                      justify-center
                      text-xs
                      font-bold
                      text-white
                    "
                    style={{
                      backgroundColor: PRIMARY_COLOR,
                    }}
                  >
                    1
                  </div>

                  <span
                    className="
                      text-xs
                      font-semibold
                      text-gray-700
                    "
                  >
                    Stay type
                  </span>
                </div>

                <div className="h-px bg-gray-200 flex-1" />

                <div className="flex items-center gap-2">
                  <div
                    className={`
                      w-8
                      h-8
                      rounded-full
                      flex
                      items-center
                      justify-center
                      text-xs
                      font-bold
                      ${
                        step === 1
                          ? "text-white"
                          : "bg-gray-100 text-gray-400"
                      }
                    `}
                    style={
                      step === 1
                        ? {
                            backgroundColor:
                              PRIMARY_COLOR,
                          }
                        : undefined
                    }
                  >
                    2
                  </div>

                  <span
                    className={`
                      text-xs
                      font-semibold
                      ${
                        step === 1
                          ? "text-gray-700"
                          : "text-gray-400"
                      }
                    `}
                  >
                    Dates
                  </span>
                </div>
              </div>

              {/* ═══════════════════════════════
                  STEP 1
              ═══════════════════════════════ */}

              {step === 0 && (
                <>
                  <div className="mb-7">
                    <p
                      className="
                        text-xs
                        font-bold
                        uppercase
                        tracking-widest
                        mb-2
                      "
                      style={{
                        color: PRIMARY_COLOR,
                      }}
                    >
                      Step 1 of 2
                    </p>

                    <h2
                      id="room-finder-heading"
                      className="
                        text-3xl
                        sm:text-4xl
                        font-bold
                        text-gray-900
                        tracking-tight
                      "
                    >
                      How long do you need a place?
                    </h2>

                    <p className="
                      text-base
                      text-gray-500
                      mt-2
                    ">
                      Choose your preferred stay
                      duration.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {DURATION_OPTIONS.map(
                      (option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() =>
                            chooseDuration(
                              option.value
                            )
                          }
                          className="
                            w-full
                            text-left
                            px-5
                            py-5
                            rounded-2xl
                            border-2
                            border-gray-200
                            hover:border-[#7A1B0F]
                            hover:bg-[#7A1B0F]/5
                            transition-all
                            group
                          "
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className="
                                w-12
                                h-12
                                rounded-xl
                                flex
                                items-center
                                justify-center
                                bg-[#7A1B0F]/10
                                text-[#7A1B0F]
                                text-xl
                                flex-shrink-0
                                group-hover:bg-[#7A1B0F]
                                group-hover:text-white
                                transition
                              "
                            >
                              {option.value ===
                                "short_term" && "☀"}

                              {option.value ===
                                "mid_term" && "📅"}

                              {option.value ===
                                "long_term" && "🏠"}
                            </div>

                            <div className="flex-1">
                              <span className="
                                block
                                text-base
                                font-bold
                                text-gray-900
                              ">
                                {option.label}
                              </span>

                              <span className="
                                block
                                text-sm
                                text-gray-500
                                mt-1
                              ">
                                {option.hint}
                              </span>
                            </div>

                            <span className="
                              text-gray-300
                              group-hover:text-[#7A1B0F]
                              text-2xl
                              transition
                            ">
                              →
                            </span>
                          </div>
                        </button>
                      )
                    )}
                  </div>
                </>
              )}

              {/* ═══════════════════════════════
                  STEP 2
              ═══════════════════════════════ */}

              {step === 1 &&
                rentalType &&
                rule && (
                  <>
                    {/* Title */}

                    <div className="mb-6">
                      <p
                        className="
                          text-xs
                          font-bold
                          uppercase
                          tracking-widest
                          mb-2
                        "
                        style={{
                          color: PRIMARY_COLOR,
                        }}
                      >
                        Step 2 of 2
                      </p>

                      <h2
                        id="room-finder-heading"
                        className="
                          text-3xl
                          sm:text-4xl
                          font-bold
                          text-gray-900
                          tracking-tight
                        "
                      >
                        Choose your dates
                      </h2>

                      <p className="
                        text-base
                        text-gray-500
                        mt-2
                      ">
                        Select when you will move in
                        and move out.
                      </p>
                    </div>

                    {/* ═════════════════════════
                        SELECTED STAY
                    ═════════════════════════ */}

                    <div
                      className="
                        mb-7
                        px-4
                        py-3
                        rounded-xl
                        border
                        bg-[#7A1B0F]/5
                        border-[#7A1B0F]/15
                        flex
                        items-center
                        justify-between
                        gap-3
                      "
                    >
                      <div>
                        <p className="
                          text-[11px]
                          uppercase
                          tracking-wider
                          font-bold
                          text-gray-500
                        ">
                          Selected stay
                        </p>

                        <p className="
                          text-sm
                          font-bold
                          text-gray-900
                          mt-0.5
                        ">
                          {
                            DURATION_OPTIONS.find(
                              (option) =>
                                option.value ===
                                rentalType
                            )?.label
                          }
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setStep(0);
                          setError("");
                        }}
                        className="
                          text-xs
                          font-semibold
                          text-[#7A1B0F]
                          hover:underline
                        "
                      >
                        Change
                      </button>
                    </div>

                    {/* ═════════════════════════
                        DATE SELECTION
                    ═════════════════════════ */}

                    <div className="
                      grid
                      grid-cols-1
                      sm:grid-cols-2
                      gap-5
                    ">
                      {/* MOVE IN */}

                      <div>
                        <label
                          htmlFor="moveIn"
                          className="
                            block
                            text-sm
                            font-bold
                            text-gray-800
                            mb-2
                          "
                        >
                          Move-in date
                        </label>

                        <div className="relative">
                          <span className="
                            absolute
                            left-4
                            top-1/2
                            -translate-y-1/2
                            text-lg
                            pointer-events-none
                          ">
                            📅
                          </span>

                          <input
                            id="moveIn"
                            type="date"
                            min={today}
                            value={moveInDate}
                            onChange={(e) => {
                              setMoveInDate(
                                e.target.value
                              );
                              setMoveOutDate("");
                              setError("");
                            }}
                            className="
                              w-full
                              h-14
                              pl-12
                              pr-4
                              border-2
                              border-gray-200
                              rounded-xl
                              bg-white
                              text-gray-900
                              font-semibold
                              text-base
                              cursor-pointer

                              focus:outline-none
                              focus:border-[#7A1B0F]
                              focus:ring-4
                              focus:ring-[#7A1B0F]/10

                              hover:border-gray-300

                              transition
                            "
                          />
                        </div>

                        <p className="
                          mt-2
                          text-xs
                          text-gray-400
                        ">
                          When you will arrive
                        </p>

                        {moveInDate && (
                          <div className="
                            mt-2
                            text-sm
                            font-semibold
                            text-[#7A1B0F]
                          ">
                            {formatReadableDate(
                              moveInDate
                            )}
                          </div>
                        )}
                      </div>

                      {/* MOVE OUT */}

                      <div>
                        <label
                          htmlFor="moveOut"
                          className="
                            block
                            text-sm
                            font-bold
                            text-gray-800
                            mb-2
                          "
                        >
                          Move-out date
                        </label>

                        <div className="relative">
                          <span className="
                            absolute
                            left-4
                            top-1/2
                            -translate-y-1/2
                            text-lg
                            pointer-events-none
                          ">
                            📅
                          </span>

                          <input
                            id="moveOut"
                            type="date"
                            min={moveOutBounds.min}
                            max={moveOutBounds.max}
                            value={moveOutDate}
                            disabled={!moveInDate}
                            onChange={(e) => {
                              setMoveOutDate(
                                e.target.value
                              );
                              setError("");
                            }}
                            className="
                              w-full
                              h-14
                              pl-12
                              pr-4
                              border-2
                              border-gray-200
                              rounded-xl
                              bg-white
                              text-gray-900
                              font-semibold
                              text-base
                              cursor-pointer

                              focus:outline-none
                              focus:border-[#7A1B0F]
                              focus:ring-4
                              focus:ring-[#7A1B0F]/10

                              hover:border-gray-300

                              disabled:bg-gray-100
                              disabled:text-gray-400
                              disabled:cursor-not-allowed

                              transition
                            "
                          />
                        </div>

                        {!moveInDate ? (
                          <p className="
                            mt-2
                            text-xs
                            text-gray-400
                          ">
                            Select move-in first
                          </p>
                        ) : (
                          <p className="
                            mt-2
                            text-xs
                            text-gray-400
                          ">
                            When you will leave
                          </p>
                        )}

                        {moveOutDate && (
                          <div className="
                            mt-2
                            text-sm
                            font-semibold
                            text-[#7A1B0F]
                          ">
                            {formatReadableDate(
                              moveOutDate
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ═════════════════════════
                        AVAILABLE DATE RANGE
                    ═════════════════════════ */}

                    {moveInDate &&
                      moveOutBounds.min && (
                        <div className="
                          mt-6
                          px-4
                          py-3
                          rounded-xl
                          bg-slate-50
                          border
                          border-slate-200
                        ">
                          <div className="
                            flex
                            items-center
                            gap-2
                          ">
                            <span className="
                              w-6
                              h-6
                              rounded-full
                              flex
                              items-center
                              justify-center
                              bg-[#7A1B0F]/10
                              text-[#7A1B0F]
                              text-xs
                              font-bold
                            ">
                              i
                            </span>

                            <p className="
                              text-sm
                              text-gray-600
                            ">
                              <span className="
                                font-semibold
                                text-gray-800
                              ">
                                Allowed stay:
                              </span>{" "}
                              {formatReadableDate(
                                moveOutBounds.min
                              )}

                              {moveOutBounds.max && (
                                <>
                                  {" "}
                                  —{" "}
                                  {formatReadableDate(
                                    moveOutBounds.max
                                  )}
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      )}

                    {/* ═════════════════════════
                        HELPER TEXT
                    ═════════════════════════ */}

                    <div className="
                      mt-5
                      text-xs
                      text-gray-500
                    ">
                      {rule.helperText}
                    </div>

                    {/* ERROR */}

                    {error && (
                      <div className="
                        mt-4
                        flex
                        items-start
                        gap-2
                        p-3
                        bg-red-50
                        border
                        border-red-200
                        rounded-xl
                        text-sm
                        text-red-700
                      ">
                        <span>⚠</span>
                        <span>{error}</span>
                      </div>
                    )}

                    {/* ═════════════════════════
                        ACTION BUTTONS
                    ═════════════════════════ */}

                    <div className="
                      flex
                      gap-3
                      mt-7
                      pt-5
                      border-t
                      border-gray-100
                    ">
                      <button
                        type="button"
                        onClick={() => {
                          setStep(0);
                          setError("");
                        }}
                        className="
                          px-6
                          h-12
                          rounded-xl
                          border-2
                          border-gray-200
                          text-gray-700
                          font-semibold
                          hover:bg-gray-50
                          hover:border-gray-300
                          transition
                        "
                      >
                        ← Back
                      </button>

                      <button
                        type="button"
                        onClick={submit}
                        className="
                          flex-1
                          h-12
                          rounded-xl
                          bg-[#7A1B0F]
                          hover:bg-[#64160C]
                          text-white
                          font-bold
                          transition
                          shadow-sm
                          hover:shadow-md
                        "
                      >
                        Show me listings →
                      </button>
                    </div>
                  </>
                )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}