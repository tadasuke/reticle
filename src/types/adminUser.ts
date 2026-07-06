export type AdminUserListItem = {
  userId: string;
  lastLoginAt: string;
  aiTokenBalance: number;
};

export type AdminUserDetail = AdminUserListItem & {
  createdAt: string;
  aiTokensUsed: number;
  conversationCount: number;
};

export type AdminUserCreateInput = {
  userId: string;
  initialTokens: number;
};

export type AdminTokenGrantInput = {
  tokens: number;
};
