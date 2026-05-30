import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export interface AgreementFacts {
  loanId: string;
  borrowerName: string;
  lenderName: string;
  principalEur: string;
  aprPct: string;
  termMonths: number;
  monthlyPaymentEur: string;
  totalRepaymentEur: string;
  community: string;
}

export interface AgreementNarrative {
  preamble: string;
  sections: Array<{ title: string; paragraphs: string[] }>;
}

const SYSTEM_PROMPT = `You are a contracts lawyer drafting plain-English clauses for a peer-to-peer student loan agreement on the 121.ai by LendLoop platform (Republic of Ireland).

Hard requirements:
- Output ONLY a JSON object matching this exact shape: { "preamble": string, "sections": [ { "title": string, "paragraphs": string[] } ] }. Return raw JSON with no markdown fences, no surrounding prose, no explanation.
- Sections must be exactly four entries in this order: "Repayment Obligations", "Default and Late Payment", "Platform Role and Risk Disclosures", "Governing Law and Electronic Signature".
- Output ONLY the legal narrative paragraphs requested. The platform renders the financial table, repayment schedule, parties block, and signature block separately — do not duplicate them.
- Keep it factual, neutral, and readable. No marketing language. No emoji.
- Governing law: Republic of Ireland. Reference the Electronic Commerce Act 2000 and eIDAS Regulation (EU) No 910/2014 for electronic signatures.
- Platform is a technology intermediary, NOT a party to the loan, NOT a bank, NOT authorised by the Central Bank of Ireland, and does NOT guarantee repayment. The Lender's capital is at risk with no deposit insurance or compensation scheme.
- Late payment: 2% of the missed instalment accrues per week outstanding; loan defaults after 90 days outstanding; Borrower remains liable for the full balance.
- Early repayment is permitted in full or in part at any time without penalty.
- Each paragraph must be a complete sentence or two — do not number them, do not add bullet points, do not include section numbers (the renderer adds those).`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["preamble", "sections"],
  properties: {
    preamble: {
      type: "string",
      description:
        "One short paragraph (2-3 sentences) introducing the agreement, naming both parties, the platform, and the binding nature of the contract.",
    },
    sections: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "paragraphs"],
        properties: {
          title: { type: "string" },
          paragraphs: {
            type: "array",
            minItems: 1,
            maxItems: 3,
            items: { type: "string" },
          },
        },
      },
      description:
        "Exactly four sections, in this order: 'Repayment Obligations', 'Default and Late Payment', 'Platform Role and Risk Disclosures', 'Governing Law and Electronic Signature'.",
    },
  },
} as const;

const cache = new Map<string, AgreementNarrative>();

let client: Anthropic | null = null;
function getClient() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || apiKey.startsWith("<")) {
      throw new Error("ANTHROPIC_API_KEY is not configured in .env.local");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export async function generateAgreementNarrative(
  facts: AgreementFacts,
): Promise<AgreementNarrative> {
  const cached = cache.get(facts.loanId);
  if (cached) return cached;

  const userPrompt = `Draft the agreement clauses for this loan:

- Loan ID: ${facts.loanId}
- Borrower: ${facts.borrowerName}
- Lender: ${facts.lenderName}
- Community: ${facts.community}
- Principal: €${facts.principalEur}
- APR: ${facts.aprPct}%
- Term: ${facts.termMonths} months
- Monthly payment: €${facts.monthlyPaymentEur}
- Total repayment: €${facts.totalRepaymentEur}

Return JSON matching the schema. Sections in order: Repayment Obligations, Default and Late Payment, Platform Role and Risk Disclosures, Governing Law and Electronic Signature.`;

  const response = await getClient().messages.create({
    model: "claude-opus-4-7",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const block = response.content.find((b) => b.type === "text");
  if (block?.type !== "text") {
    throw new Error("Claude returned no text block for agreement narrative");
  }
  const trimmed = block.text.trim().replaceAll(/^```(?:json)?\s*|\s*```$/g, "");
  const parsed = JSON.parse(trimmed) as AgreementNarrative;
  cache.set(facts.loanId, parsed);
  return parsed;
}
