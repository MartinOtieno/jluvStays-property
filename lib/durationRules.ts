// lib/durationRules.ts

export type RentalType = "long_term" | "mid_term" | "short_term";

export const DAY_MS = 1000 * 60 * 60 * 24;

// Duration rules per rental type:
//   short_term -> at most 1 month
//   mid_term   -> more than 1 month, up to 1 year
//   long_term  -> more than 1 year
// Expressed in days (30/365) since date inputs work in calendar days —
// matches the same 30-day-month approximation used server-side in
// /api/bookings' wholeMonthsUp(). Single source of truth — imported by
// both RoomFinderModal.tsx and listings/page.tsx so the two can't drift.
export const DURATION_RULES: Record<
  RentalType,
  { minDays: number; maxDays: number; helperText: string; violationText: string }
> = {
  short_term: {
    minDays: 1,
    maxDays: 30,
    helperText: "Short Term stays can be up to 1 month.",
    violationText: "Short Term stays can't be longer than 1 month. Choose Mid Term for longer stays.",
  },
  mid_term: {
    minDays: 31,
    maxDays: 365,
    helperText: "Mid Term stays run from just over a month up to a year.",
    violationText: "Mid Term stays must be longer than 1 month and no more than a year. Choose Short Term for shorter stays, or Long Term for longer ones.",
  },
  long_term: {
    minDays: 366,
    maxDays: Infinity,
    helperText: "Long Term stays run for more than a year.",
    violationText: "Long Term stays must be longer than 1 year. Choose Mid Term for shorter stays.",
  },
};

export function toDateInputValue(date: Date): string {
  return date.toISOString().split("T")[0];
}

// Validates a move-in/move-out pair against a specific rental type's
// duration rule. Returns an error message string, or null if valid.
export function validateDuration(
  rentalType: RentalType,
  moveInDate: string,
  moveOutDate: string
): string | null {
  const rule = DURATION_RULES[rentalType];

  if (!moveInDate || !moveOutDate) {
    return "Please choose both a move-in and move-out date.";
  }

  const moveIn = new Date(moveInDate);
  const moveOut = new Date(moveOutDate);

  if (moveOut <= moveIn) {
    return "Move-out date must be after move-in date.";
  }

  const stayDays = Math.round((moveOut.getTime() - moveIn.getTime()) / DAY_MS);
  if (stayDays < rule.minDays || stayDays > rule.maxDays) {
    return rule.violationText;
  }

  return null;
}