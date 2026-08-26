module.exports = {
  apps: [
    {
      name: 'golf-backend',
      cwd: './backend',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',   // 비동기화로 동시 업로드 증가. 100MB×3 ≈ 700MB 피크
      // 크래시 폭주 방지 (2026-08-26): DB 장애 시 49,368회 재시작 + 로그 954MB 누적 사고 재발 방지
      // 10초 이상 살아야 정상 기동으로 인정, 연속 15회 실패 시 errored 로 정지
      min_uptime: 10000,
      max_restarts: 15,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'golf-frontend',
      cwd: './frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start --port 3000',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '2G',   // 비동기화로 동시 업로드 증가. 100MB×3 ≈ 700MB 피크
      // 크래시 폭주 방지 (2026-08-26): DB 장애 시 49,368회 재시작 + 로그 954MB 누적 사고 재발 방지
      // 10초 이상 살아야 정상 기동으로 인정, 연속 15회 실패 시 errored 로 정지
      min_uptime: 10000,
      max_restarts: 15,
      restart_delay: 5000,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
