const path = require('path');

module.exports = {
  apps: [
    {
      name: 'certif-app-backend',
      script: 'dist/server.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_file: path.join(__dirname, '.env'),
      time: true
    }
  ]
};
