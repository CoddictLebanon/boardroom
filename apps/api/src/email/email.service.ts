import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private fromEmail: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);
    this.fromEmail = this.configService.get<string>('EMAIL_FROM') || 'noreply@chairboard.me';
  }

  async sendInvitationEmail(params: {
    to: string;
    inviterName: string;
    companyName: string;
    role: string;
    invitationToken: string;
  }): Promise<boolean> {
    const { to, inviterName, companyName, role, invitationToken } = params;

    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const acceptUrl = `${appUrl}/invitations/accept?token=${invitationToken}`;

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [to],
        subject: `You've been invited to join ${companyName} on ChairBoard`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333;">You're Invited!</h1>
            <p>Hi,</p>
            <p><strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> as a <strong>${role.toLowerCase()}</strong> on ChairBoard.</p>
            <p>ChairBoard is a platform for managing board meetings, documents, and resolutions.</p>
            <div style="margin: 30px 0;">
              <a href="${acceptUrl}" style="background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #666; font-size: 14px; word-break: break-all;">${acceptUrl}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="color: #999; font-size: 12px;">If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
        `,
      });

      if (error) {
        this.logger.error(`Failed to send invitation email to ${to}: ${error.message}`);
        return false;
      }

      this.logger.log(`Invitation email sent to ${to}, id: ${data?.id}`);
      return true;
    } catch (error) {
      this.logger.error(`Error sending invitation email to ${to}:`, error);
      return false;
    }
  }

  async sendMeetingSummaryEmail(params: {
    to: string;
    meetingTitle: string;
    companyName: string;
    scheduledAt: Date;
    attendees: Array<{ name: string; present: boolean }>;
    agendaItems: Array<{ title: string; notes?: string }>;
    decisions: Array<{ title: string; outcome?: string; votes?: { for: number; against: number; abstain: number } }>;
    notes?: string;
  }): Promise<boolean> {
    const { to, meetingTitle, companyName, scheduledAt, attendees, agendaItems, decisions, notes } = params;

    const formattedDate = new Date(scheduledAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const presentAttendees = attendees.filter(a => a.present);
    const absentAttendees = attendees.filter(a => !a.present);

    const attendeesHtml = `
      <div style="margin: 20px 0;">
        <h3 style="color: #333; margin-bottom: 10px;">Attendance</h3>
        ${presentAttendees.length > 0 ? `<p style="color: #10b981;"><strong>Present:</strong> ${presentAttendees.map(a => a.name).join(', ')}</p>` : ''}
        ${absentAttendees.length > 0 ? `<p style="color: #ef4444;"><strong>Absent:</strong> ${absentAttendees.map(a => a.name).join(', ')}</p>` : ''}
      </div>
    `;

    const agendaHtml = agendaItems.length > 0 ? `
      <div style="margin: 20px 0;">
        <h3 style="color: #333; margin-bottom: 10px;">Agenda Items</h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${agendaItems.map(item => `
            <li style="margin: 8px 0;">
              <strong>${item.title}</strong>
              ${item.notes ? `<p style="color: #666; margin: 4px 0; font-size: 14px;">${item.notes}</p>` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
    ` : '';

    const decisionsHtml = decisions.length > 0 ? `
      <div style="margin: 20px 0;">
        <h3 style="color: #333; margin-bottom: 10px;">Decisions</h3>
        <ul style="margin: 0; padding-left: 20px;">
          ${decisions.map(d => `
            <li style="margin: 8px 0;">
              <strong>${d.title}</strong>
              ${d.outcome ? `
                <span style="margin-left: 8px; padding: 2px 8px; border-radius: 4px; font-size: 12px; ${
                  d.outcome === 'PASSED' ? 'background: #d1fae5; color: #065f46;' :
                  d.outcome === 'REJECTED' ? 'background: #fee2e2; color: #991b1b;' :
                  'background: #f3f4f6; color: #374151;'
                }">
                  ${d.outcome}
                </span>
              ` : ''}
              ${d.votes ? `<p style="color: #666; margin: 4px 0; font-size: 14px;">Votes: ${d.votes.for} for, ${d.votes.against} against, ${d.votes.abstain} abstain</p>` : ''}
            </li>
          `).join('')}
        </ul>
      </div>
    ` : '';

    const notesHtml = notes ? `
      <div style="margin: 20px 0;">
        <h3 style="color: #333; margin-bottom: 10px;">Meeting Notes</h3>
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; color: #374151;">
          ${notes.replace(/\n/g, '<br>')}
        </div>
      </div>
    ` : '';

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [to],
        subject: `Meeting Summary: ${meetingTitle} - ${companyName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0;">Meeting Summary</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0;">${meetingTitle}</p>
            </div>
            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <p style="color: #666;">
                <strong>Date:</strong> ${formattedDate}<br>
                <strong>Company:</strong> ${companyName}
              </p>
              ${attendeesHtml}
              ${agendaHtml}
              ${decisionsHtml}
              ${notesHtml}
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
              <p style="color: #999; font-size: 12px; text-align: center;">
                This summary was automatically generated by ChairBoard.
              </p>
            </div>
          </div>
        `,
      });

      if (error) {
        this.logger.error(`Failed to send meeting summary email to ${to}: ${error.message}`);
        return false;
      }

      this.logger.log(`Meeting summary email sent to ${to}, id: ${data?.id}`);
      return true;
    } catch (error) {
      this.logger.error(`Error sending meeting summary email to ${to}:`, error);
      return false;
    }
  }
}
