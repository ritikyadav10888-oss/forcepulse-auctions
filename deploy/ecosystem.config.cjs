// pm2 process for the production server (npm start = node server.js --prod)
module.exports = {
  apps: [
    {
      name: 'forcepulse',
      cwd: require('node:path').join(__dirname, '..'),
      script: 'npm',
      args: 'start',
      max_memory_restart: '900M',
      time: true
    }
  ]
};
