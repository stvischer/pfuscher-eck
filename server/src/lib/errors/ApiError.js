export default class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    // Optional: Stack-Trace sauber halten
    Error.captureStackTrace(this, this.constructor);
  }
}
