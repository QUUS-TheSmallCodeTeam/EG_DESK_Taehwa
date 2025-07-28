# 🚀 Multi-Agent Workflow Scripts - Automation & Orchestration

## 워크플로우 실행 스크립트

### 1. 에이전트 협업 시작 스크립트
```bash
#!/bin/bash
# multi-agent-start.sh - 다중 에이전트 워크플로우 시작

echo "🎯 EG-Desk:Taehwa Multi-Agent Workflow 시작..."

# 프로젝트 상태 확인
echo "📊 프로젝트 상태 확인 중..."
npm run lint --silent > lint-report.txt 2>&1
npm run type-check --silent > type-report.txt 2>&1

# Git 상태 확인
git status --porcelain > git-status.txt

# 아티팩트 디렉토리 초기화
mkdir -p .artifacts/{code,ui,data,config}/{$(date +%Y-%m-%d)}

echo "✅ 환경 준비 완료"
echo "🤖 에이전트들이 협업을 시작할 수 있습니다."

# 현재 상태를 아티팩트로 저장
cat > .artifacts/config/$(date +%Y-%m-%d)/initial-state.json << EOF
{
  "type": "configuration",
  "id": "initial-state-$(date +%s)",
  "agent": "orchestrator",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "project_status": {
    "git_clean": $(if [ -s git-status.txt ]; then echo "false"; else echo "true"; fi),
    "lint_passed": $(if grep -q "error" lint-report.txt; then echo "false"; else echo "true"; fi),
    "types_valid": $(if grep -q "error" type-report.txt; then echo "false"; else echo "true"; fi)
  },
  "ready_for_collaboration": true
}
EOF

# 임시 파일 정리
rm -f lint-report.txt type-report.txt git-status.txt

echo "📦 초기 상태 아티팩트 생성 완료"
```

### 2. 에이전트 작업 할당 스크립트
```bash
#!/bin/bash
# assign-agent-task.sh - 특정 에이전트에게 작업 할당

AGENT_NAME=$1
TASK_DESCRIPTION=$2
PRIORITY=${3:-"medium"}

if [ -z "$AGENT_NAME" ] || [ -z "$TASK_DESCRIPTION" ]; then
    echo "사용법: ./assign-agent-task.sh <agent-name> <task-description> [priority]"
    echo "예시: ./assign-agent-task.sh browser-module-maintainer '다중 탭 선택 기능 구현' high"
    exit 1
fi

echo "📋 작업 할당: $AGENT_NAME"
echo "🎯 작업 내용: $TASK_DESCRIPTION"
echo "⚡ 우선순위: $PRIORITY"

# 작업 할당 아티팩트 생성
TASK_ID="task-$(date +%s)"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

mkdir -p .artifacts/tasks/$(date +%Y-%m-%d)

cat > .artifacts/tasks/$(date +%Y-%m-%d)/${TASK_ID}.json << EOF
{
  "type": "task_assignment",
  "id": "$TASK_ID",
  "agent": "orchestrator",
  "timestamp": "$TIMESTAMP",
  "assigned_agent": "$AGENT_NAME",
  "task": {
    "description": "$TASK_DESCRIPTION",
    "priority": "$PRIORITY",
    "status": "assigned",
    "estimated_duration": null,
    "dependencies": [],
    "success_criteria": []
  },
  "context": {
    "project_state": "$(git rev-parse HEAD)",
    "branch": "$(git branch --show-current)"
  }
}
EOF

echo "✅ 작업 할당 완료 - ID: $TASK_ID"
echo "📁 아티팩트 위치: .artifacts/tasks/$(date +%Y-%m-%d)/${TASK_ID}.json"

# 해당 에이전트의 작업 대기열에 추가
mkdir -p .agents-queue/$AGENT_NAME
echo "$TASK_ID" >> .agents-queue/$AGENT_NAME/pending-tasks.txt

echo "🔔 $AGENT_NAME 에이전트 대기열에 작업 추가됨"
```

### 3. 아티팩트 검증 스크립트
```bash
#!/bin/bash
# validate-artifacts.sh - 생성된 아티팩트들의 품질 검증

echo "🔍 아티팩트 품질 검증 시작..."

ARTIFACTS_DIR=".artifacts"
VALIDATION_REPORT="artifact-validation-$(date +%Y%m%d-%H%M%S).json"

# JSON 형식 검증
echo "📋 JSON 형식 검증 중..."
INVALID_JSON_COUNT=0

for json_file in $(find $ARTIFACTS_DIR -name "*.json"); do
    if ! jq empty "$json_file" 2>/dev/null; then
        echo "❌ 잘못된 JSON 형식: $json_file"
        ((INVALID_JSON_COUNT++))
    fi
done

# 필수 필드 검증
echo "🏷️ 필수 필드 검증 중..."
MISSING_FIELDS_COUNT=0

for json_file in $(find $ARTIFACTS_DIR -name "*.json"); do
    REQUIRED_FIELDS=("type" "id" "agent" "timestamp")
    
    for field in "${REQUIRED_FIELDS[@]}"; do
        if ! jq -e ".$field" "$json_file" >/dev/null 2>&1; then
            echo "⚠️ 필수 필드 누락 [$field]: $json_file"
            ((MISSING_FIELDS_COUNT++))
        fi
    done
done

# 타임스탬프 유효성 검증
echo "⏰ 타임스탬프 검증 중..."
INVALID_TIMESTAMP_COUNT=0

for json_file in $(find $ARTIFACTS_DIR -name "*.json"); do
    timestamp=$(jq -r '.timestamp' "$json_file" 2>/dev/null)
    if [[ ! $timestamp =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]]; then
        echo "⚠️ 잘못된 타임스탬프 형식: $json_file"
        ((INVALID_TIMESTAMP_COUNT++))
    fi
done

# 검증 결과 리포트 생성
cat > "$VALIDATION_REPORT" << EOF
{
  "validation_timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "total_artifacts": $(find $ARTIFACTS_DIR -name "*.json" | wc -l),
  "validation_results": {
    "json_format_errors": $INVALID_JSON_COUNT,
    "missing_required_fields": $MISSING_FIELDS_COUNT,
    "invalid_timestamps": $INVALID_TIMESTAMP_COUNT
  },
  "quality_score": $(echo "scale=2; ($(find $ARTIFACTS_DIR -name "*.json" | wc -l) - $INVALID_JSON_COUNT - $MISSING_FIELDS_COUNT - $INVALID_TIMESTAMP_COUNT) * 100 / $(find $ARTIFACTS_DIR -name "*.json" | wc -l)" | bc),
  "status": "$(if [ $((INVALID_JSON_COUNT + MISSING_FIELDS_COUNT + INVALID_TIMESTAMP_COUNT)) -eq 0 ]; then echo "PASSED"; else echo "FAILED"; fi)"
}
EOF

echo "📊 검증 완료 - 리포트: $VALIDATION_REPORT"

# 결과 출력
TOTAL_ERRORS=$((INVALID_JSON_COUNT + MISSING_FIELDS_COUNT + INVALID_TIMESTAMP_COUNT))
if [ $TOTAL_ERRORS -eq 0 ]; then
    echo "✅ 모든 아티팩트가 품질 기준을 통과했습니다!"
else
    echo "❌ $TOTAL_ERRORS 개의 문제가 발견되었습니다."
    exit 1
fi
```

### 4. 에이전트 진행 상황 추적 스크립트
```bash
#!/bin/bash
# track-agent-progress.sh - 에이전트들의 작업 진행 상황 추적

echo "📈 Multi-Agent Progress Tracking"
echo "================================"

# 각 에이전트별 작업 상태 확인
AGENTS=("browser-module-maintainer" "chat-manager" "content-system-manager" "workspace-manager" "state-manager" "tab-manager")

for agent in "${AGENTS[@]}"; do
    echo ""
    echo "🤖 $agent"
    echo "   └─ 📋 대기 중: $(if [ -f .agents-queue/$agent/pending-tasks.txt ]; then wc -l < .agents-queue/$agent/pending-tasks.txt; else echo "0"; fi)"
    
    # 최근 아티팩트 확인
    RECENT_ARTIFACT=$(find .artifacts -name "*.json" -exec jq -r 'select(.agent=="'$agent'") | .timestamp + " " + .type + " " + .id' {} \; 2>/dev/null | sort -r | head -1)
    
    if [ -n "$RECENT_ARTIFACT" ]; then
        echo "   └─ 🎯 최근 작업: $RECENT_ARTIFACT"
    else
        echo "   └─ 🎯 최근 작업: 없음"
    fi
    
    # 해당 에이전트의 아티팩트 수 확인
    ARTIFACT_COUNT=$(find .artifacts -name "*.json" -exec jq -r 'select(.agent=="'$agent'") | .id' {} \; 2>/dev/null | wc -l)
    echo "   └─ 📦 생성 아티팩트: $ARTIFACT_COUNT 개"
done

echo ""
echo "🎯 전체 현황"
echo "============"

# 전체 통계
TOTAL_ARTIFACTS=$(find .artifacts -name "*.json" | wc -l)
TOTAL_PENDING=$(find .agents-queue -name "pending-tasks.txt" -exec wc -l {} \; 2>/dev/null | awk '{sum+=$1} END {print sum}' || echo "0")

echo "📦 총 아티팩트: $TOTAL_ARTIFACTS 개"
echo "📋 대기 중인 작업: $TOTAL_PENDING 개"

# 최근 24시간 활동
RECENT_ACTIVITY=$(find .artifacts -name "*.json" -newermt "24 hours ago" | wc -l)
echo "🕐 최근 24시간 활동: $RECENT_ACTIVITY 개 아티팩트"

# 에이전트별 아티팩트 분포
echo ""
echo "📊 에이전트별 기여도"
echo "==================="

for agent in "${AGENTS[@]}"; do
    count=$(find .artifacts -name "*.json" -exec jq -r 'select(.agent=="'$agent'") | .id' {} \; 2>/dev/null | wc -l)
    percentage=$(echo "scale=1; $count * 100 / $TOTAL_ARTIFACTS" | bc 2>/dev/null || echo "0")
    printf "%-25s: %3d 개 (%s%%)\n" "$agent" "$count" "$percentage"
done
```

### 5. 에이전트 협업 완료 및 통합 스크립트
```bash
#!/bin/bash
# finalize-collaboration.sh - 에이전트 협업 완료 및 최종 통합

echo "🎯 Multi-Agent Collaboration Finalization"
echo "========================================="

# 모든 대기 중인 작업 확인
PENDING_TASKS=$(find .agents-queue -name "pending-tasks.txt" -exec wc -l {} \; 2>/dev/null | awk '{sum+=$1} END {print sum}' || echo "0")

if [ "$PENDING_TASKS" -gt 0 ]; then
    echo "⚠️ 아직 $PENDING_TASKS 개의 작업이 대기 중입니다."
    echo "   모든 작업이 완료된 후 다시 실행해주세요."
    exit 1
fi

echo "✅ 모든 에이전트 작업이 완료되었습니다."

# 아티팩트 품질 최종 검증
echo "🔍 최종 품질 검증 중..."
./validate-artifacts.sh

if [ $? -ne 0 ]; then
    echo "❌ 아티팩트 품질 검증에 실패했습니다."
    exit 1
fi

# 코드 통합 테스트
echo "🧪 코드 통합 테스트 실행 중..."
npm run lint
npm run type-check
npm run test

if [ $? -ne 0 ]; then
    echo "❌ 통합 테스트에 실패했습니다."
    exit 1
fi

# 최종 빌드 테스트
echo "🔨 최종 빌드 테스트..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 빌드에 실패했습니다."
    exit 1
fi

# 협업 결과 리포트 생성
FINAL_REPORT="collaboration-report-$(date +%Y%m%d-%H%M%S).json"

cat > "$FINAL_REPORT" << EOF
{
  "collaboration_completed": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "project_commit": "$(git rev-parse HEAD)",
  "branch": "$(git branch --show-current)",
  "statistics": {
    "total_artifacts": $(find .artifacts -name "*.json" | wc -l),
    "agents_participated": $(find .artifacts -name "*.json" -exec jq -r '.agent' {} \; | sort -u | wc -l),
    "collaboration_duration": "$(echo $(stat -f %Sm -t %s .artifacts 2>/dev/null || stat -c %Y .artifacts) - $(git log -1 --format=%ct) | bc) seconds",
    "files_modified": $(git diff --name-only HEAD~1 | wc -l)
  },
  "quality_metrics": {
    "build_status": "success",
    "test_status": "passed",
    "lint_status": "passed",
    "type_check_status": "passed"
  },
  "next_steps": [
    "사용자 테스트 진행",
    "성능 벤치마크 실행",
    "문서화 업데이트",
    "배포 준비"
  ]
}
EOF

echo ""
echo "🎉 Multi-Agent Collaboration 성공적으로 완료!"
echo "📊 최종 리포트: $FINAL_REPORT" 
echo ""
echo "📈 협업 통계:"
echo "   - 생성된 아티팩트: $(find .artifacts -name "*.json" | wc -l) 개"
echo "   - 참여한 에이전트: $(find .artifacts -name "*.json" -exec jq -r '.agent' {} \; | sort -u | wc -l) 개"
echo "   - 수정된 파일: $(git diff --name-only HEAD~1 | wc -l) 개"
echo ""
echo "🚀 프로젝트가 다음 단계로 진행할 준비가 완료되었습니다!"

# 성공 시 임시 파일들 정리
rm -rf .agents-queue
echo "🧹 임시 파일 정리 완료"
```

## 사용 가이드

### 1. 기본 워크플로우 실행
```bash
# 1. 다중 에이전트 환경 준비
./multi-agent-start.sh

# 2. 작업 할당 (예시)
./assign-agent-task.sh tab-manager "다중 탭 선택 UI 구현" high
./assign-agent-task.sh browser-module-maintainer "WebContents API 확장" high
./assign-agent-task.sh state-manager "탭 선택 상태 스키마 설계" medium

# 3. 진행 상황 모니터링
./track-agent-progress.sh

# 4. 주기적 아티팩트 검증
./validate-artifacts.sh

# 5. 협업 완료 및 통합
./finalize-collaboration.sh
```

### 2. 커스텀 워크플로우 설정
```bash
# 특정 기능 개발을 위한 에이전트 조합
./assign-agent-task.sh content-system-manager "WordPress API 클라이언트 개발" high
./assign-agent-task.sh chat-manager "AI 콘텐츠 생성 명령 처리" high  
./assign-agent-task.sh browser-module-maintainer "WordPress 자동화 스크립트" medium
```

---

**워크플로우 스크립트 목표**: *체계적인 협업 관리, 품질 보장, 효율적인 통합* ⚙️

이 스크립트들을 통해 다중 에이전트 시스템의 협업을 자동화하고, 각 단계에서의 품질을 보장하며, 최종적으로 안정적인 통합을 달성할 수 있습니다.