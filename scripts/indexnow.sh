#!/bin/sh
# Tell IndexNow engines (Bing, Yandex, Seznam, Naver; Bing feeds DuckDuckGo
# and others) that pages changed. Run after each deploy:
#   sh scripts/indexnow.sh            # every URL in sitemap.xml
#   sh scripts/indexnow.sh /about /   # just these paths
# The key must stay served at https://cursivee.app/484cb0fe606f317f93480c5f1580d84f.txt
set -e
HOST="cursivee.app"
KEY="484cb0fe606f317f93480c5f1580d84f"
cd "$(dirname "$0")/.."
if [ $# -gt 0 ]; then
  URLS=$(for p in "$@"; do printf '"https://%s%s",' "$HOST" "$p"; done)
else
  URLS=$(grep -o '<loc>[^<]*</loc>' sitemap.xml | sed 's/<loc>\(.*\)<\/loc>/"\1",/' | tr -d '\n')
fi
URLS=${URLS%,}
curl -sS -o /dev/null -w "IndexNow: HTTP %{http_code}\n" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "{\"host\":\"$HOST\",\"key\":\"$KEY\",\"keyLocation\":\"https://$HOST/$KEY.txt\",\"urlList\":[$URLS]}" \
  https://api.indexnow.org/indexnow
