import app from './app.js';
import connectDB from './database/index.js';
import config from './config/index.js';
import http from 'http';
import { initSocket } from './sockets/index.js';

// Handle uncaught exceptions globally
process.on('uncaughtException', (err) => {
  console.error(`UNCAUGHT EXCEPTION! Shutting down... Reason: ${err.message}`);
  console.error(err.stack || err);
  process.exit(1);
});

let server;

// Initialize Database connection, then start HTTP Server
connectDB()
  .then(() => {
    const httpServer = http.createServer(app);
    initSocket(httpServer);

    server = httpServer.listen(config.port, () => {
      console.log(
        `Server running in [${config.env}] mode at http://localhost:${config.port}`
      );
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed during server boot:', err);
    process.exit(1);
  });

// Handle unhandled promise rejections globally
process.on('unhandledRejection', (err) => {
  console.error(`UNHANDLED REJECTION! Shutting down... Reason: ${err.message}`);
  console.error(err.stack || err);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});
