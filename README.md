# My Finance - 투자 포트폴리오 애플리케이션

한국투자증권 Open API를 활용한 개인 투자 포트폴리오 관리 및 시뮬레이션 웹 애플리케이션입니다.

## ✨ 주요 기능

### 📊 포트폴리오 대시보드
- 보유 종목 현황 (수량, 매입가, 현재가, 수익률, 손익금액)
- 포트폴리오 전체 요약 (총 투자금액, 평가금액, 수익률)
- 종목 클릭 시 상세 페이지로 이동

### 📈 종목 상세 분석
- 5년/10년 주가 차트 시각화
- 과거 수익률 분석 (1년, 5년, 10년)
- 배당 정보 (주당 배당금, 배당률, 배당락일, 지급일)

### 🎯 투자 시뮬레이션
- 매년 동일 금액 투자 시나리오
- 5년, 10년, 20년 후 예상 자산 계산
- 배당금 시뮬레이션 (재투자 옵션 포함)
- 배당 성장률 반영

## 🛠 기술 스택

| 영역 | 기술 |
|------|------|
| Backend | Python 3.11+, FastAPI, pykis |
| Frontend | React 18, Vite, Recharts |
| Styling | Vanilla CSS (Dark Theme, Glassmorphism) |
| API | 한국투자증권 KIS Open API |

## 🚀 시작하기

### 사전 요구사항

1. **Python 3.11+** 설치
2. **Node.js 18+** 설치
3. 한국투자증권 KIS Developers API 키 발급
   - [KIS Developers](https://apiportal.koreainvestment.com/) 가입
   - 앱 생성 및 API 키 발급

### 설치 및 실행

#### 1. 백엔드 설정

```bash
cd backend

# 가상환경 생성 (권장)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 환경변수 설정
cp .env.example .env
# .env 파일을 열어 API 키 입력
```

`.env` 파일 설정:
```
KIS_APP_KEY=발급받은_앱키
KIS_APP_SECRET=발급받은_앱시크릿
KIS_ACCOUNT_NUMBER=계좌번호
KIS_ACCOUNT_PRODUCT_CODE=01
KIS_IS_VIRTUAL=true  # 모의투자: true, 실계좌: false
```

```bash
# 서버 실행
uvicorn main:app --reload --port 8000
```

#### 2. 프론트엔드 설정

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

### 3. 접속

브라우저에서 http://localhost:5173 접속

## 📁 프로젝트 구조

```
myfinance/
├── backend/
│   ├── main.py              # FastAPI 메인 서버
│   ├── config.py            # 환경 설정
│   ├── kis_client.py        # KIS API 클라이언트
│   ├── models.py            # Pydantic 데이터 모델
│   ├── requirements.txt     # Python 의존성
│   ├── .env.example         # 환경변수 템플릿
│   └── .env                 # 환경변수 (git ignored)
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx          # 메인 앱 (라우팅)
│       ├── index.css        # 글로벌 스타일
│       ├── components/      # 재사용 컴포넌트
│       │   ├── SummaryCard.jsx
│       │   ├── HoldingsTable.jsx
│       │   ├── PriceChart.jsx
│       │   ├── DividendCard.jsx
│       │   ├── ReturnsCard.jsx
│       │   ├── SimulationForm.jsx
│       │   ├── SimulationChart.jsx
│       │   └── SimulationTable.jsx
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── StockDetail.jsx
│       │   └── Simulation.jsx
│       └── utils/
│           └── api.js       # API 클라이언트
│
└── README.md
```

## 🔌 API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/portfolio` | 포트폴리오 현황 조회 |
| GET | `/api/stock/{ticker}` | 종목 상세 정보 |
| GET | `/api/stock/{ticker}/history` | 주가 히스토리 (5년/10년) |
| GET | `/api/stock/{ticker}/dividend` | 배당 정보 |
| GET | `/api/stock/{ticker}/returns` | 과거 수익률 |
| POST | `/api/simulation` | 투자 시뮬레이션 |

## 💡 데모 모드

API 키를 설정하지 않으면 자동으로 데모 데이터가 표시됩니다.
실제 데이터를 보려면 `.env` 파일에 KIS API 키를 설정하세요.

## ⚠️ 주의사항

- 모의투자 계좌로 먼저 테스트하는 것을 권장합니다
- 실제 투자 결정은 본인의 판단으로 하시기 바랍니다
- 시뮬레이션 결과는 예측일 뿐 실제 수익을 보장하지 않습니다

## 📄 라이선스

MIT License
