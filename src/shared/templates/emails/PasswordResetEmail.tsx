import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface PasswordResetEmailProps {
  name: string;
  resetUrl: string;
}

export const PasswordResetEmail = ({
  name,
  resetUrl,
}: PasswordResetEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Đặt lại mật khẩu Cookora của bạn</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Đặt lại mật khẩu</Heading>

          <Text style={text}>Xin chào {name},</Text>

          <Text style={text}>
            Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản Cookora
            của bạn. Nhấp vào nút bên dưới để thiết lập mật khẩu mới:
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={resetUrl}>
              Đặt lại mật khẩu
            </Button>
          </Section>

          <Text style={text}>
            Hoặc copy và paste URL này vào trình duyệt của bạn:
          </Text>

          <Link href={resetUrl} style={link}>
            {resetUrl}
          </Link>

          <Text style={text}>
            Link đặt lại mật khẩu này sẽ hết hạn sau 1 giờ.
          </Text>

          <Text style={warningText}>
            ⚠️ Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email
            này. Mật khẩu của bạn sẽ không thay đổi cho đến khi bạn truy cập
            link trên và tạo mật khẩu mới.
          </Text>

          <Text style={footer}>
            Trân trọng,
            <br />
            Đội ngũ Cookora
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default PasswordResetEmail;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const h1 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "30px 0",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  textAlign: "left" as const,
  margin: "16px 0",
};

const warningText = {
  color: "#e11d48",
  fontSize: "14px",
  lineHeight: "24px",
  textAlign: "left" as const,
  margin: "24px 0",
  padding: "12px",
  backgroundColor: "#fef2f2",
  borderRadius: "5px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#ef4444",
  borderRadius: "5px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const link = {
  color: "#ef4444",
  textDecoration: "underline",
};

const footer = {
  color: "#666",
  fontSize: "14px",
  lineHeight: "24px",
  textAlign: "left" as const,
  marginTop: "32px",
};
