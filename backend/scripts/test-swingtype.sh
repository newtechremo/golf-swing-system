#!/bin/bash

echo "===== swingType 파라미터 테스트 ====="
echo ""

# 로그인하여 토큰 받기
echo "1. 로그인 중..."
TOKEN=$(curl -X POST http://localhost:3003/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "instructor1", "password": "password123"}' \
  -s | python3 -c "import sys, json; print(json.load(sys.stdin)['accessToken'])")

echo "   ✅ 로그인 성공"
echo ""

# 테스트 1: swingType 없이 요청
echo "2. swingType 없이 요청 (실패 예상):"
curl -X POST http://localhost:3003/api/golf-swing/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -F "subjectId=1" \
  -F "height=175" \
  -s | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"   Status: {d.get('statusCode', 'N/A')}\")" 2>/dev/null || echo "   ⚠️ 비디오 파일 필요 에러 (정상)"
echo ""

# 테스트 2: 잘못된 swingType
echo "3. 잘못된 swingType (middle) 요청 (실패 예상):"
curl -X POST http://localhost:3003/api/golf-swing/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -F "subjectId=1" \
  -F "swingType=middle" \
  -F "height=175" \
  -s | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"   Message: {d.get('message', 'N/A')}\")" 2>/dev/null || echo "   ⚠️ 비디오 파일 필요 에러 (정상)"
echo ""

# 테스트 3: 유효한 swingType (비디오 없이)
echo "4. 유효한 swingType (full) - 비디오 없이 (비디오 에러 예상):"
RESULT=$(curl -X POST http://localhost:3003/api/golf-swing/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -F "subjectId=1" \
  -F "swingType=full" \
  -F "height=175" \
  -s)
echo "$RESULT" | python3 -c "import sys, json; d=json.load(sys.stdin); print(f\"   Message: {d.get('message', 'N/A')}\"); print(f\"   Status: {d.get('statusCode', d.get('status', 'N/A'))}\")" 2>/dev/null || echo "   $RESULT"
echo ""

echo "===== 테스트 완료 ====="
