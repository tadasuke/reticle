export type User = {
  userId: string;
  createdAt: string;
  lastLoginAt: string;
  aiTokenBalance: number;
  aiTokensUsed: number;
};

export type UserLoginResponse = {
  user: User;
};
