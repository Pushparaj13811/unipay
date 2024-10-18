class UniPayError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
  }
}

export { UniPayError };
export default { UniPayError };
