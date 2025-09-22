/**
 * Test Accounts Configuration
 * These accounts are pre-seeded in development environment
 */

export const TEST_ACCOUNTS = [
  {
    email: "admin@cookora.com",
    password: "Admin123@",
    name: "Admin",
    role: "admin",
    description: "Admin account with full access",
  },
  {
    email: "nguyen@example.com",
    password: "User123@",
    name: "Nguyen Van A",
    role: "user",
    description: "Regular user account 1",
  },
  {
    email: "tran@example.com",
    password: "User123@",
    name: "Tran Thi B",
    role: "user",
    description: "Regular user account 2",
  },
] as const;

// Export for quick access
export const ADMIN_ACCOUNT = TEST_ACCOUNTS[0];
export const USER1_ACCOUNT = TEST_ACCOUNTS[1];
export const USER2_ACCOUNT = TEST_ACCOUNTS[2];

// Helper to get account by email
export const getTestAccountByEmail = (email: string) => {
  return TEST_ACCOUNTS.find((account) => account.email === email);
};

// Helper to format for documentation
export const getTestAccountsForDocs = () => {
  return TEST_ACCOUNTS.map((acc) => ({
    email: acc.email,
    password: acc.password,
    role: acc.role,
  }));
};
