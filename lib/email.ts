import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const FROM = `"Property Expense Tracker" <${process.env.EMAIL_USER}>`;

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const response = await transporter.sendMail({ from: FROM, to, subject, html });
    console.log('✅ Email sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Email send failed:', error);
    throw error;
  }
}

export async function sendTransactionEmail(
  userEmail: string,
  transactionName: string,
  amount: number
) {
  try {
    const response = await transporter.sendMail({
      from: FROM,
      to: userEmail,
      subject: `New Transaction: ${transactionName}`,
      html: `
        <h1>Transaction Recorded</h1>
        <p>A new transaction has been recorded in your Property Expense Tracker.</p>
        <p><strong>Transaction:</strong> ${transactionName}</p>
        <p><strong>Amount:</strong> $${amount.toFixed(2)}</p>
        <p>This is an automated message from your Property Expense Tracker application.</p>
      `,
    });
    console.log('✅ Email sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Email send failed:', error);
    throw error;
  }
}

export async function sendTestEmail(userEmail: string) {
  try {
    const response = await transporter.sendMail({
      from: FROM,
      to: userEmail,
      subject: 'Test Email from Property Expense Tracker',
      html: `
        <h1>Test Email Successful!</h1>
        <p>Hello!</p>
        <p>This is a test email from your Property Expense Tracker application.</p>
        <p>If you received this, the email integration is working perfectly!</p>
        <p>You can now set up automated emails for:</p>
        <ul>
          <li>Transaction notifications</li>
          <li>Property sharing invitations</li>
          <li>Report generation alerts</li>
          <li>Receipt uploads</li>
        </ul>
        <p>Best regards,<br/>Property Expense Tracker Team</p>
      `,
    });
    console.log('✅ Test email sent:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to send test email:', error);
    throw error;
  }
}
