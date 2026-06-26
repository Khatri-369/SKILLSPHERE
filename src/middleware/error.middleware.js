import config from '../config/index.js';

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Something went wrong';

  console.error(`[${req.method}] ${req.originalUrl} - Status: ${statusCode} - Message: ${message}`);

  if (config.env === 'development' && err.stack) {
    console.error(err.stack);
  }

  const response = {
    success: false,
    message,
    ...(config.env === 'development' ? { stack: err.stack } : {}),
  };

  return res.status(statusCode).json(response);
};

export { errorHandler };
export default errorHandler;