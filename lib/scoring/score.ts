export interface ScoreInputs {
  identity_verified: boolean;
  has_irp_or_eu_passport: boolean;
  email_verified: boolean;
  has_2fa: boolean;
  has_student_id: boolean;
  declared_monthly_income_cents: number;
  income_verified: boolean;
  income_verification_age_days: number;
  employment_status: "part_time" | "full_time" | "student_only";
  nci_semesters_completed: number;
  account_age_days: number;
  has_emergency_fund: boolean;
  declared_monthly_expenses_cents: number;
  existing_debt_cents: number;
  total_loans_completed: number;
  total_loans_active: number;
  on_time_payment_count: number;
  late_payment_count: number;
  defaulted_loan_count: number;
}

export interface ScoreOutput {
  total: number;
  components: { identity: number; income: number; stability: number; financial: number; reputation: number };
  breakdown: Record<string, { points: number; max: number; reason: string }>;
  algorithm_version: "v1.0";
}

export function computeScore(i: ScoreInputs): ScoreOutput {
  const breakdown: ScoreOutput["breakdown"] = {};

  let id = 0;
  if (i.identity_verified) { id += 8; breakdown.identity_verified = { points: 8, max: 8, reason: "Identity documents approved" }; }
  else breakdown.identity_verified = { points: 0, max: 8, reason: "Identity not yet verified" };
  if (i.has_irp_or_eu_passport) { id += 4; breakdown.legal_status = { points: 4, max: 4, reason: "Valid IRP or EU passport" }; }
  else breakdown.legal_status = { points: 0, max: 4, reason: "Legal residency not confirmed" };
  if (i.email_verified) { id += 2; breakdown.email = { points: 2, max: 2, reason: "NCI email verified" }; }
  if (i.has_2fa) { id += 2; breakdown.two_fa = { points: 2, max: 2, reason: "2FA enabled" }; }
  if (i.has_student_id) { id += 4; breakdown.student_id = { points: 4, max: 4, reason: "Active NCI student ID" }; }

  let inc = 0;
  const m = i.declared_monthly_income_cents / 100;
  if (m >= 1500) { inc += 10; breakdown.income_amount = { points: 10, max: 10, reason: `Monthly income €${m} ≥ €1500` }; }
  else if (m >= 800) { inc += 7; breakdown.income_amount = { points: 7, max: 10, reason: `Monthly income €${m}` }; }
  else if (m >= 400) { inc += 4; breakdown.income_amount = { points: 4, max: 10, reason: `Monthly income €${m}` }; }
  else breakdown.income_amount = { points: 0, max: 10, reason: "Income below €400" };

  if (i.income_verified) {
    if (i.income_verification_age_days <= 60) { inc += 10; breakdown.income_verified = { points: 10, max: 10, reason: "Verified, fresh payslip" }; }
    else if (i.income_verification_age_days <= 180) { inc += 5; breakdown.income_verified = { points: 5, max: 10, reason: "Verified, payslip 60-180d old" }; }
    else { inc += 2; breakdown.income_verified = { points: 2, max: 10, reason: "Verification stale" }; }
  } else breakdown.income_verified = { points: 0, max: 10, reason: "Income not verified" };

  if (i.employment_status === "full_time") { inc += 5; breakdown.employment = { points: 5, max: 5, reason: "Full-time" }; }
  else if (i.employment_status === "part_time") { inc += 3; breakdown.employment = { points: 3, max: 5, reason: "Part-time" }; }
  else breakdown.employment = { points: 0, max: 5, reason: "Student only" };

  let stab = 0;
  if (i.nci_semesters_completed >= 3) { stab += 6; breakdown.nci_tenure = { points: 6, max: 6, reason: `${i.nci_semesters_completed} semesters` }; }
  else if (i.nci_semesters_completed >= 1) { stab += 3; breakdown.nci_tenure = { points: 3, max: 6, reason: `${i.nci_semesters_completed} semester(s)` }; }
  else breakdown.nci_tenure = { points: 0, max: 6, reason: "No semesters" };

  if (i.account_age_days >= 90) { stab += 4; breakdown.account_age = { points: 4, max: 4, reason: `${i.account_age_days}d old` }; }
  else if (i.account_age_days >= 30) { stab += 2; breakdown.account_age = { points: 2, max: 4, reason: `${i.account_age_days}d old` }; }
  else breakdown.account_age = { points: 0, max: 4, reason: "New account" };

  if (i.has_emergency_fund) { stab += 5; breakdown.emergency_fund = { points: 5, max: 5, reason: "Emergency fund declared" }; }
  else breakdown.emergency_fund = { points: 0, max: 5, reason: "No emergency fund" };

  let fin = 0;
  const surplus = i.declared_monthly_income_cents - i.declared_monthly_expenses_cents;
  const ratio = i.declared_monthly_income_cents > 0 ? surplus / i.declared_monthly_income_cents : 0;
  if (ratio >= 0.30) { fin += 12; breakdown.surplus = { points: 12, max: 12, reason: `Surplus ratio ${(ratio * 100).toFixed(0)}%` }; }
  else if (ratio >= 0.15) { fin += 8; breakdown.surplus = { points: 8, max: 12, reason: `Surplus ratio ${(ratio * 100).toFixed(0)}%` }; }
  else if (ratio >= 0.05) { fin += 4; breakdown.surplus = { points: 4, max: 12, reason: `Surplus ratio ${(ratio * 100).toFixed(0)}%` }; }
  else breakdown.surplus = { points: 0, max: 12, reason: "No / negative surplus" };

  const dti = i.declared_monthly_income_cents > 0 ? i.existing_debt_cents / i.declared_monthly_income_cents : 99;
  if (dti === 0) { fin += 8; breakdown.debt = { points: 8, max: 8, reason: "No existing debt" }; }
  else if (dti <= 3) { fin += 6; breakdown.debt = { points: 6, max: 8, reason: `Debt ${dti.toFixed(1)} months income` }; }
  else if (dti <= 6) { fin += 3; breakdown.debt = { points: 3, max: 8, reason: `Debt ${dti.toFixed(1)} months income` }; }
  else breakdown.debt = { points: 0, max: 8, reason: "Excessive debt" };

  let rep = 0;
  if (i.defaulted_loan_count > 0) {
    rep = 0;
    breakdown.reputation = { points: 0, max: 20, reason: `${i.defaulted_loan_count} defaulted loan(s)` };
  } else if (i.total_loans_completed === 0) {
    rep = 10;
    breakdown.reputation = { points: 10, max: 20, reason: "No prior loans (neutral)" };
  } else {
    const total = i.on_time_payment_count + i.late_payment_count;
    const onTime = total > 0 ? i.on_time_payment_count / total : 1;
    if (onTime >= 0.95) { rep = 20; breakdown.reputation = { points: 20, max: 20, reason: `${i.total_loans_completed} loans, ${(onTime * 100).toFixed(0)}% on-time` }; }
    else if (onTime >= 0.80) { rep = 14; breakdown.reputation = { points: 14, max: 20, reason: `${i.total_loans_completed} loans, ${(onTime * 100).toFixed(0)}% on-time` }; }
    else { rep = 6; breakdown.reputation = { points: 6, max: 20, reason: `${i.total_loans_completed} loans, ${(onTime * 100).toFixed(0)}% on-time` }; }
  }

  return {
    total: id + inc + stab + fin + rep,
    components: { identity: id, income: inc, stability: stab, financial: fin, reputation: rep },
    breakdown,
    algorithm_version: "v1.0",
  };
}
