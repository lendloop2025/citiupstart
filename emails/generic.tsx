import * as React from "react";
import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from "@react-email/components";

export function GenericEmail({ firstName, title, body, linkUrl }: {
  firstName: string; title: string; body: string; linkUrl?: string;
}) {
  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Body style={{ fontFamily: "system-ui, sans-serif", background: "#f7f7f7", padding: "32px 0" }}>
        <Container style={{ background: "#fff", borderRadius: 12, padding: 32, maxWidth: 560, margin: "0 auto" }}>
          <Heading style={{ color: "#10b981", fontSize: 22, marginBottom: 8 }}>121.ai by LendLoop</Heading>
          <Text style={{ fontSize: 16, color: "#111" }}>Hi {firstName},</Text>
          <Heading as="h2" style={{ fontSize: 18, marginTop: 16, color: "#111" }}>{title}</Heading>
          <Text style={{ fontSize: 15, lineHeight: 1.6, color: "#333", whiteSpace: "pre-wrap" }}>{body}</Text>
          {linkUrl && (
            <Section style={{ marginTop: 24 }}>
              <Link href={linkUrl} style={{
                background: "#10b981", color: "#fff", padding: "12px 20px",
                borderRadius: 8, textDecoration: "none", fontWeight: 600, display: "inline-block"
              }}>Open 121.ai</Link>
            </Section>
          )}
          <Text style={{ fontSize: 12, color: "#888", marginTop: 32, borderTop: "1px solid #eee", paddingTop: 16 }}>
            121.ai by LendLoop — Pre-MVP demo for the NCI community.<br />
            Capital is at risk. Your loans are not protected by deposit insurance.<br />
            This service is not yet authorised by the Central Bank of Ireland.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
