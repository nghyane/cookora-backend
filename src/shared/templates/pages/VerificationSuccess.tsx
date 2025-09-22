import * as React from "react";

interface VerificationSuccessProps {
  appUrl?: string;
}

export const VerificationSuccess = ({
  appUrl = "http://localhost:3000",
}: VerificationSuccessProps) => {
  return (
    <html>
      <head>
        <title>Xác thực thành công - Cookora</title>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={styles.body}>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconWrapper}>
              <svg
                width="80"
                height="80"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="#22c55e"
                  strokeWidth="2"
                />
                <path
                  d="M8 12L11 15L16 9"
                  stroke="#22c55e"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <h1 style={styles.title}>Xác thực thành công! 🎉</h1>

            <p style={styles.message}>
              Tài khoản Cookora của bạn đã được kích hoạt thành công.
            </p>

            <p style={styles.subMessage}>
              Giờ bạn có thể đăng nhập và khám phá hàng ngàn công thức ẩm thực
              Việt Nam.
            </p>

            <a href={appUrl} style={styles.button}>
              Đăng nhập ngay
            </a>

            <div style={styles.footer}>
              <p style={styles.footerText}>Cảm ơn bạn đã tham gia Cookora!</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
};

const styles = {
  body: {
    margin: 0,
    padding: 0,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
    backgroundColor: "#f3f4f6",
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    width: "100%",
    padding: "20px",
  },
  card: {
    maxWidth: "500px",
    margin: "0 auto",
    backgroundColor: "#ffffff",
    borderRadius: "16px",
    boxShadow:
      "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    padding: "48px",
    textAlign: "center" as const,
  },
  iconWrapper: {
    marginBottom: "24px",
    display: "inline-block",
  },
  title: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#111827",
    marginTop: "0",
    marginBottom: "16px",
  },
  message: {
    fontSize: "18px",
    color: "#374151",
    marginBottom: "12px",
    lineHeight: "28px",
  },
  subMessage: {
    fontSize: "16px",
    color: "#6b7280",
    marginBottom: "32px",
    lineHeight: "24px",
  },
  button: {
    display: "inline-block",
    backgroundColor: "#22c55e",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: "bold",
    padding: "14px 32px",
    borderRadius: "8px",
    textDecoration: "none",
    transition: "background-color 0.2s",
    ":hover": {
      backgroundColor: "#16a34a",
    },
  },
  footer: {
    marginTop: "48px",
    paddingTop: "24px",
    borderTop: "1px solid #e5e7eb",
  },
  footerText: {
    fontSize: "14px",
    color: "#9ca3af",
    margin: 0,
  },
};
