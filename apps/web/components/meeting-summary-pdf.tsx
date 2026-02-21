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
import type {
  Meeting,
  MeetingAttendee,
  Decision,
  ActionItem,
  MeetingNote,
  AgendaItem,
  CompanyForPDF,
} from "@/lib/types";

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
  dateLabel: {
    fontSize: 10,
    color: "#666666",
    textAlign: "right",
  },
  titleSection: {
    marginBottom: 24,
    textAlign: "center",
  },
  mainTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  meetingTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 4,
  },
  meetingMeta: {
    fontSize: 10,
    color: "#666666",
    marginBottom: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    textTransform: "uppercase",
    color: "#333333",
    borderBottomWidth: 1,
    borderBottomColor: "#cccccc",
    borderBottomStyle: "solid",
    paddingBottom: 4,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 3,
  },
  attendeeName: {
    fontSize: 10,
    flex: 1,
  },
  attendeeStatus: {
    fontSize: 10,
    width: 60,
    textAlign: "right",
  },
  presentText: {
    color: "#16a34a",
  },
  absentText: {
    color: "#dc2626",
  },
  agendaItem: {
    marginBottom: 10,
  },
  agendaTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 2,
  },
  agendaNotes: {
    fontSize: 10,
    color: "#444444",
    lineHeight: 1.5,
    marginLeft: 12,
  },
  decisionItem: {
    marginBottom: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "solid",
    borderRadius: 4,
  },
  decisionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 2,
  },
  decisionOutcome: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 2,
  },
  passedText: {
    color: "#16a34a",
  },
  rejectedText: {
    color: "#dc2626",
  },
  tabledText: {
    color: "#ca8a04",
  },
  voteTally: {
    fontSize: 9,
    color: "#666666",
  },
  actionItem: {
    marginBottom: 8,
    paddingLeft: 12,
  },
  actionTitle: {
    fontSize: 10,
    fontWeight: "bold",
  },
  actionMeta: {
    fontSize: 9,
    color: "#666666",
    marginTop: 1,
  },
  noteContent: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#444444",
    marginBottom: 6,
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

interface MeetingSummaryPDFProps {
  meeting: Meeting;
  company: CompanyForPDF;
  attendees: MeetingAttendee[];
  agendaItems: AgendaItem[];
  decisions: Decision[];
  actionItems: ActionItem[];
  notes: MeetingNote[];
}

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "MMMM d, yyyy");
  } catch {
    return dateStr;
  }
};

const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "EEEE, MMMM d, yyyy 'at' h:mm a");
  } catch {
    return dateStr;
  }
};

export function MeetingSummaryPDF({
  meeting,
  company,
  attendees,
  agendaItems,
  decisions,
  actionItems,
  notes,
}: MeetingSummaryPDFProps) {
  const presentCount = attendees.filter((a) => a.isPresent).length;

  const footerLines: string[] = [];
  if (company.address || company.city || company.country) {
    footerLines.push(
      [company.address, company.city, company.country].filter(Boolean).join(", ")
    );
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
          <Text style={styles.dateLabel}>
            {formatDate(meeting.scheduledAt)}
          </Text>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>MEETING MINUTES</Text>
          <Text style={styles.meetingTitle}>{meeting.title}</Text>
          <Text style={styles.meetingMeta}>
            {formatDateTime(meeting.scheduledAt)} — {meeting.duration} minutes
          </Text>
          {meeting.location && (
            <Text style={styles.meetingMeta}>Location: {meeting.location}</Text>
          )}
        </View>

        {/* Attendance */}
        {attendees.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Attendance ({presentCount} of {attendees.length} present)
            </Text>
            {attendees.map((attendee) => {
              const name = attendee.member?.user
                ? `${attendee.member.user.firstName || ""} ${attendee.member.user.lastName || ""}`.trim()
                : "Unknown";
              const title = attendee.member?.title || "";
              return (
                <View key={attendee.id} style={styles.row}>
                  <Text style={styles.attendeeName}>
                    {name}{title ? ` — ${title}` : ""}
                  </Text>
                  <Text
                    style={[
                      styles.attendeeStatus,
                      attendee.isPresent ? styles.presentText : styles.absentText,
                    ]}
                  >
                    {attendee.isPresent ? "Present" : "Absent"}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Agenda */}
        {agendaItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Agenda</Text>
            {agendaItems.map((item, index) => (
              <View key={item.id} style={styles.agendaItem}>
                <Text style={styles.agendaTitle}>
                  {index + 1}. {item.title}
                  {item.duration ? ` (${item.duration} min)` : ""}
                </Text>
                {item.notes && (
                  <Text style={styles.agendaNotes}>{item.notes}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Decisions */}
        {decisions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Decisions</Text>
            {decisions.map((decision) => {
              const votes = decision.votes || [];
              const forVotes = votes.filter((v) => v.vote === "FOR").length;
              const againstVotes = votes.filter((v) => v.vote === "AGAINST").length;
              const abstainVotes = votes.filter((v) => v.vote === "ABSTAIN").length;
              const outcomeStyle =
                decision.outcome === "PASSED" ? styles.passedText :
                decision.outcome === "REJECTED" ? styles.rejectedText :
                styles.tabledText;

              return (
                <View key={decision.id} style={styles.decisionItem}>
                  <Text style={styles.decisionTitle}>{decision.title}</Text>
                  {decision.outcome && (
                    <Text style={[styles.decisionOutcome, outcomeStyle]}>
                      Outcome: {decision.outcome}
                    </Text>
                  )}
                  {decision.votingEnabled && votes.length > 0 && (
                    <Text style={styles.voteTally}>
                      Votes — For: {forVotes} | Against: {againstVotes} | Abstain: {abstainVotes}
                    </Text>
                  )}
                  {!decision.votingEnabled && (
                    <Text style={styles.voteTally}>No voting</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Action Items */}
        {actionItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Action Items</Text>
            {actionItems.map((item) => {
              const assigneeName = item.assignee
                ? `${item.assignee.firstName || ""} ${item.assignee.lastName || ""}`.trim()
                : "Unassigned";
              return (
                <View key={item.id} style={styles.actionItem}>
                  <Text style={styles.actionTitle}>{item.title}</Text>
                  <Text style={styles.actionMeta}>
                    Assigned to: {assigneeName}
                    {item.dueDate ? ` — Due: ${formatDate(item.dueDate)}` : ""}
                    {` — ${item.status}`}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Meeting Notes */}
        {notes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Meeting Notes</Text>
            {notes.map((note) => (
              <Text key={note.id} style={styles.noteContent}>
                {note.content}
              </Text>
            ))}
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
