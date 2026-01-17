"use client";

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import { format } from "date-fns";
import type { Resolution, ResolutionSignatureForPDF, CompanyForPDF } from "@/lib/types";

// Define styles for the PDF document
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 50,
    fontFamily: "Times-Roman",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 30,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    width: 60,
    height: 60,
    objectFit: "contain",
  },
  companyName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  resolutionNumber: {
    fontSize: 12,
    color: "#666666",
    textAlign: "right",
  },
  titleSection: {
    marginBottom: 30,
    textAlign: "center",
  },
  mainTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  resolutionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  category: {
    fontSize: 10,
    color: "#666666",
    marginBottom: 4,
  },
  dateInfo: {
    fontSize: 10,
    color: "#666666",
  },
  contentSection: {
    marginBottom: 40,
    flexGrow: 1,
  },
  contentLabel: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 10,
    textTransform: "uppercase",
    color: "#333333",
  },
  content: {
    fontSize: 12,
    lineHeight: 1.6,
    textAlign: "justify",
  },
  signaturesSection: {
    marginBottom: 30,
  },
  signaturesTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 15,
    textTransform: "uppercase",
    color: "#333333",
  },
  signaturesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 30,
  },
  signatureBlock: {
    width: "45%",
    marginBottom: 20,
  },
  signatureImage: {
    width: 150,
    height: 50,
    objectFit: "contain",
    marginBottom: 8,
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    borderBottomStyle: "solid",
    width: 150,
    marginBottom: 8,
  },
  signerName: {
    fontSize: 11,
    fontWeight: "bold",
  },
  signerTitle: {
    fontSize: 10,
    color: "#666666",
    marginBottom: 2,
  },
  signedDate: {
    fontSize: 9,
    color: "#888888",
  },
  stampSection: {
    marginTop: 20,
    alignItems: "flex-end",
  },
  stamp: {
    width: 100,
    height: 100,
    objectFit: "contain",
  },
  footer: {
    marginTop: "auto",
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#cccccc",
    borderTopStyle: "solid",
  },
  footerText: {
    fontSize: 9,
    color: "#666666",
    textAlign: "center",
    marginBottom: 2,
  },
});

// Interfaces for the component props
interface ResolutionPDFProps {
  resolution: Pick<Resolution, "number" | "title" | "content" | "category" | "effectiveDate" | "createdAt">;
  company: CompanyForPDF;
  signatures: ResolutionSignatureForPDF[];
  includeStamp?: boolean;
}

// Category labels for display
const categoryLabels: Record<string, string> = {
  FINANCIAL: "Financial",
  GOVERNANCE: "Governance",
  HR: "Human Resources",
  OPERATIONS: "Operations",
  STRATEGIC: "Strategic",
  OTHER: "Other",
};

export function ResolutionPDF({
  resolution,
  company,
  signatures,
  includeStamp = false,
}: ResolutionPDFProps) {
  // Format dates for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return format(new Date(dateStr), "MMMM d, yyyy");
    } catch (error) {
      console.error("Failed to format date:", dateStr, error);
      return dateStr; // Return original string as fallback
    }
  };

  // Get first 2 signatures for display
  const displaySignatures = signatures.slice(0, 2);

  // Build footer info lines
  const footerLines: string[] = [];
  if (company.address || company.city || company.country) {
    const addressParts = [company.address, company.city, company.country].filter(Boolean);
    footerLines.push(addressParts.join(", "));
  }
  if (company.registrationNo) {
    footerLines.push(`Registration No: ${company.registrationNo}`);
  }
  const contactParts: string[] = [];
  if (company.phone) contactParts.push(`Tel: ${company.phone}`);
  if (company.website) contactParts.push(company.website);
  if (contactParts.length > 0) {
    footerLines.push(contactParts.join(" | "));
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {company.logo && (
              <Image src={company.logo} style={styles.logo} />
            )}
            <Text style={styles.companyName}>{company.name}</Text>
          </View>
          <Text style={styles.resolutionNumber}>{resolution.number}</Text>
        </View>

        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>RESOLUTION OF THE BOARD OF DIRECTORS</Text>
          <Text style={styles.resolutionTitle}>{resolution.title}</Text>
          <Text style={styles.category}>
            Category: {categoryLabels[resolution.category] || resolution.category}
          </Text>
          <Text style={styles.dateInfo}>
            Created: {formatDate(resolution.createdAt)}
            {resolution.effectiveDate && ` | Effective: ${formatDate(resolution.effectiveDate)}`}
          </Text>
        </View>

        {/* Content Section */}
        <View style={styles.contentSection}>
          <Text style={styles.contentLabel}>Resolution</Text>
          <Text style={styles.content}>{resolution.content}</Text>
        </View>

        {/* Signatures Section */}
        {displaySignatures.length > 0 && (
          <View style={styles.signaturesSection}>
            <Text style={styles.signaturesTitle}>Authorized Signatures</Text>
            <View style={styles.signaturesGrid}>
              {displaySignatures.map((sig, index) => (
                <View key={index} style={styles.signatureBlock}>
                  {sig.user.signatureUrl ? (
                    <Image src={sig.user.signatureUrl} style={styles.signatureImage} />
                  ) : (
                    <View style={styles.signatureLine} />
                  )}
                  <Text style={styles.signerName}>
                    {sig.user.firstName} {sig.user.lastName}
                  </Text>
                  {sig.title && <Text style={styles.signerTitle}>{sig.title}</Text>}
                  {sig.signedAt && (
                    <Text style={styles.signedDate}>
                      Signed: {formatDate(sig.signedAt)}
                    </Text>
                  )}
                </View>
              ))}
            </View>

            {/* Company Stamp */}
            {includeStamp && company.stampUrl && (
              <View style={styles.stampSection}>
                <Image src={company.stampUrl} style={styles.stamp} />
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        {footerLines.length > 0 && (
          <View style={styles.footer}>
            {footerLines.map((line, index) => (
              <Text key={index} style={styles.footerText}>
                {line}
              </Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
