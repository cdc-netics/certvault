const backendTarget = process.env.BACKEND_DEV_URL || 'http://localhost:3000';

module.exports = {
  '/api': {
    target: backendTarget,
    secure: false,
    changeOrigin: true,
    logLevel: 'warn'
  },
  '/uploads': {
    target: backendTarget,
    secure: false,
    changeOrigin: true,
    logLevel: 'warn'
  }
};
