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

// Modern color palette
const colors = {
  navy: "#1e293b",
  navyLight: "#334155",
  accent: "#3b82f6",
  accentLight: "#eff6ff",
  accentBorder: "#bfdbfe",
  white: "#ffffff",
  gray50: "#f8fafc",
  gray100: "#f1f5f9",
  gray200: "#e2e8f0",
  gray300: "#cbd5e1",
  gray500: "#64748b",
  gray600: "#475569",
  gray700: "#334155",
  gray800: "#1e293b",
  gray900: "#0f172a",
  green: "#16a34a",
  greenBg: "#f0fdf4",
  greenBorder: "#bbf7d0",
  red: "#dc2626",
  redBg: "#fef2f2",
  redBorder: "#fecaca",
  amber: "#d97706",
  amberBg: "#fffbeb",
  amberBorder: "#fde68a",
};

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: colors.white,
    fontFamily: "Helvetica",
    paddingBottom: 80,
  },

  // ─── Header Banner ───
  headerBanner: {
    backgroundColor: colors.navy,
    paddingHorizontal: 40,
    paddingTop: 30,
    paddingBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  logo: {
    width: 44,
    height: 44,
    objectFit: "contain",
  },
  companyName: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: colors.white,
  },
  headerRight: {
    alignItems: "flex-end",
  },
  headerDateLabel: {
    fontSize: 8,
    color: colors.gray300,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  headerDate: {
    fontSize: 11,
    color: colors.white,
  },

  // ─── Accent Bar ───
  accentBar: {
    height: 3,
    backgroundColor: colors.accent,
  },

  // ─── Body Content ───
  body: {
    paddingHorizontal: 40,
    paddingTop: 28,
  },

  // ─── Title Section ───
  titleSection: {
    marginBottom: 24,
  },
  documentLabel: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: colors.accent,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 6,
  },
  meetingTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: colors.gray900,
    marginBottom: 10,
  },

  // ─── Meeting Info Grid ───
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderStyle: "solid",
    borderRadius: 6,
    overflow: "hidden",
  },
  infoCell: {
    width: "50%",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    borderBottomStyle: "solid",
  },
  infoCellLast: {
    borderBottomWidth: 0,
  },
  infoCellRight: {
    borderLeftWidth: 1,
    borderLeftColor: colors.gray200,
    borderLeftStyle: "solid",
  },
  infoLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: colors.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 10,
    color: colors.gray800,
  },

  // ─── Section ───
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionAccent: {
    width: 3,
    height: 14,
    backgroundColor: colors.accent,
    marginRight: 8,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: colors.gray800,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionSubtitle: {
    fontSize: 9,
    color: colors.gray500,
    marginLeft: 6,
  },

  // ─── Divider ───
  divider: {
    height: 1,
    backgroundColor: colors.gray200,
    marginVertical: 18,
  },

  // ─── Attendance Table ───
  attendanceTable: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderStyle: "solid",
    borderRadius: 6,
    overflow: "hidden",
  },
  attendanceHeaderRow: {
    flexDirection: "row",
    backgroundColor: colors.gray100,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    borderBottomStyle: "solid",
  },
  attendanceHeaderText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: colors.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  attendanceRow: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    borderBottomStyle: "solid",
  },
  attendanceRowAlt: {
    backgroundColor: colors.gray50,
  },
  attendanceRowLast: {
    borderBottomWidth: 0,
  },
  attendeeNameCol: {
    flex: 1,
  },
  attendeeTitleCol: {
    flex: 1,
  },
  attendeeStatusCol: {
    width: 70,
    alignItems: "flex-end",
  },
  attendeeName: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: colors.gray800,
  },
  attendeeTitle: {
    fontSize: 9,
    color: colors.gray500,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  statusPresent: {
    backgroundColor: colors.greenBg,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    borderStyle: "solid",
  },
  statusAbsent: {
    backgroundColor: colors.redBg,
    borderWidth: 1,
    borderColor: colors.redBorder,
    borderStyle: "solid",
  },
  statusPresentText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: colors.green,
  },
  statusAbsentText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: colors.red,
  },

  // ─── Agenda ───
  agendaItem: {
    flexDirection: "row",
    marginBottom: 8,
  },
  agendaNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accentLight,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderStyle: "solid",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 1,
  },
  agendaNumberText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.accent,
  },
  agendaContent: {
    flex: 1,
  },
  agendaTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.gray800,
    marginBottom: 2,
  },
  agendaDuration: {
    fontSize: 8,
    color: colors.gray500,
    marginBottom: 3,
  },
  agendaNotes: {
    fontSize: 9,
    color: colors.gray600,
    lineHeight: 1.5,
  },

  // ─── Decisions ───
  decisionCard: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderStyle: "solid",
    borderRadius: 6,
    marginBottom: 8,
    overflow: "hidden",
  },
  decisionCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.gray50,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    borderBottomStyle: "solid",
  },
  decisionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: colors.gray800,
    flex: 1,
  },
  outcomeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    marginLeft: 8,
  },
  outcomePassed: {
    backgroundColor: colors.greenBg,
    borderWidth: 1,
    borderColor: colors.greenBorder,
    borderStyle: "solid",
  },
  outcomeRejected: {
    backgroundColor: colors.redBg,
    borderWidth: 1,
    borderColor: colors.redBorder,
    borderStyle: "solid",
  },
  outcomeTabled: {
    backgroundColor: colors.amberBg,
    borderWidth: 1,
    borderColor: colors.amberBorder,
    borderStyle: "solid",
  },
  outcomePassedText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: colors.green,
  },
  outcomeRejectedText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: colors.red,
  },
  outcomeTabledText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: colors.amber,
  },
  decisionBody: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  voteBar: {
    flexDirection: "row",
    gap: 12,
  },
  voteItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  voteDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  voteDotFor: {
    backgroundColor: colors.green,
  },
  voteDotAgainst: {
    backgroundColor: colors.red,
  },
  voteDotAbstain: {
    backgroundColor: colors.gray300,
  },
  voteLabel: {
    fontSize: 8,
    color: colors.gray600,
  },
  voteCount: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: colors.gray800,
  },
  noVotingText: {
    fontSize: 8,
    color: colors.gray500,
    fontStyle: "italic",
  },

  // ─── Action Items ───
  actionTable: {
    borderWidth: 1,
    borderColor: colors.gray200,
    borderStyle: "solid",
    borderRadius: 6,
    overflow: "hidden",
  },
  actionHeaderRow: {
    flexDirection: "row",
    backgroundColor: colors.gray100,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
    borderBottomStyle: "solid",
  },
  actionHeaderText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: colors.gray500,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: "row",
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    borderBottomStyle: "solid",
    alignItems: "center",
  },
  actionRowAlt: {
    backgroundColor: colors.gray50,
  },
  actionRowLast: {
    borderBottomWidth: 0,
  },
  actionTitleCol: {
    flex: 2,
  },
  actionAssigneeCol: {
    flex: 1,
  },
  actionDueCol: {
    width: 70,
  },
  actionStatusCol: {
    width: 60,
    alignItems: "flex-end",
  },
  actionTitleText: {
    fontSize: 9,
    color: colors.gray800,
  },
  actionAssigneeText: {
    fontSize: 9,
    color: colors.gray600,
  },
  actionDueText: {
    fontSize: 8,
    color: colors.gray500,
  },
  actionStatusBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderStyle: "solid",
  },
  actionStatusText: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: colors.gray600,
  },

  // ─── Notes ───
  noteBlock: {
    backgroundColor: colors.gray50,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    borderLeftStyle: "solid",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 2,
  },
  noteContent: {
    fontSize: 9,
    lineHeight: 1.6,
    color: colors.gray700,
  },

  // ─── Footer ───
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    borderTopStyle: "solid",
    backgroundColor: colors.gray50,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  footerLeft: {
    flex: 1,
  },
  footerText: {
    fontSize: 7,
    color: colors.gray500,
    marginBottom: 1,
  },
  footerRight: {
    alignItems: "flex-end",
  },
  footerGenerated: {
    fontSize: 7,
    color: colors.gray300,
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

const formatTime = (dateStr?: string | null) => {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "h:mm a");
  } catch {
    return dateStr;
  }
};

const formatFullDate = (dateStr?: string | null) => {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "EEEE, MMMM d, yyyy");
  } catch {
    return dateStr;
  }
};

const formatShortDate = (dateStr?: string | null) => {
  if (!dateStr) return "";
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
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
    footerLines.push(`Reg. No: ${company.registrationNo}`);
  }
  const contactParts: string[] = [];
  if (company.phone) contactParts.push(company.phone);
  if (company.website) contactParts.push(company.website);
  if (contactParts.length > 0) {
    footerLines.push(contactParts.join(" | "));
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ─── Dark Header Banner ─── */}
        <View style={styles.headerBanner}>
          <View style={styles.headerLeft}>
            {company.logo && (
              <Image src={company.logo} style={styles.logo} />
            )}
            <Text style={styles.companyName}>{company.name}</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerDateLabel}>Meeting Date</Text>
            <Text style={styles.headerDate}>
              {formatFullDate(meeting.scheduledAt)}
            </Text>
          </View>
        </View>

        {/* ─── Blue Accent Bar ─── */}
        <View style={styles.accentBar} />

        {/* ─── Body ─── */}
        <View style={styles.body}>
          {/* ─── Document Label + Title ─── */}
          <View style={styles.titleSection}>
            <Text style={styles.documentLabel}>Meeting Minutes</Text>
            <Text style={styles.meetingTitle}>{meeting.title}</Text>
          </View>

          {/* ─── Meeting Info Grid ─── */}
          <View style={styles.infoGrid}>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>Date</Text>
              <Text style={styles.infoValue}>
                {formatFullDate(meeting.scheduledAt)}
              </Text>
            </View>
            <View style={[styles.infoCell, styles.infoCellRight]}>
              <Text style={styles.infoLabel}>Time</Text>
              <Text style={styles.infoValue}>
                {formatTime(meeting.scheduledAt)}
              </Text>
            </View>
            <View style={[styles.infoCell, !meeting.location ? styles.infoCellLast : {}]}>
              <Text style={styles.infoLabel}>Duration</Text>
              <Text style={styles.infoValue}>
                {meeting.duration} minutes
              </Text>
            </View>
            {meeting.location ? (
              <>
                <View style={[styles.infoCell, styles.infoCellRight]}>
                  <Text style={styles.infoLabel}>Location</Text>
                  <Text style={styles.infoValue}>{meeting.location}</Text>
                </View>
              </>
            ) : (
              <View style={[styles.infoCell, styles.infoCellRight, styles.infoCellLast]}>
                <Text style={styles.infoLabel}>Attendees</Text>
                <Text style={styles.infoValue}>
                  {presentCount} of {attendees.length} present
                </Text>
              </View>
            )}
            {meeting.location && (
              <>
                <View style={[styles.infoCell, styles.infoCellLast]}>
                  <Text style={styles.infoLabel}>Attendees</Text>
                  <Text style={styles.infoValue}>
                    {presentCount} of {attendees.length} present
                  </Text>
                </View>
                <View style={[styles.infoCell, styles.infoCellRight, styles.infoCellLast]}>
                  <Text style={styles.infoLabel}>Status</Text>
                  <Text style={styles.infoValue}>Completed</Text>
                </View>
              </>
            )}
          </View>

          {/* ─── Attendance ─── */}
          {attendees.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>Attendance</Text>
              </View>
              <View style={styles.attendanceTable}>
                <View style={styles.attendanceHeaderRow}>
                  <View style={styles.attendeeNameCol}>
                    <Text style={styles.attendanceHeaderText}>Name</Text>
                  </View>
                  <View style={styles.attendeeTitleCol}>
                    <Text style={styles.attendanceHeaderText}>Title</Text>
                  </View>
                  <View style={styles.attendeeStatusCol}>
                    <Text style={styles.attendanceHeaderText}>Status</Text>
                  </View>
                </View>
                {attendees.map((attendee, index) => {
                  const name = attendee.member?.user
                    ? `${attendee.member.user.firstName || ""} ${attendee.member.user.lastName || ""}`.trim()
                    : "Unknown";
                  const title = attendee.member?.title || "—";
                  const isLast = index === attendees.length - 1;
                  return (
                    <View
                      key={attendee.id}
                      style={[
                        styles.attendanceRow,
                        index % 2 === 1 ? styles.attendanceRowAlt : {},
                        isLast ? styles.attendanceRowLast : {},
                      ]}
                    >
                      <View style={styles.attendeeNameCol}>
                        <Text style={styles.attendeeName}>{name}</Text>
                      </View>
                      <View style={styles.attendeeTitleCol}>
                        <Text style={styles.attendeeTitle}>{title}</Text>
                      </View>
                      <View style={styles.attendeeStatusCol}>
                        <View
                          style={[
                            styles.statusBadge,
                            attendee.isPresent ? styles.statusPresent : styles.statusAbsent,
                          ]}
                        >
                          <Text
                            style={
                              attendee.isPresent
                                ? styles.statusPresentText
                                : styles.statusAbsentText
                            }
                          >
                            {attendee.isPresent ? "Present" : "Absent"}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ─── Agenda ─── */}
          {agendaItems.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>Agenda</Text>
              </View>
              {agendaItems.map((item, index) => (
                <View key={item.id} style={styles.agendaItem}>
                  <View style={styles.agendaNumber}>
                    <Text style={styles.agendaNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.agendaContent}>
                    <Text style={styles.agendaTitle}>{item.title}</Text>
                    {item.duration && (
                      <Text style={styles.agendaDuration}>
                        {item.duration} min
                      </Text>
                    )}
                    {item.notes && (
                      <Text style={styles.agendaNotes}>{item.notes}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ─── Decisions ─── */}
          {decisions.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>Decisions</Text>
              </View>
              {decisions.map((decision) => {
                const votes = decision.votes || [];
                const forVotes = votes.filter((v) => v.vote === "FOR").length;
                const againstVotes = votes.filter((v) => v.vote === "AGAINST").length;
                const abstainVotes = votes.filter((v) => v.vote === "ABSTAIN").length;

                const outcomeBadgeStyle =
                  decision.outcome === "PASSED" ? styles.outcomePassed :
                  decision.outcome === "REJECTED" ? styles.outcomeRejected :
                  styles.outcomeTabled;
                const outcomeTextStyle =
                  decision.outcome === "PASSED" ? styles.outcomePassedText :
                  decision.outcome === "REJECTED" ? styles.outcomeRejectedText :
                  styles.outcomeTabledText;

                return (
                  <View key={decision.id} style={styles.decisionCard}>
                    <View style={styles.decisionCardHeader}>
                      <Text style={styles.decisionTitle}>{decision.title}</Text>
                      {decision.outcome && (
                        <View style={[styles.outcomeBadge, outcomeBadgeStyle]}>
                          <Text style={outcomeTextStyle}>
                            {decision.outcome}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.decisionBody}>
                      {decision.votingEnabled && votes.length > 0 ? (
                        <View style={styles.voteBar}>
                          <View style={styles.voteItem}>
                            <View style={[styles.voteDot, styles.voteDotFor]} />
                            <Text style={styles.voteLabel}>For </Text>
                            <Text style={styles.voteCount}>{forVotes}</Text>
                          </View>
                          <View style={styles.voteItem}>
                            <View style={[styles.voteDot, styles.voteDotAgainst]} />
                            <Text style={styles.voteLabel}>Against </Text>
                            <Text style={styles.voteCount}>{againstVotes}</Text>
                          </View>
                          <View style={styles.voteItem}>
                            <View style={[styles.voteDot, styles.voteDotAbstain]} />
                            <Text style={styles.voteLabel}>Abstain </Text>
                            <Text style={styles.voteCount}>{abstainVotes}</Text>
                          </View>
                        </View>
                      ) : !decision.votingEnabled ? (
                        <Text style={styles.noVotingText}>No voting required</Text>
                      ) : (
                        <Text style={styles.noVotingText}>No votes cast</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* ─── Action Items ─── */}
          {actionItems.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>Action Items</Text>
                <Text style={styles.sectionSubtitle}>
                  ({actionItems.length})
                </Text>
              </View>
              <View style={styles.actionTable}>
                <View style={styles.actionHeaderRow}>
                  <View style={styles.actionTitleCol}>
                    <Text style={styles.actionHeaderText}>Task</Text>
                  </View>
                  <View style={styles.actionAssigneeCol}>
                    <Text style={styles.actionHeaderText}>Assigned To</Text>
                  </View>
                  <View style={styles.actionDueCol}>
                    <Text style={styles.actionHeaderText}>Due Date</Text>
                  </View>
                  <View style={styles.actionStatusCol}>
                    <Text style={styles.actionHeaderText}>Status</Text>
                  </View>
                </View>
                {actionItems.map((item, index) => {
                  const assigneeName = item.assignee
                    ? `${item.assignee.firstName || ""} ${item.assignee.lastName || ""}`.trim()
                    : "Unassigned";
                  const isLast = index === actionItems.length - 1;
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.actionRow,
                        index % 2 === 1 ? styles.actionRowAlt : {},
                        isLast ? styles.actionRowLast : {},
                      ]}
                    >
                      <View style={styles.actionTitleCol}>
                        <Text style={styles.actionTitleText}>{item.title}</Text>
                      </View>
                      <View style={styles.actionAssigneeCol}>
                        <Text style={styles.actionAssigneeText}>{assigneeName}</Text>
                      </View>
                      <View style={styles.actionDueCol}>
                        <Text style={styles.actionDueText}>
                          {item.dueDate ? formatShortDate(item.dueDate) : "—"}
                        </Text>
                      </View>
                      <View style={styles.actionStatusCol}>
                        <View style={styles.actionStatusBadge}>
                          <Text style={styles.actionStatusText}>
                            {item.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ─── Meeting Notes ─── */}
          {notes.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionAccent} />
                <Text style={styles.sectionTitle}>Meeting Notes</Text>
              </View>
              {notes.map((note) => (
                <View key={note.id} style={styles.noteBlock}>
                  <Text style={styles.noteContent}>{note.content}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ─── Footer ─── */}
        <View style={styles.footer} fixed>
          <View style={styles.footerLeft}>
            {footerLines.map((line, index) => (
              <Text key={index} style={styles.footerText}>
                {line}
              </Text>
            ))}
          </View>
          <View style={styles.footerRight}>
            <Text style={styles.footerGenerated}>
              Generated by Chairboard
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
