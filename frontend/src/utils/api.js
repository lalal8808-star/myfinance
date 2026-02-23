import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * 포트폴리오 현황 조회 (국내주식)
 */
export const getPortfolio = async () => {
    const response = await api.get('/portfolio');
    return response.data;
};

/**
 * 해외주식 포트폴리오 조회
 * @param {string} market - NASD(나스닥), NYSE(뉴욕), AMEX(아멕스), SEHK(홍콩)
 */
export const getOverseasPortfolio = async (market = 'NASD') => {
    const response = await api.get('/portfolio/overseas', {
        params: { market },
    });
    return response.data;
};

/**
 * ISA 계좌 포트폴리오 조회
 */
export const getISAPortfolio = async () => {
    const response = await api.get('/portfolio/isa');
    return response.data;
};

/**
 * 전체 자산 총합 조회 (국내 + 해외 + ISA)
 */
export const getTotalAssets = async (exchangeRate = 1450) => {
    const response = await api.get('/portfolio/total', {
        params: { exchange_rate: exchangeRate },
    });
    return response.data;
};


/**
 * 종목 상세 정보 조회
 */
export const getStockInfo = async (ticker) => {
    const response = await api.get(`/stock/${ticker}`);
    return response.data;
};

/**
 * 종목 주가 히스토리 조회
 */
export const getStockHistory = async (ticker, years = 5) => {
    const response = await api.get(`/stock/${ticker}/history`, {
        params: { years },
    });
    return response.data;
};

/**
 * 종목 배당 정보 조회
 */
export const getDividendInfo = async (ticker) => {
    const response = await api.get(`/stock/${ticker}/dividend`);
    return response.data;
};

/**
 * 종목 과거 수익률 조회
 */
export const getHistoricalReturns = async (ticker) => {
    const response = await api.get(`/stock/${ticker}/returns`);
    return response.data;
};

/**
 * 투자 시뮬레이션 실행
 */
export const runSimulation = async (params) => {
    const response = await api.post('/simulation', params);
    return response.data;
};

/**
 * 숫자 포맷팅 (원화)
 */
export const formatCurrency = (value, currency = 'KRW') => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: currency === 'USD' ? 2 : 0,
    }).format(value);
};

/**
 * 숫자 포맷팅 (달러)
 */
export const formatUSD = (value) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
    }).format(value);
};

/**
 * 달러 + 원화 병기 포맷팅
 * @param {number} usdValue - 달러 금액
 * @param {number} exchangeRate - 환율 (1달러당 원)
 */
export const formatUSDWithKRW = (usdValue, exchangeRate = 1450) => {
    if (usdValue === null || usdValue === undefined) return '-';
    const krwValue = usdValue * exchangeRate;
    const usdFormatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2,
    }).format(usdValue);
    const krwFormatted = new Intl.NumberFormat('ko-KR', {
        maximumFractionDigits: 0,
    }).format(krwValue);
    return { usd: usdFormatted, krw: `₩${krwFormatted}`, combined: `${usdFormatted} (₩${krwFormatted})` };
};

// 현재 환율 (실시간 조회 대신 고정값 사용, 추후 API 연동 가능)
export const DEFAULT_EXCHANGE_RATE = 1450;


/**
 * 숫자 포맷팅 (콤마)
 */
export const formatNumber = (value, decimals = 0) => {
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('ko-KR', {
        maximumFractionDigits: decimals,
    }).format(value);
};

/**
 * 퍼센트 포맷팅
 */
export const formatPercent = (value, showSign = true) => {
    if (value === null || value === undefined) return '-';
    const sign = showSign && value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
};

/**
 * 수익률에 따른 색상 클래스
 */
export const getProfitColorClass = (value) => {
    if (value > 0) return 'value-positive';
    if (value < 0) return 'value-negative';
    return '';
};

export default api;
