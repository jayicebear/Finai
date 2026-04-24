export const TAGS = ['전체', 'AI 트레이딩', '알고리즘', '전략', '시장 분석', '리스크 관리']

export const initialPosts = [
  {
    id: 1,
    user: { name: 'Alex Kim', initials: 'AK' },
    tag: 'AI 트레이딩',
    time: '2시간 전',
    content: 'GPT 기반 감성 분석으로 뉴스 헤드라인에서 매매 신호 추출하는 전략 테스트 중입니다. NVDA 기준으로 백테스트 돌려보니 샤프 지수 1.8 나왔는데, 실전에서도 유효할지 궁금하네요. 비슷한 시도해보신 분 있나요?',
    likes: 34,
    liked: false,
    comments: [
      { id: 1, user: { name: 'Jin Park', initials: 'JP' }, text: '저도 비슷하게 해봤는데 과적합 문제가 크더라고요. 훈련 구간 밖에서는 성능이 반토막 났습니다.', time: '1시간 전' },
      { id: 2, user: { name: 'Sara Lee', initials: 'SL' }, text: '뉴스 소스가 어디예요? Bloomberg인가요 아니면 Reddit 기반인가요?', time: '45분 전' },
    ],
  },
  {
    id: 2,
    user: { name: 'Min Choi', initials: 'MC' },
    tag: '알고리즘',
    time: '4시간 전',
    content: '평균 회귀 전략과 모멘텀 전략을 앙상블로 섞어보고 있는데, 상관관계가 낮을 때 조합하니까 드로우다운이 확실히 줄더라고요. 비중은 6:4 정도가 최적이었습니다. 다들 전략 조합할 때 어떤 기준으로 비중 결정하세요?',
    likes: 21,
    liked: false,
    comments: [
      { id: 1, user: { name: 'Tom Yoon', initials: 'TY' }, text: '저는 각 전략의 최근 6개월 샤프 지수를 기준으로 동적 비중 조절합니다.', time: '3시간 전' },
    ],
  },
  {
    id: 3,
    user: { name: 'Sara Lee', initials: 'SL' },
    tag: '시장 분석',
    time: '6시간 전',
    content: 'FOMC 이후 나스닥 변동성 패턴 분석해봤는데, 발표 후 2시간 내 방향성이 결정되면 다음 3일간 추세가 유지되는 경향이 있었습니다. 최근 5년 데이터 기준. 이벤트 드리븐 전략 짜시는 분들 참고해보세요.',
    likes: 58,
    liked: false,
    comments: [],
  },
  {
    id: 4,
    user: { name: 'Tom Yoon', initials: 'TY' },
    tag: '리스크 관리',
    time: '어제',
    content: '포지션 사이징에 켈리 기준 쓰다가 변동성이 크게 튀었을 때 너무 큰 손실 봤습니다. 지금은 하프 켈리로 바꿨는데 훨씬 안정적이에요. 공격적인 켈리 전략 쓰시는 분들 조심하세요.',
    likes: 47,
    liked: false,
    comments: [
      { id: 1, user: { name: 'Alex Kim', initials: 'AK' }, text: '동의합니다. 저는 VIX 기반으로 켈리 계수 조정하는 방식 씁니다.', time: '어제' },
      { id: 2, user: { name: 'Min Choi', initials: 'MC' }, text: '하프 켈리도 결국 드로우다운이 상당하지 않나요? 쿼터 켈리까지 내려가야 한다는 의견도 있던데.', time: '어제' },
      { id: 3, user: { name: 'Jin Park', initials: 'JP' }, text: '시장 레짐에 따라 달라지는 것 같아요. 추세장이냐 횡보장이냐에 따라 최적 비율이 달라집니다.', time: '어제' },
    ],
  },
  {
    id: 5,
    user: { name: 'Jin Park', initials: 'JP' },
    tag: '전략',
    time: '2일 전',
    content: 'VWAP 기준 이탈 후 재진입 패턴으로 데이트레이딩 전략 짜봤는데 수수료 감안하면 기대 이상으로 괜찮습니다. 단 거래량 필터 없으면 노이즈가 너무 많아서 일정 거래량 이상 종목만 필터링하는 게 핵심이었어요.',
    likes: 29,
    liked: false,
    comments: [],
  },
]
