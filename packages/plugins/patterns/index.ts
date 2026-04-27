/**
 * 18개 반응형 패턴 정의
 * airu-cli 기준: P1~P18
 * 각 패턴은 11개 메서드(M1~M11)의 조합
 */
import { KeywordPattern } from '@airu/core';

// P1 설명
class ExplainPattern extends KeywordPattern {
  readonly id = 'P1';
  readonly name = 'Explain';
  readonly description = '코드/개념 설명';
  protected readonly keywordsKo = ['설명', '설명해', '이해하기', '무슨 뜻', '뭔가요', '알려줘', '가르쳐'];
  protected readonly keywordsEn = ['explain', 'what is', 'describe', 'how does', 'tell me about'];
  protected readonly methodIds = ['M1', 'M2']; // 인식 + 리즌링
}

// P2 계획
class PlanPattern extends KeywordPattern {
  readonly id = 'P2';
  readonly name = 'Plan';
  readonly description = '작업 계획 수립';
  protected readonly keywordsKo = ['계획', '계획해', '기획', '로드맵', '전략', '어떻게 해', '순서', '설계', '아키텍처'];
  protected readonly keywordsEn = ['plan', 'roadmap', 'strategy', 'how to', 'steps', 'approach', 'design', 'architecture'];
  protected readonly methodIds = ['M1', 'M2', 'M3']; // 인식 + 리즌링 + 탐색
}

// P3 리서치
class ResearchPattern extends KeywordPattern {
  readonly id = 'P3';
  readonly name = 'Research';
  readonly description = '정보 수집 및 분석';
  protected readonly keywordsKo = ['리서치', '조사', '검색', '찾아', '찾아줘', '자료', '논문', '뉴스'];
  protected readonly keywordsEn = ['research', 'search', 'find', 'look up', 'investigate', 'paper'];
  protected readonly methodIds = ['M1', 'M3']; // 인식 + 탐색
}

// P4 구현
class ImplementPattern extends KeywordPattern {
  readonly id = 'P4';
  readonly name = 'Implement';
  readonly description = '코드 구현';
  protected readonly keywordsKo = ['구현', '구현해', '만들어', '작성', '코딩', '개발', '코드', '프로그램'];
  protected readonly keywordsEn = ['implement', 'build', 'create', 'code', 'develop', 'write code', 'program'];
  protected readonly methodIds = ['M1', 'M2', 'M6']; // 인식 + 리즌링 + 실행
}

// P5 수정
class ModifyPattern extends KeywordPattern {
  readonly id = 'P5';
  readonly name = 'Modify';
  readonly description = '기존 코드 수정';
  protected readonly keywordsKo = ['수정', '수정해', '변경', '바꿔', '고쳐', '업데이트', '리팩토링'];
  protected readonly keywordsEn = ['modify', 'change', 'update', 'refactor', 'edit', 'fix', 'alter'];
  protected readonly methodIds = ['M1', 'M6']; // 인식 + 실행
}

// P6 테스트
class TestPattern extends KeywordPattern {
  readonly id = 'P6';
  readonly name = 'Test';
  readonly description = '테스트 작성 및 실행';
  protected readonly keywordsKo = ['테스트', '테스트해', '검증', '확인', '유닛테스트', 'e2e', '테스트 코드'];
  protected readonly keywordsEn = ['test', 'testing', 'verify', 'unit test', 'e2e', 'spec', 'test code', 'integration test', 'regression', 'smoke test'];
  protected readonly weight = 1.3;
  protected readonly methodIds = ['M6', 'M7']; // 실행 + 검증
}

// P7 디버그
class DebugPattern extends KeywordPattern {
  readonly id = 'P7';
  readonly name = 'Debug';
  readonly description = '버그 수정';
  protected readonly keywordsKo = ['버그', '디버그', '에러', '오류', '안 돼', '고장', '트러블슈팅', '왜 안', '실패', '재현', '예외'];
  protected readonly keywordsEn = ['bug', 'debug', 'error', 'fix', 'broken', 'crash', 'issue', 'troubleshoot', 'exception', 'stack trace', 'failing'];
  protected readonly methodIds = ['M1', 'M6', 'M7']; // 인식 + 실행 + 검증
  protected readonly weight = 1.2;
}

// P8 배포
class DeployPattern extends KeywordPattern {
  readonly id = 'P8';
  readonly name = 'Deploy';
  readonly description = '배포 및 릴리즈';
  protected readonly keywordsKo = ['배포', '배포해', '릴리즈', '디플로이', '출시', '푸시', '업로드'];
  protected readonly keywordsEn = ['deploy', 'release', 'publish', 'ship', 'push', 'upload'];
  protected readonly methodIds = ['M6', 'M10']; // 실행 + 소통
}

// P9 리뷰
class ReviewPattern extends KeywordPattern {
  readonly id = 'P9';
  readonly name = 'Review';
  readonly description = '코드/디자인 리뷰';
  protected readonly keywordsKo = ['리뷰', '리뷰해', '검토', '피드백', '평가', '코드리뷰', '살펴봐', '점검'];
  protected readonly keywordsEn = ['review', 'feedback', 'evaluate', 'assess', 'critique', 'code review', 'audit', 'inspect'];
  protected readonly methodIds = ['M1', 'M2', 'M7']; // 인식 + 리즌링 + 검증
}

// P10 분석
class AnalyzePattern extends KeywordPattern {
  readonly id = 'P10';
  readonly name = 'Analyze';
  readonly description = '데이터/로그 분석';
  protected readonly keywordsKo = ['분석', '분석해', '로그', '통계', '데이터', '메트릭', '모니터링'];
  protected readonly keywordsEn = ['analyze', 'analysis', 'log', 'stats', 'metrics', 'monitor', 'data'];
  protected readonly methodIds = ['M1', 'M3', 'M11']; // 인식 + 탐색 + 관측성
}

// P11 변환
class ConvertPattern extends KeywordPattern {
  readonly id = 'P11';
  readonly name = 'Convert';
  readonly description = '형식/언어 변환';
  protected readonly keywordsKo = ['변환', '번역', '마이그레이션', '포팅', '컨버팅'];
  protected readonly keywordsEn = ['convert', 'translate', 'migrate', 'port', 'transform'];
  protected readonly methodIds = ['M6']; // 실행
}

// P12 자동화
class AutomatePattern extends KeywordPattern {
  readonly id = 'P12';
  readonly name = 'Automate';
  readonly description = '작업 자동화';
  protected readonly keywordsKo = ['자동화', '자동', '스크립트', '크론', 'cron', '스케줄', '파이프라인'];
  protected readonly keywordsEn = ['automate', 'script', 'cron', 'schedule', 'pipeline', 'workflow'];
  protected readonly methodIds = ['M2', 'M6']; // 리즌링 + 실행
}

// P13 최적화
class OptimizePattern extends KeywordPattern {
  readonly id = 'P13';
  readonly name = 'Optimize';
  readonly description = '성능 최적화';
  protected readonly keywordsKo = ['최적화', '최적화해', '성능', '속도', '빠르게', '메모리', '느려'];
  protected readonly keywordsEn = ['optimize', 'performance', 'speed', 'fast', 'memory', 'slow'];
  protected readonly methodIds = ['M1', 'M6', 'M7']; // 인식 + 실행 + 검증
}

// P14 문서화
class DocumentPattern extends KeywordPattern {
  readonly id = 'P14';
  readonly name = 'Document';
  readonly description = '문서/README 작성';
  protected readonly keywordsKo = ['문서', '문서화', 'readme', '가이드', '매뉴얼', 'docs', '사용법', '글 써', '글 작성', '블로그', '포스팅'];
  protected readonly keywordsEn = ['document', 'readme', 'guide', 'manual', 'docs', 'how-to', 'blog', 'post'];
  protected readonly methodIds = ['M2', 'M10']; // 리즌링 + 소통
}

// P15 학습
class LearnPattern extends KeywordPattern {
  readonly id = 'P15';
  readonly name = 'Learn';
  readonly description = '새 기술/개념 학습';
  protected readonly keywordsKo = ['배우', '학습', '공부', '튜토리얼', '입문', '기초', '시작하는'];
  protected readonly keywordsEn = ['learn', 'tutorial', 'beginner', 'getting started', 'basics', 'fundamentals'];
  protected readonly methodIds = ['M1', 'M3']; // 인식 + 탐색
}

// P16 비교
class ComparePattern extends KeywordPattern {
  readonly id = 'P16';
  readonly name = 'Compare';
  readonly description = '기술/도구 비교';
  protected readonly keywordsKo = ['비교', '비교해', '차이', 'vs', '어느게 나은', '선택', '추천'];
  protected readonly keywordsEn = ['compare', 'versus', 'vs', 'difference', 'which is better', 'recommend'];
  protected readonly methodIds = ['M1', 'M3']; // 인식 + 탐색
}

// P17 일반
class GeneralPattern extends KeywordPattern {
  readonly id = 'P17';
  readonly name = 'General';
  readonly description = '일반 대화/질문';
  protected readonly keywordsKo = ['안녕', '하이', '도움', '질문', '어떻게 생각', '의견'];
  protected readonly keywordsEn = ['hello', 'hi', 'help', 'question', 'opinion', 'think'];
  protected readonly weight = 0.5; // 기본 낮은 가중치
  protected readonly methodIds = ['M1']; // 인식만
}

// P18 지식
class KnowledgePattern extends KeywordPattern {
  readonly id = 'P18';
  readonly name = 'Knowledge';
  readonly description = '지식베이스 관리';
  protected readonly keywordsKo = ['지식', '지식베이스', '저장', '기억', '메모', '노트', '위키'];
  protected readonly keywordsEn = ['knowledge', 'kb', 'save', 'remember', 'note', 'wiki', 'memory'];
  protected readonly methodIds = ['M4', 'M11']; // 저장 + 관측성
}

// 전체 패턴 등록
export function registerAllPatterns(): KeywordPattern[] {
  return [
    new ExplainPattern(),
    new PlanPattern(),
    new ResearchPattern(),
    new ImplementPattern(),
    new ModifyPattern(),
    new TestPattern(),
    new DebugPattern(),
    new DeployPattern(),
    new ReviewPattern(),
    new AnalyzePattern(),
    new ConvertPattern(),
    new AutomatePattern(),
    new OptimizePattern(),
    new DocumentPattern(),
    new LearnPattern(),
    new ComparePattern(),
    new GeneralPattern(),
    new KnowledgePattern(),
  ];
}
