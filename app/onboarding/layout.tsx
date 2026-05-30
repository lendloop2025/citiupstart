import Link from "next/link";

const steps = [
  { path: "/onboarding/personal-details", label: "Personal" },
  { path: "/onboarding/two-factor", label: "Two-factor" },
  { path: "/onboarding/identity", label: "Identity" },
  { path: "/onboarding/assessment", label: "Assessment" },
  { path: "/onboarding/complete", label: "Complete" },
];

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen px-4 py-8 bg-[var(--bg)]">
      <div className="max-w-xl mx-auto">
        <Link href="/" className="text-2xl font-bold text-[var(--primary)] block text-center mb-6">121.ai</Link>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6">
          <ol className="flex justify-between text-xs text-[var(--muted)] mb-6">
            {steps.map((s, i) => (
              <li key={s.path}>{i + 1}. {s.label}</li>
            ))}
          </ol>
          {children}
        </div>
      </div>
    </div>
  );
}
