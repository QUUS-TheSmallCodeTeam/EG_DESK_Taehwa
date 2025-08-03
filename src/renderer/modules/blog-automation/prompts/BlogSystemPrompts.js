/**
 * BlogSystemPrompts - System prompts for blog content generation
 * 
 * Contains specialized prompts for generating electrical sensor industry content
 * with Korean language optimization and SEO focus.
 */

class BlogSystemPrompts {
  constructor() {
    // Base context about Taehwa Trans
    this.companyContext = `
태화트랜스(Taehwa Trans)는 대한민국의 선도적인 전기센서 제조업체입니다.
주요 제품군:
- Rogowski Coils (로고스키 코일): 비접촉식 전류 측정
- Split-core CT (분할형 변류기): 설치가 간편한 전류 변환기
- Solid CT (솔리드 변류기): 고정밀 전류 측정
- Zero-Phase CT (영상변류기): 누전 감지용
- ACB CTs (ACB 변류기): 차단기용 특수 변류기

전문 분야: 전력품질 모니터링, 에너지 관리, 스마트그리드 솔루션
    `.trim();
    
    // Industry terminology mapping
    this.industryTerms = {
      'current_sensor': '전류센서',
      'current_transformer': '변류기',
      'rogowski_coil': '로고스키 코일',
      'accuracy': '정확도',
      'measurement': '측정',
      'power_quality': '전력품질',
      'energy_management': '에너지관리',
      'smart_grid': '스마트그리드',
      'calibration': '교정',
      'installation': '설치'
    };
  }

  /**
   * Get requirements gathering prompt
   */
  getRequirementsPrompt() {
    return `당신은 태화트랜스의 기술 블로그 작성을 돕는 전문가입니다.
사용자가 원하는 블로그 주제와 요구사항을 파악하기 위해 다음 정보를 수집해주세요:

1. 주요 주제 (예: 특정 제품, 기술 동향, 응용 사례)
2. 대상 독자 (예: 엔지니어, 구매 담당자, 일반 고객)
3. 글의 목적 (예: 제품 소개, 기술 교육, 문제 해결)
4. 원하는 글의 톤 (예: 전문적, 친근한, 교육적)
5. 특별히 포함되어야 할 내용이나 키워드

친근하고 전문적인 톤으로 대화하며, 필요한 정보를 자연스럽게 수집해주세요.`;
  }

  /**
   * Get outline generation prompt
   */
  getOutlinePrompt(requirements) {
    return `당신은 전기센서 산업 전문 기술 블로그 작가입니다.
다음 요구사항을 바탕으로 SEO 최적화된 블로그 글 개요를 작성해주세요.

회사 정보:
${this.companyContext}

요구사항:
${JSON.stringify(requirements, null, 2)}

개요 작성 지침:
1. 제목: SEO 키워드를 포함한 매력적인 제목 (60자 이내)
2. 서론: 독자의 관심을 끄는 도입부 구성
3. 본문: 3-5개의 주요 섹션으로 구성
4. 각 섹션: 명확한 소제목과 핵심 내용 요약
5. 결론: 행동 유도(CTA) 포함
6. SEO 메타 설명: 150-160자의 요약

전문적이면서도 이해하기 쉬운 구조로 작성해주세요.`;
  }

  /**
   * Get content generation prompt for specific section
   */
  getContentPrompt(section, context) {
    return `전기센서 산업 전문가로서 다음 섹션의 내용을 작성해주세요.

섹션: ${section.title}
맥락: ${JSON.stringify(context, null, 2)}

작성 지침:
1. 전문 용어는 쉽게 설명하면서도 정확하게 사용
2. 실제 응용 사례나 예시 포함
3. 태화트랜스 제품의 장점 자연스럽게 언급
4. 단락은 3-4문장으로 구성하여 가독성 확보
5. 기술적 정확성 유지하면서 이해하기 쉽게 작성

한국어로 자연스럽고 전문적인 톤으로 작성해주세요.`;
  }

  /**
   * Get SEO optimization prompt
   */
  getSEOPrompt(content, keywords) {
    return `다음 블로그 콘텐츠를 SEO 최적화해주세요.

목표 키워드: ${keywords.join(', ')}

최적화 지침:
1. 키워드를 자연스럽게 본문에 분산 (키워드 밀도 1-2%)
2. 헤딩 태그(H1, H2, H3) 구조 최적화
3. 메타 설명 최적화 (150-160자)
4. 이미지 alt 텍스트 제안
5. 내부/외부 링크 제안

원본 콘텐츠:
${content}

최적화된 버전을 제공하고, 개선 사항을 설명해주세요.`;
  }

  /**
   * Get quality check prompt
   */
  getQualityCheckPrompt(content) {
    return `다음 기술 블로그 콘텐츠의 품질을 평가해주세요.

평가 기준:
1. 기술적 정확성 (전기센서 관련 정보)
2. 가독성과 구조
3. SEO 최적화 수준
4. 대상 독자에 대한 적절성
5. 행동 유도(CTA) 효과성

콘텐츠:
${content}

각 기준별 점수(1-10)와 개선 제안을 제공해주세요.`;
  }

  /**
   * Get product-specific prompts
   */
  getProductPrompt(productType) {
    const productPrompts = {
      'rogowski_coil': `로고스키 코일의 비접촉식 측정 원리와 장점을 설명하세요.
특히 대전류 측정, 설치 용이성, 선형성 등의 특징을 강조하고,
기존 CT 대비 우수성을 부각시켜주세요.`,
      
      'current_transformer': `변류기의 기본 원리와 태화트랜스 제품의 특장점을 설명하세요.
정확도 등급, 부담(burden), 포화 특성 등 기술적 사양을 
실무자가 이해하기 쉽게 설명해주세요.`,
      
      'zero_phase_ct': `영상변류기의 누전 감지 원리와 안전성을 설명하세요.
감도 설정, 오동작 방지, 설치 시 주의사항 등
현장 적용 시 필요한 실무 지식을 포함해주세요.`
    };
    
    return productPrompts[productType] || this.getGeneralProductPrompt();
  }

  /**
   * Get general product prompt
   */
  getGeneralProductPrompt() {
    return `태화트랜스의 전기센서 제품을 소개하는 내용을 작성하세요.
제품의 기술적 우수성, 신뢰성, 비용 효율성을 강조하고,
실제 적용 사례와 고객 이점을 포함해주세요.`;
  }

  /**
   * Get technical article prompts
   */
  getTechnicalPrompt(topic) {
    const technicalPrompts = {
      'power_quality': `전력품질 모니터링에서 전류센서의 역할을 설명하세요.
고조파 측정, 역률 개선, 에너지 효율 향상 등의 관점에서
태화트랜스 제품의 기술적 우위를 설명해주세요.`,
      
      'smart_grid': `스마트그리드에서 정밀 전류 측정의 중요성을 설명하세요.
실시간 모니터링, 빅데이터 분석, 예측 유지보수 등
미래 전력망에서의 응용을 다뤄주세요.`,
      
      'energy_management': `에너지 관리 시스템(EMS)에서 전류센서의 활용을 설명하세요.
에너지 사용 패턴 분석, 비용 절감, 탄소 배출 감소 등
ESG 경영과 연계하여 설명해주세요.`
    };
    
    return technicalPrompts[topic] || this.getGeneralTechnicalPrompt();
  }

  /**
   * Get general technical prompt
   */
  getGeneralTechnicalPrompt() {
    return `전기센서 기술의 최신 동향과 응용 분야를 다뤄주세요.
Industry 4.0, IoT, AI 등 신기술과의 융합을 포함하여
미래 지향적인 관점에서 작성해주세요.`;
  }

  /**
   * Get Korean language optimization prompt
   */
  getKoreanOptimizationPrompt(content) {
    return `다음 기술 블로그 콘텐츠를 한국어 문체 최적화해주세요.

최적화 지침:
1. 전문 용어는 한글(영문) 형식으로 표기
2. 문장은 간결하고 명확하게
3. 경어체 사용 (습니다/입니다)
4. 기술 문서지만 딱딱하지 않게
5. 적절한 접속사와 전환어 사용

원본:
${content}

자연스러운 한국어로 다듬어주세요.`;
  }
}

export default BlogSystemPrompts;