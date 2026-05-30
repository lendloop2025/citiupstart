import { renderToBuffer } from "@react-pdf/renderer";
import * as React from "react";
import { LoanAgreementPDF, type AgreementProps } from "./agreement";

export async function renderAgreementPdf(props: AgreementProps): Promise<Buffer> {
  return renderToBuffer(React.createElement(LoanAgreementPDF, props) as any);
}
