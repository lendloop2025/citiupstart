import * as React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

// Workaround for "Cannot read properties of undefined (reading 'unitsPerEm')":
// the bundled Standard 14 PDF fonts (Helvetica etc.) don't load reliably under
// Next.js + Turbopack, so we register a real TTF face up-front. jsDelivr serves
// the upstream googlefonts/roboto repo and returns proper `font/ttf`;
// @react-pdf caches the fetch after the first render.
Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/gh/googlefonts/roboto/src/hinted/Roboto-Regular.ttf",
      fontWeight: "normal",
    },
    {
      src: "https://cdn.jsdelivr.net/gh/googlefonts/roboto/src/hinted/Roboto-Bold.ttf",
      fontWeight: "bold",
    },
  ],
});
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, fontFamily: "Roboto", color: "#222" },
  title: { fontSize: 16, fontWeight: 700, marginBottom: 4, textAlign: "center" },
  subtitle: { fontSize: 10, marginBottom: 18, textAlign: "center", color: "#666" },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontWeight: 700, marginBottom: 4, borderBottom: "1px solid #999", paddingBottom: 2 },
  row: { flexDirection: "row", marginBottom: 3 },
  label: { width: 160, color: "#444" },
  value: { flex: 1, fontWeight: 700 },
  para: { marginBottom: 6, lineHeight: 1.4 },
  table: { marginTop: 6, border: "1px solid #aaa" },
  trh: { flexDirection: "row", backgroundColor: "#eee", padding: 4, fontWeight: 700, fontSize: 9 },
  tr: { flexDirection: "row", padding: 4, borderTop: "1px solid #ddd", fontSize: 9 },
  td1: { width: 30 }, td2: { width: 80 }, td3: { width: 70 }, td4: { width: 70 }, td5: { width: 70 },
  signature: { marginTop: 18, padding: 10, border: "1px solid #ccc", backgroundColor: "#fafafa" },
});

export interface AgreementProps {
  loanId: string;
  borrower: { name: string; email: string; address: string };
  lender: { name: string; email: string; address: string };
  principalEur: string;
  aprPct: string;
  termMonths: number;
  monthlyPaymentEur: string;
  totalInterestEur: string;
  totalRepaymentEur: string;
  schedule: Array<{ n: number; due: string; principal: string; interest: string; total: string }>;
  borrowerSignedAt?: string;
  borrowerIp?: string;
  lenderSignedAt?: string;
  lenderIp?: string;
  narrative?: {
    preamble: string;
    sections: Array<{ title: string; paragraphs: string[] }>;
  };
}

export function LoanAgreementPDF(p: AgreementProps) {
  const narrativeSections = p.narrative?.sections ?? [];
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Peer-to-Peer Loan Agreement</Text>
        <Text style={styles.subtitle}>121.ai by LendLoop · Loan ID: {p.loanId}</Text>

        {p.narrative?.preamble && (
          <View style={styles.section}>
            <Text style={styles.para}>{p.narrative.preamble}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Parties</Text>
          <View style={styles.row}><Text style={styles.label}>Borrower</Text><Text style={styles.value}>{p.borrower.name} ({p.borrower.email})</Text></View>
          <View style={styles.row}><Text style={styles.label}>Borrower address</Text><Text style={styles.value}>{p.borrower.address}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Lender</Text><Text style={styles.value}>{p.lender.name} ({p.lender.email})</Text></View>
          <View style={styles.row}><Text style={styles.label}>Lender address</Text><Text style={styles.value}>{p.lender.address}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Platform</Text><Text style={styles.value}>121.ai by LendLoop (intermediary, not a party to this loan)</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Key Financial Terms</Text>
          <View style={styles.row}><Text style={styles.label}>Principal</Text><Text style={styles.value}>€{p.principalEur}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Annual Percentage Rate</Text><Text style={styles.value}>{p.aprPct}%</Text></View>
          <View style={styles.row}><Text style={styles.label}>Term</Text><Text style={styles.value}>{p.termMonths} months</Text></View>
          <View style={styles.row}><Text style={styles.label}>Monthly payment</Text><Text style={styles.value}>€{p.monthlyPaymentEur}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Total interest</Text><Text style={styles.value}>€{p.totalInterestEur}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Total repayment</Text><Text style={styles.value}>€{p.totalRepaymentEur}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Repayment Schedule</Text>
          <View style={styles.table}>
            <View style={styles.trh}>
              <Text style={styles.td1}>#</Text><Text style={styles.td2}>Due Date</Text>
              <Text style={styles.td3}>Principal</Text><Text style={styles.td4}>Interest</Text>
              <Text style={styles.td5}>Total</Text>
            </View>
            {p.schedule.map(row => (
              <View key={row.n} style={styles.tr}>
                <Text style={styles.td1}>{row.n}</Text><Text style={styles.td2}>{row.due}</Text>
                <Text style={styles.td3}>€{row.principal}</Text><Text style={styles.td4}>€{row.interest}</Text>
                <Text style={styles.td5}>€{row.total}</Text>
              </View>
            ))}
          </View>
        </View>

        {narrativeSections.map((sec, i) => (
          <View key={sec.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{i + 4}. {sec.title}</Text>
            {sec.paragraphs.map((para) => (
              <Text key={para.slice(0, 64)} style={styles.para}>{para}</Text>
            ))}
          </View>
        ))}

        <View style={styles.signature}>
          <Text style={{ fontWeight: 700, marginBottom: 4 }}>Electronic Signatures</Text>
          {p.borrowerSignedAt && (
            <Text>Borrower ({p.borrower.name}): signed {p.borrowerSignedAt} from IP {p.borrowerIp || "n/a"}</Text>
          )}
          {p.lenderSignedAt && (
            <Text>Lender ({p.lender.name}): signed {p.lenderSignedAt} from IP {p.lenderIp || "n/a"}</Text>
          )}
          <Text style={{ fontSize: 8, color: "#888", marginTop: 6 }}>
            Both parties consent to electronic signature under the eIDAS Regulation (EU) No 910/2014 and the Irish Electronic Commerce Act 2000.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
