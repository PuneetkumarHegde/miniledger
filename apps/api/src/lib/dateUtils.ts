/**
 * MiniLedger Date & Timezone Policy:
 * 
 * 1. Due dates are stored as ISO timestamps representing calendar dates.
 * 2. Overdue Rule: A borrower has the entire due date to repay the loan.
 *    A loan becomes OVERDUE strictly AFTER the due date has fully elapsed
 *    (i.e., at 00:00:00.000 of the following calendar day).
 * 3. A loan due on 2026-10-22 is considered "Due Today" (NOT overdue) throughout 2026-10-22.
 *    It becomes OVERDUE starting 2026-10-23 00:00:00.
 */

export function toDateStringUTC(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Checks whether a given due date is overdue compared to a reference date (defaults to current time).
 * Both dates are evaluated at the calendar-day level in UTC to ensure identical behavior
 * across the backend, database queries, and client mobile views.
 */
export function isLoanOverdue(dueDate: Date | string, referenceDate: Date = new Date()): boolean {
  const dueStr = toDateStringUTC(dueDate);
  const refStr = toDateStringUTC(referenceDate);
  // If reference date is strictly past the due date, it is overdue
  return refStr > dueStr;
}

/**
 * Returns the end of day (23:59:59.999 UTC) for a given date.
 */
export function getEndOfDayUTC(date: Date | string): Date {
  const d = typeof date === 'string' ? new Date(date) : new Date(date.getTime());
  const str = toDateStringUTC(d);
  return new Date(`${str}T23:59:59.999Z`);
}
