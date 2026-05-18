import { addMonths } from "date-fns";

export function buildSchedule(p: {
  principalCents: number; aprBps: number; termMonths: number; startDate: Date;
}) {
  const monthlyRate = p.aprBps / 10000 / 12;
  const n = p.termMonths;
  const P = p.principalCents;
  const monthlyPayment = monthlyRate === 0
    ? Math.round(P / n)
    : Math.round((P * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n)));

  const rows = [];
  let outstanding = P;
  for (let i = 1; i <= n; i++) {
    const interest = Math.round(outstanding * monthlyRate);
    let principal = monthlyPayment - interest;
    if (i === n) principal = outstanding;
    const platformFee = Math.round(interest * 0.15);
    rows.push({
      sequence_number: i,
      due_date: addMonths(p.startDate, i),
      principal_cents: principal,
      interest_cents: interest,
      platform_fee_cents: platformFee,
      total_due_cents: principal + interest,
    });
    outstanding -= principal;
  }
  return rows;
}

export function calcMonthlyPayment(principalCents: number, aprBps: number, termMonths: number): number {
  const r = aprBps / 10000 / 12;
  if (r === 0) return Math.round(principalCents / termMonths);
  return Math.round((principalCents * r) / (1 - Math.pow(1 + r, -termMonths)));
}

export function calcTotalInterest(principalCents: number, aprBps: number, termMonths: number): number {
  return calcMonthlyPayment(principalCents, aprBps, termMonths) * termMonths - principalCents;
}
