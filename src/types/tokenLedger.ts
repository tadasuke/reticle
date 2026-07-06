export type TokenLedgerEntry = {
  eventId: string;
  type: 'grant' | 'consume';
  tokens: number;
  balanceAfter: number;
  occurredAt: string;
  source?: {
    conversationId?: string;
    conversationMode?: string;
    requestKind?: string;
    friendTypeId?: string;
    buddyTypeId?: string;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
};

export type TokenLedgerResponse = {
  entries: TokenLedgerEntry[];
  nextCursor?: string;
};
