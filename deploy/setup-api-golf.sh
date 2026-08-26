#!/usr/bin/env bash
# api-golf.remo.re.kr nginx vhost 배치 + 인증서 발급
set -euo pipefail
cd "$(dirname "$0")/.."

echo "▶ DNS 확인"
dig +short @8.8.8.8 api-golf.remo.re.kr

echo "▶ vhost 배치"
sudo cp deploy/api-golf.remo.re.kr.nginx /etc/nginx/sites-available/api-golf.remo.re.kr
sudo ln -sf /etc/nginx/sites-available/api-golf.remo.re.kr /etc/nginx/sites-enabled/api-golf.remo.re.kr

echo "▶ 문법 검사"
sudo nginx -t

echo "▶ reload"
sudo systemctl reload nginx

echo "▶ 인증서 발급"
sudo certbot --nginx -d api-golf.remo.re.kr --non-interactive --agree-tos --redirect

echo "▶ 검증"
curl -s -o /dev/null -w "  health : %{http_code} (200 기대)\n" https://api-golf.remo.re.kr/api/health
curl -s -o /dev/null -w "  guard  : %{http_code} (401 기대)\n" https://api-golf.remo.re.kr/api/subjects
echo "✅ 완료"
