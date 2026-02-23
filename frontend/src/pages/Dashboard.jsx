import { useState, useEffect } from 'react';
import { getPortfolio, getOverseasPortfolio, getISAPortfolio, getTotalAssets, formatCurrency, formatNumber } from '../utils/api';
import SummaryCard from '../components/SummaryCard';
import HoldingsTable from '../components/HoldingsTable';
import AccountTabs from '../components/AccountTabs';

function Dashboard() {
    const [portfolio, setPortfolio] = useState(null);
    const [totalAssets, setTotalAssets] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('domestic');

    // 전체 자산 조회 (최초 1회)
    useEffect(() => {
        const fetchTotal = async () => {
            try {
                const data = await getTotalAssets();
                setTotalAssets(data);
            } catch (err) {
                console.error('전체 자산 조회 오류:', err);
            }
        };
        fetchTotal();
    }, []);

    // 계좌 유형에 따라 API 호출
    const fetchPortfolioByType = async (type) => {
        switch (type) {
            case 'overseas':
                return await getOverseasPortfolio();
            case 'isa':
                return await getISAPortfolio();
            default:
                return await getPortfolio();
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await fetchPortfolioByType(activeTab);
                setPortfolio(data);
            } catch (err) {
                console.error('포트폴리오 조회 오류:', err);
                setError('포트폴리오를 불러오는데 실패했습니다.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [activeTab]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };

    const getTabTitle = () => {
        switch (activeTab) {
            case 'overseas':
                return '해외주식';
            case 'isa':
                return 'ISA 계좌';
            default:
                return '국내주식';
        }
    };

    // 전체자산 배지 렌더링
    const renderTotalAssetBadge = () => {
        if (!totalAssets) return null;

        const totalEval = totalAssets.total_eval_krw;
        const dailyChange = totalAssets.daily_change_krw;
        const dailyRate = totalAssets.daily_change_rate;
        const isPositive = dailyChange >= 0;

        return (
            <div className="total-asset-badge">
                <div className="total-asset-label">전체자산</div>
                <div className="total-asset-value">
                    ₩{formatNumber(totalEval)}
                </div>
                <div className={`total-asset-change ${isPositive ? 'positive' : 'negative'}`}>
                    {isPositive ? '▲' : '▼'} ₩{formatNumber(Math.abs(dailyChange))}
                    <span className="total-asset-rate">
                        ({isPositive ? '+' : ''}{dailyRate.toFixed(2)}%)
                    </span>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div>
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">투자 포트폴리오</h1>
                        <p className="page-subtitle">나의 투자 현황을 한눈에 확인하세요</p>
                    </div>
                    {renderTotalAssetBadge()}
                </div>

                <AccountTabs activeTab={activeTab} onTabChange={handleTabChange} />

                <div className="summary-grid">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="summary-card">
                            <div className="skeleton" style={{ width: '60%', height: '16px', marginBottom: '12px' }}></div>
                            <div className="skeleton" style={{ width: '80%', height: '32px' }}></div>
                        </div>
                    ))}
                </div>

                <div className="card">
                    <div className="loading">
                        <div className="loading-spinner"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <div className="page-header-row">
                    <div>
                        <h1 className="page-title">투자 포트폴리오</h1>
                    </div>
                    {renderTotalAssetBadge()}
                </div>
                <AccountTabs activeTab={activeTab} onTabChange={handleTabChange} />
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-state-icon">⚠️</div>
                        <div className="empty-state-text">{error}</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header-row">
                <div>
                    <h1 className="page-title">투자 포트폴리오</h1>
                    <p className="page-subtitle">나의 투자 현황을 한눈에 확인하세요</p>
                </div>
                {renderTotalAssetBadge()}
            </div>

            {/* 계좌 유형 탭 */}
            <AccountTabs activeTab={activeTab} onTabChange={handleTabChange} />

            {/* 요약 카드 그리드 */}
            <div className="summary-grid">
                <SummaryCard
                    label="총 투자금액"
                    value={portfolio?.total_invested}
                    isOverseas={activeTab === 'overseas'}
                />
                <SummaryCard
                    label="총 평가금액"
                    value={portfolio?.total_eval}
                    isOverseas={activeTab === 'overseas'}
                />
                <SummaryCard
                    label="총 손익금액"
                    value={portfolio?.total_profit_loss}
                    showChange={true}
                    isOverseas={activeTab === 'overseas'}
                />
                <SummaryCard
                    label="총 수익률"
                    value={portfolio?.profit_rate}
                    isPercent={true}
                    showChange={true}
                />
            </div>

            {/* 보유 종목 테이블 */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">{getTabTitle()} 보유 종목</h3>
                    <span className="card-subtitle">
                        {portfolio?.holdings?.length || 0}개 종목
                    </span>
                </div>

                <HoldingsTable
                    holdings={portfolio?.holdings}
                    isOverseas={activeTab === 'overseas'}
                />
            </div>
        </div>
    );
}

export default Dashboard;
