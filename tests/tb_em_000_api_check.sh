#!/usr/bin/env bash
# TB-EM-000 public-URL API regression checks (health, probe write/read, validation, prefix routing)
B=https://therabridge.preview.emergentagent.com
pass=0; fail=0
chk(){ if [ "$2" = "$3" ]; then echo "PASS $1 ($2)"; pass=$((pass+1)); else echo "FAIL $1 expected=$3 got=$2"; fail=$((fail+1)); fi; }

H=$(curl -s -w '\n%{http_code}' $B/api/health); echo "$H"
chk "health 200" "$(echo "$H"|tail -1)" 200
echo "$H" | head -1 | python3 -c 'import json,sys;d=json.load(sys.stdin);assert d["status"]=="ok" and d["framework"]=="nestjs-fastify" and d["database"]["status"]=="up" and d["database"]["engine"]=="postgresql" and d["migrations"]["applied"]>=1;print("PASS health body")' || { echo "FAIL health body"; fail=$((fail+1)); }

T0=$(curl -s $B/api/health/probe | python3 -c 'import json,sys;print(json.load(sys.stdin)["total"])')
R=$(curl -s -w '\n%{http_code}' -X POST $B/api/health/probe -H 'Content-Type: application/json' -d '{"label":"TEST_agent-probe","source":"cli"}'); echo "$R"
chk "probe create 201" "$(echo "$R"|tail -1)" 201
ID=$(echo "$R"|head -1|python3 -c 'import json,sys,uuid;d=json.load(sys.stdin);uuid.UUID(d["id"]);assert d["label"]=="TEST_agent-probe" and d["source"]=="cli";print(d["id"])')
L=$(curl -s $B/api/health/probe)
echo "$L" | python3 -c "import json,sys;d=json.load(sys.stdin);assert any(i['id']=='$ID' for i in d['items']);assert d['total']==$T0+1;print('PASS readback id + total increment',$T0,'->',d['total'])" || { echo "FAIL readback"; fail=$((fail+1)); }

LONG=$(python3 -c 'print("a"*65)')
for body in "{\"label\":\"$LONG\",\"source\":\"cli\"}" '{"label":"<script>","source":"cli"}' '{"label":"ok","source":"mobile"}' '{"label":"ok","source":"cli","extra":1}' '{}' '' '{"label":"","source":"cli"}' '{"label":123,"source":"cli"}' 'notjson'; do
  c=$(curl -s -o /tmp/o -w '%{http_code}' -X POST $B/api/health/probe -H 'Content-Type: application/json' -d "$body")
  chk "reject [${body:0:40}]" "$c" 400; head -c 300 /tmp/o; echo
done
c=$(curl -s -o /tmp/o -w '%{http_code}' -X POST $B/api/health/probe -d 'label=x&source=cli'); echo "form-encoded -> $c $(head -c 200 /tmp/o)"
c=$(curl -s -o /tmp/o -w '%{http_code}' -X POST $B/api/health/probe -H 'Content-Type: application/json' -d "{\"label\":\"$(python3 -c 'print("a"*64)')\",\"source\":\"cli\"}"); chk "label 64 chars accepted" "$c" 201
c=$(curl -s -o /tmp/o -w '%{http_code}' -X DELETE $B/api/health/probe); echo "DELETE probe -> $c"
c=$(curl -s -o /tmp/o -w '%{http_code}' $B/api/nonexistent); echo "GET /api/nonexistent -> $c $(head -c 200 /tmp/o)"
G=$(curl -s -w '\n%{http_code}' -H 'Accept: application/json' $B/health); echo "GET /health -> $(echo "$G"|tail -1) ct: $(curl -sI $B/health | grep -i content-type)"
echo "$G" | head -c 300 | grep -q nestjs-fastify && { echo "FAIL /health hits API"; fail=$((fail+1)); } || { echo "PASS /health not API"; pass=$((pass+1)); }
echo "TOTAL pass=$pass fail=$fail"
