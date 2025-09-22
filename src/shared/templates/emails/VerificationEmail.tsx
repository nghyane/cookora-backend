import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Hr,
  Row,
  Column,
} from "@react-email/components";

interface VerificationEmailProps {
  name: string;
  verificationUrl: string;
}

export const VerificationEmail = ({
  name,
  verificationUrl,
}: VerificationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        Xác thực email để bắt đầu hành trình ẩm thực cùng Cookora
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header with Logo */}
          <Section style={header}>
            <Row>
              <Column align="center">
                <div style={logoContainer}>
                  <Img
                    src="https://cdn.cookora.vn/cookora.png"
                    width="232"
                    height="84"
                    alt="Cookora"
                    style={logoImage}
                  />
                </div>
              </Column>
            </Row>
          </Section>

          {/* Welcome Section */}
          <Section style={content}>
            <Heading style={h1}>Chào mừng bạn đến với Cookora!</Heading>

            <Text style={greeting}>Xin chào {name} 👋</Text>

            <Text style={text}>
              Cảm ơn bạn đã đăng ký tài khoản Cookora - nơi lưu giữ và khám phá
              hàng ngàn công thức ẩm thực Việt Nam.
            </Text>

            <Text style={text}>
              Chỉ còn một bước nữa! Hãy xác thực email của bạn để:
            </Text>

            {/* Features List */}
            <Section style={featuresList}>
              <Text style={featureItem}>✅ Lưu trữ công thức yêu thích</Text>
              <Text style={featureItem}>
                ✅ Quản lý nguyên liệu trong tủ lạnh
              </Text>
              <Text style={featureItem}>✅ Nhận gợi ý món ăn phù hợp</Text>
              <Text style={featureItem}>
                ✅ Chia sẻ công thức với cộng đồng
              </Text>
            </Section>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={verificationUrl}>
                Xác Thực Email Ngay
              </Button>
            </Section>

            {/* Alternative Link */}
            <Section style={alternativeSection}>
              <Text style={smallText}>
                Nút không hoạt động? Copy link bên dưới:
              </Text>
              <Section style={linkContainer}>
                <Link href={verificationUrl} style={link}>
                  {verificationUrl}
                </Link>
              </Section>
            </Section>

            <Hr style={divider} />

            {/* Security Notice */}
            <Section style={noticeSection}>
              <Text style={noticeText}>
                ⏰ Link xác thực sẽ hết hạn sau <strong>24 giờ</strong>
              </Text>
              <Text style={noticeText}>
                🔒 Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email
                hoặc liên hệ với chúng tôi.
              </Text>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              Trân trọng,
              <br />
              <strong>Đội ngũ Cookora</strong>
            </Text>

            <Hr style={footerDivider} />

            <Text style={footerLinks}>
              <Link href="https://cookora.vn" style={footerLink}>
                Website
              </Link>
              {" • "}
              <Link href="https://cookora.vn/help" style={footerLink}>
                Trợ giúp
              </Link>
              {" • "}
              <Link href="https://cookora.vn/privacy" style={footerLink}>
                Chính sách
              </Link>
            </Text>

            <Text style={copyright}>
              © 2025 Cookora. Mọi quyền được bảo lưu.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default VerificationEmail;

// Styles
const main = {
  backgroundColor: "#f7f7f7",
  fontFamily:
    '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  margin: "0 auto",
  padding: "20px 0",
  width: "100%",
  maxWidth: "600px",
};

const header = {
  backgroundColor: "#ffffff",
  borderRadius: "12px 12px 0 0",
  padding: "32px 20px",
  borderBottom: "3px solid #10b981",
};

const logoContainer = {
  textAlign: "center" as const,
  display: "block",
  margin: "0 auto",
};

const logoImage = {
  display: "block",
  margin: "0 auto",
  objectFit: "contain" as const,
};

const content = {
  backgroundColor: "#ffffff",
  padding: "32px 40px 40px",
  borderRadius: "0 0 12px 12px",
};

const h1 = {
  color: "#1f2937",
  fontSize: "28px",
  fontWeight: "700",
  textAlign: "center" as const,
  margin: "0 0 24px",
  lineHeight: "36px",
};

const greeting = {
  color: "#374151",
  fontSize: "18px",
  fontWeight: "600",
  margin: "0 0 16px",
};

const text = {
  color: "#4b5563",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const featuresList = {
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
};

const featureItem = {
  color: "#065f46",
  fontSize: "15px",
  lineHeight: "28px",
  margin: "0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#10b981",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 32px",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.07)",
  transition: "all 0.2s",
};

const alternativeSection = {
  margin: "24px 0",
  textAlign: "center" as const,
};

const smallText = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "0 0 12px",
};

const linkContainer = {
  backgroundColor: "#f9fafb",
  borderRadius: "6px",
  padding: "12px 16px",
  margin: "0 auto",
  maxWidth: "500px",
  wordBreak: "break-all" as const,
};

const link = {
  color: "#10b981",
  fontSize: "14px",
  textDecoration: "underline",
};

const divider = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
};

const noticeSection = {
  backgroundColor: "#fef3c7",
  borderRadius: "8px",
  padding: "16px",
  margin: "0 0 24px",
};

const noticeText = {
  color: "#92400e",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0 0 8px",
};

const footer = {
  padding: "32px 40px",
  textAlign: "center" as const,
};

const footerText = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 24px",
};

const footerDivider = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const footerLinks = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "0 0 12px",
};

const footerLink = {
  color: "#10b981",
  textDecoration: "none",
  fontWeight: "500",
};

const copyright = {
  color: "#9ca3af",
  fontSize: "12px",
  margin: "0",
};
