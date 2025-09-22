import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface WelcomeEmailProps {
  name: string;
  appUrl: string;
}

export const WelcomeEmail = ({ name, appUrl }: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>
        Chào mừng đến với Cookora - Hành trình ẩm thực của bạn bắt đầu!
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Chào mừng đến với Cookora! 🍜</Heading>

          <Text style={text}>Xin chào {name},</Text>

          <Text style={text}>
            Chúc mừng! Tài khoản Cookora của bạn đã được xác thực thành công.
            Giờ đây bạn có thể khám phá thế giới ẩm thực Việt Nam phong phú với
            hơn 2000+ nguyên liệu và vô số công thức nấu ăn tuyệt vời.
          </Text>

          <Text style={sectionTitle}>🎯 Bắt đầu với Cookora:</Text>

          <ul style={list}>
            <li style={listItem}>
              <strong>Khám phá công thức:</strong> Duyệt qua bộ sưu tập công
              thức Việt Nam đa dạng
            </li>
            <li style={listItem}>
              <strong>Quản lý tủ lạnh:</strong> Thêm nguyên liệu có sẵn của bạn
              và nhận gợi ý món ăn phù hợp
            </li>
            <li style={listItem}>
              <strong>Nhận diện nguyên liệu:</strong> Sử dụng AI để nhận diện
              nguyên liệu từ hình ảnh
            </li>
            <li style={listItem}>
              <strong>Lưu món yêu thích:</strong> Tạo bộ sưu tập món ăn yêu
              thích của riêng bạn
            </li>
          </ul>

          <Section style={buttonContainer}>
            <Button style={button} href={appUrl}>
              Khám phá Cookora ngay
            </Button>
          </Section>

          <Text style={text}>
            Nếu bạn cần hỗ trợ, đừng ngần ngại liên hệ với chúng tôi. Chúc bạn
            có những trải nghiệm tuyệt vời với Cookora!
          </Text>

          <Text style={footer}>
            Trân trọng,
            <br />
            Đội ngũ Cookora
            <br />
            <br />
            <em style={tagline}>
              Cookora - Nấu ăn thông minh, Ăn ngon mỗi ngày
            </em>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default WelcomeEmail;

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
  fontSize: "28px",
  fontWeight: "bold",
  textAlign: "center" as const,
  margin: "30px 0",
};

const sectionTitle = {
  color: "#333",
  fontSize: "18px",
  fontWeight: "bold",
  margin: "24px 0 16px",
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  textAlign: "left" as const,
  margin: "16px 0",
};

const list = {
  paddingLeft: "20px",
  margin: "16px 0",
};

const listItem = {
  color: "#333",
  fontSize: "15px",
  lineHeight: "24px",
  marginBottom: "12px",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#22c55e",
  borderRadius: "5px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 32px",
};

const footer = {
  color: "#666",
  fontSize: "14px",
  lineHeight: "24px",
  textAlign: "left" as const,
  marginTop: "32px",
};

const tagline = {
  color: "#22c55e",
  fontSize: "13px",
  fontStyle: "italic",
};
