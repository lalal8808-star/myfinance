import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    getStockInfo,
    getStockHistory,
    getDividendInfo,
    getHistoricalReturns,
    formatCurrency,
    formatPercent,
    formatNumber,
} from '../utils/api';
import PriceChart from '../components/PriceChart';
import DividendCard from '../components/DividendCard';
import ReturnsCard from '../components/ReturnsCard';

function StockDetail() {
    const { ticker } = useParams();
    const navigate = useNavigate();

    const [stockInfo, setStockInfo] = useState(null);
    const [history, setHistory] = useState([]);
    const [dividend, setDividend] = useState(null);
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAllData = async () => {
            try {
                setLoading(true);

                const [infoData, historyData, dividendData, returnsData] = await Promise.all([
                    getStockInfo(ticker),
                    getStockHistory(ticker, 10),
                    getDividendInfo(ticker),
                    getHistoricalReturns(ticker),
                ]);

                setStockInfo(infoData);
                setHistory(historyData);
                setDividend(dividendData);
                setReturns(returnsData);
            } catch (err) {
                console.error('종목 정보 조회 오류:', err);
            } finally {
                setLoading(false);
            }
        };

        if (ticker) {
            fetchAllData();
        }
    }, [ticker]);

    if (loading) {
        return (
            <div>
                <button className="back-link" onClick={() => navigate('/')}>
                    ← 대시보드로 돌아가기
                </button>
                <div className="loading" style={{ minHeight: '400px' }}>
                    <div className="loading-spinner"></div>
                </div>
            </div>
        );
    }

    if (!stockInfo) {
        return (
            <div>
                <button className="back-link" onClick={() => navigate('/')}>
                    ← 대시보드로 돌아가기
                </button>
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">🔍</div>
                        <div className="empty-state-text">종목 정보를 찾을 수 없습니다</div>
                    </div>
                </div>
            </div>
        );
    }

    const priceChangeClass = stockInfo.change_rate >= 0 ? 'value-positive' : 'value-negative';

    return (
        <div>
            <button className="back-link" onClick={() => navigate('/')}>
                ← 대시보드로 돌아가기
            </button>

            {/* 종목 헤더 */}
            <div className="stock-header">
                <div className="stock-icon-large">
                    {stockInfo.name?.charAt(0) || ticker.charAt(0)}
                </div>

                <div className="stock-info-main">
                    <div className="stock-name-large">{stockInfo.name}</div>
                    <div className="stock-code-large">{stockInfo.ticker}</div>
                </div>

                <div className="stock-price-large">
                    <div className="current-price">{formatCurrency(stockInfo.current_price)}</div>
                    <div className={`price-change ${priceChangeClass}`}>
                        {formatPercent(stockInfo.change_rate)} 오늘
                    </div>
                </div>
            </div>

            {/* 기본 정보 */}
            <div className="stats-grid mb-4">
                <div className="stat-item">
                    <div className="stat-label">52주 최고가</div>
                    <div className="stat-value">{formatCurrency(stockInfo.high_52week)}</div>
                </div>
                <div className="stat-item">
                    <div className="stat-label">52주 최저가</div>
                    <div className="stat-value">{formatCurrency(stockInfo.low_52week)}</div>
                </div>
                {stockInfo.market_cap && (
                    <div className="stat-item">
                        <div className="stat-label">시가총액</div>
                        <div className="stat-value">
                            {formatNumber(stockInfo.market_cap / 1000000000000, 1)}조
                        </div>
                    </div>
                )}
                {stockInfo.per && (
                    <div className="stat-item">
                        <div className="stat-label">PER</div>
                        <div className="stat-value">{stockInfo.per.toFixed(2)}</div>
                    </div>
                )}
                {stockInfo.pbr && (
                    <div className="stat-item">
                        <div className="stat-label">PBR</div>
                        <div className="stat-value">{stockInfo.pbr.toFixed(2)}</div>
                    </div>
                )}
            </div>

            {/* 주가 차트 */}
            <div className="mb-4">
                <PriceChart data={history} title={`${stockInfo.name} 주가 추이`} />
            </div>

            {/* 수익률 & 배당 정보 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                <ReturnsCard returns={returns} />
                <DividendCard dividend={dividend} />
            </div>
        </div>
    );
}

export default StockDetail;
