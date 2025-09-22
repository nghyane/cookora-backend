import { Resend } from "resend";
import { env } from "@/shared/config/env";
import { VerificationEmail } from "@/shared/templates/emails/VerificationEmail";
import { PasswordResetEmail } from "@/shared/templates/emails/PasswordResetEmail";
import { WelcomeEmail } from "@/shared/templates/emails/WelcomeEmail";

class EmailService {
  private resend: Resend | null = null;

  constructor() {
    if (env.RESEND_API_KEY) {
      this.resend = new Resend(env.RESEND_API_KEY);
    }
  }

  private isConfigured(): boolean {
    return this.resend !== null;
  }

  async sendVerificationEmail(
    email: string,
    token: string,
    name: string,
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn("Email service not configured, skipping verification email");
      return false;
    }

    try {
      const verificationUrl = `${env.APP_URL}/api/v1/auth/verify-email?token=${token}`;

      const { data, error } = await this.resend!.emails.send({
        from: env.EMAIL_FROM,
        to: email,
        subject: "Xác thực email của bạn - Cookora",
        react: VerificationEmail({
          name,
          verificationUrl,
        }),
      });

      if (error) {
        console.error("Failed to send verification email:", error);
        return false;
      }

      console.log(`Verification email sent to ${email}`, data);
      return true;
    } catch (error) {
      console.error("Error sending verification email:", error);
      return false;
    }
  }

  async sendPasswordResetEmail(
    email: string,
    token: string,
    name: string,
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn(
        "Email service not configured, skipping password reset email",
      );
      return false;
    }

    try {
      const resetUrl = `${env.APP_URL}/api/v1/auth/reset-password?token=${token}`;

      const { data, error } = await this.resend!.emails.send({
        from: env.EMAIL_FROM,
        to: email,
        subject: "Đặt lại mật khẩu - Cookora",
        react: PasswordResetEmail({
          name,
          resetUrl,
        }),
      });

      if (error) {
        console.error("Failed to send password reset email:", error);
        return false;
      }

      console.log(`Password reset email sent to ${email}`, data);
      return true;
    } catch (error) {
      console.error("Error sending password reset email:", error);
      return false;
    }
  }

  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn("Email service not configured, skipping welcome email");
      return false;
    }

    try {
      const { data, error } = await this.resend!.emails.send({
        from: env.EMAIL_FROM,
        to: email,
        subject: "Chào mừng đến với Cookora!",
        react: WelcomeEmail({
          name,
          appUrl: env.APP_URL,
        }),
      });

      if (error) {
        console.error("Failed to send welcome email:", error);
        return false;
      }

      console.log(`Welcome email sent to ${email}`, data);
      return true;
    } catch (error) {
      console.error("Error sending welcome email:", error);
      return false;
    }
  }

  async sendEmail(
    to: string | string[],
    subject: string,
    html: string,
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn("Email service not configured, skipping email");
      return false;
    }

    try {
      const { data, error } = await this.resend!.emails.send({
        from: env.EMAIL_FROM,
        to,
        subject,
        html,
      });

      if (error) {
        console.error("Failed to send email:", error);
        return false;
      }

      console.log(`Email sent to ${to}`, data);
      return true;
    } catch (error) {
      console.error("Error sending email:", error);
      return false;
    }
  }
}

export const emailService = new EmailService();
