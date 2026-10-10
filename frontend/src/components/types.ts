export type HistoryItem = {
  id: number;
  expression: string;
  result: string;
  status: number;
  duration: number;
  request: { expression: string };
  response: unknown;
};
