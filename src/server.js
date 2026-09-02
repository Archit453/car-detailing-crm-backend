import app from './app.js';
import { config } from './config/env.js';

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`
  ======================================================
  🚗 Car Detailing CRM Backend Server Online
  ======================================================
  - Port:         ${PORT}
  - Environment:  ${config.nodeEnv}
  - Health Check: http://localhost:${PORT}/health
  - API Root:     http://localhost:${PORT}/api
  - Leads Route:  http://localhost:${PORT}/api/leads
  ======================================================
  `);
});

// Graceful Shutdown Handlers
const handleShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Shutting down HTTP server gracefully...`);
  server.close(() => {
    console.log('HTTP server closed. Exiting process.');
    process.exit(0);
  });

  // Force close if it takes too long
  setTimeout(() => {
    console.error('Forcing shutdown after 10s timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception thrown:', error);
  process.exit(1);
});
