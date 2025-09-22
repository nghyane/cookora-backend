import * as React from 'react';

interface VerificationErrorProps {
  appUrl?: string;
  message?: string;
}

export const VerificationError = ({
  appUrl = 'http://localhost:3000',
  message = 'Token không hợp lệ hoặc đã hết hạn.'
}: VerificationErrorProps) => {
  return (
    <html>
      <head>
        <title>Xác thực thất bại - Cookora</title>
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
                <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/>
                <path
                  d="M15 9L9 15M9 9L15 15"
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <h1 style={styles.title}>Xác thực thất bại</h1>

            <p style={styles.message}>
              {message}
            </p>

            <div style={styles.helpSection}>
              <p style={styles.helpTitle}>Bạn có thể thử:</p>
              <ul style={styles.helpList}>
                <li>Yêu cầu gửi lại email xác thực</li>
                <li>Kiểm tra email đã đăng ký</li>
                <li>Liên hệ hỗ trợ nếu vấn đề vẫn tiếp tục</li>
              </ul>
            </div>

            <a href={appUrl} style={styles.button}>
              Về trang chủ
            </a>

            <div style={styles.footer}>
              <p style={styles.footerText}>
                Cần hỗ trợ? Liên hệ support@cookora.vn
              </p>
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
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
    backgroundColor: '#f3f4f6',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    width: '100%',
    padding: '20px',
  },
  card: {
    maxWidth: '500px',
    margin: '0 auto',
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    padding: '48px',
    textAlign: 'center' as const,
  },
  iconWrapper: {
    marginBottom: '24px',
    display: 'inline-block',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#111827',
    marginTop: '0',
    marginBottom: '16px',
  },
  message: {
    fontSize: '18px',
    color: '#ef4444',
    marginBottom: '24px',
    lineHeight: '28px',
  },
  helpSection: {
    backgroundColor: '#fef2f2',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '32px',
    textAlign: 'left' as const,
  },
  helpTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#374151',
    marginTop: '0',
    marginBottom: '12px',
  },
  helpList: {
    fontSize: '14px',
    color: '#6b7280',
    paddingLeft: '20px',
    margin: '0',
    lineHeight: '24px',
  },
  button: {
    display: 'inline-block',
    backgroundColor: '#6b7280',
    color: '#ffffff',
    fontSize: '16px',
    fontWeight: 'bold',
    padding: '14px 32px',
    borderRadius: '8px',
    textDecoration: 'none',
    transition: 'background-color 0.2s',
    ':hover': {
      backgroundColor: '#4b5563',
    },
  },
  footer: {
    marginTop: '48px',
    paddingTop: '24px',
    borderTop: '1px solid #e5e7eb',
  },
  footerText: {
    fontSize: '14px',
    color: '#9ca3af',
    margin: 0,
  },
};
