// loggerService.ts

let processLogs: string[] = [];

export const addLog = (message: string) => {
  processLogs.push(message);
};

export const getLogs = () => {
  return [...processLogs]; // Return a copy of the logs to prevent mutation outside
};

export const clearLogs = () => {
  processLogs = []; // Clear logs when needed
};
