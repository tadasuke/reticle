export type User = {
  userId: string;
  createdAt: string;
  lastLoginAt: string;
};

export type UserLoginResponse = {
  user: User;
  isNew: boolean;
};
