export interface LogData {
  ip: string;
  method: string;
  route: string;
  statusCode: number;
  duration: number;
  userAgent: string;
  userId?: string;     // Optional, only present if user is logged in
  firstName?: string;  // Optional, only present if user is logged in
  lastName?: string;
}
