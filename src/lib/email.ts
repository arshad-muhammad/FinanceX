import { Resend } from 'resend';

export interface ExpenseNotificationPayload {
  id: string;
  title: string;
  amount: number;
  category: string;
  paidBy: string;
  date: string | Date;
  notes?: string | null;
  createdBy?: string;
  billImageUrl?: string | null;
  paymentSource?: string;
}

export async function sendNewBillNotification(expense: ExpenseNotificationPayload) {
  console.log(`[Email Notification] Triggered for bill: "${expense.title}" (ID: ${expense.id}) logged by '${expense.createdBy || 'Unknown'}'`);
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('[Email Notification Warning] RESEND_API_KEY is not defined in environment variables.');
      return null;
    }

    const recipient = process.env.NOTIFICATION_EMAIL || 'spherehive@gmail.com';
    const sender = process.env.RESEND_FROM_EMAIL || 'FinanceX <onboarding@resend.dev>';
    const resend = new Resend(apiKey);

    console.log(`[Email Notification] Preparing email payload:`);
    console.log(`  - Sender: ${sender}`);
    console.log(`  - Recipient: ${recipient}`);
    console.log(`  - Title: ${expense.title}`);
    console.log(`  - Amount: ${expense.amount}`);
    console.log(`  - Paid By: ${expense.paidBy}`);

    const formattedAmount = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(expense.amount);

    const formattedDate = new Date(expense.date).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Bill Logged - FinanceX</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #1e293b; border-radius: 16px; border: 1px solid #334155; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px 32px 28px 32px; text-align: left;">
              <div style="font-size: 13px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #c7d2fe; margin-bottom: 6px;">FinanceX Expense Alert</div>
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; line-height: 1.2;">New Bill Added</h1>
            </td>
          </tr>

          <!-- Amount Highlight Card -->
          <tr>
            <td style="padding: 28px 32px 16px 32px;">
              <div style="background-color: #0f172a; border-radius: 12px; border: 1px solid #334155; padding: 24px; text-align: center;">
                <span style="font-size: 13px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Total Amount</span>
                <span style="font-size: 36px; font-weight: 800; color: #38bdf8; letter-spacing: -0.5px;">${formattedAmount}</span>
                <div style="margin-top: 8px; font-size: 15px; font-weight: 600; color: #e2e8f0;">${escapeHtml(expense.title)}</div>
              </div>
            </td>
          </tr>

          <!-- Details Table -->
          <tr>
            <td style="padding: 12px 32px 28px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #334155; font-size: 14px; color: #94a3b8; width: 40%;">Category</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #334155; font-size: 14px; font-weight: 600; color: #f8fafc; text-align: right;">
                    <span style="display: inline-block; background-color: #312e81; color: #a5b4fc; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600;">
                      ${escapeHtml(expense.category)}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #334155; font-size: 14px; color: #94a3b8;">Paid By</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #334155; font-size: 14px; font-weight: 600; color: #f8fafc; text-align: right;">${escapeHtml(expense.paidBy)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #334155; font-size: 14px; color: #94a3b8;">Payment Source</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #334155; font-size: 14px; font-weight: 600; color: #f8fafc; text-align: right;">${escapeHtml(expense.paymentSource || 'N/A')}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #334155; font-size: 14px; color: #94a3b8;">Transaction Date</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #334155; font-size: 14px; font-weight: 600; color: #f8fafc; text-align: right;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #334155; font-size: 14px; color: #94a3b8;">Logged By</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #334155; font-size: 14px; font-weight: 600; color: #f8fafc; text-align: right;">${escapeHtml(expense.createdBy || 'System User')}</td>
                </tr>
                ${expense.notes ? `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #334155; font-size: 14px; color: #94a3b8; vertical-align: top;">Notes</td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #334155; font-size: 14px; color: #cbd5e1; text-align: right;">${escapeHtml(expense.notes)}</td>
                </tr>
                ` : ''}
              </table>
            </td>
          </tr>

          ${expense.billImageUrl ? `
          <!-- Receipt CTA -->
          <tr>
            <td style="padding: 0 32px 32px 32px;" align="center">
              <a href="${expense.billImageUrl}" target="_blank" style="display: inline-block; background-color: #6366f1; color: #ffffff; font-size: 14px; font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.4);">
                📄 View Bill / Receipt Proof
              </a>
            </td>
          </tr>
          ` : ''}

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 20px 32px; text-align: center; border-top: 1px solid #334155;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">This notification was automatically sent by <strong>FinanceX Ledger</strong>.</p>
              <p style="margin: 4px 0 0 0; font-size: 11px; color: #475569;">Transaction ID: ${expense.id}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const response = await resend.emails.send({
      from: sender,
      to: recipient,
      subject: `[FinanceX] New Bill Added: ${expense.title} (${formattedAmount})`,
      html: htmlContent,
    });

    if (response.error) {
      console.error('[Email Notification Error] Resend returned an error response:', response.error);
      return null;
    }

    console.log(`[Email Notification Success] Email successfully sent to ${recipient}. Resend ID: ${response.data?.id}`);
    return response;
  } catch (error) {
    console.error('[Email Notification Exception] Failed to send email via Resend:', error);
    return null;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
