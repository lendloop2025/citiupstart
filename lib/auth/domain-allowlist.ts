const NCI_DOMAINS = (process.env.NCI_EMAIL_DOMAINS || "student.ncirl.ie,ncirl.ie")
  .split(",").map(d => d.trim().toLowerCase());

export function isNciEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && NCI_DOMAINS.includes(domain);
}

export function getAllowedDomains(): string[] {
  return [...NCI_DOMAINS];
}
