import { useState, useEffect } from 'react';
import { runSimulation, getPortfolio, getOverseasPortfolio, getISAPortfolio, formatCurrency, formatUSD, formatPercent, formatNumber, DEFAULT_EXCHANGE_RATE } from '../utils/api';
import SimulationForm from '../components/SimulationForm';
import SimulationChart from '../components/SimulationChart';
import SimulationTable from '../components/SimulationTable';

function Simulation() {
    const [results, setResults] = useState([]);     // 다종목 결과 배열
    const [activeResult, setActiveResult] = useState(null); // 선택된 단일 결과
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [holdings, setHoldings] = useState([]);

    // 모든 계좌의 보유 종목 로드 (국내 + 해외 + ISA)
    useEffect(() => {
        const fetchAllHoldings = async () => {
            try {
                const [domestic, overseas, isa] = await Promise.allSettled([
                    getPortfolio(),
                    getOverseasPortfolio(),
                    getISAPortfolio(),
                ]);

                const allHoldings = [];

                // 국내주식
                if (domestic.status === 'fulfilled' && domestic.value?.holdings) {
                    domestic.value.holdings.forEach(h => {
                        allHoldings.push({ ...h, accountType: '국내' });
                    });
                }
                // 해외주식
                if (overseas.status === 'fulfilled' && overseas.value?.holdings) {
                    overseas.value.holdings.forEach(h => {
                        allHoldings.push({ ...h, accountType: '해외' });
                    });
                }
                // ISA
                if (isa.status === 'fulfilled' && isa.value?.holdings) {
                    isa.value.holdings.forEach(h => {
                        allHoldings.push({ ...h, accountType: 'ISA' });
                    });
                }

                // 중복 제거 (같은 ticker는 첫 번째만)
                const unique = [];
                const seen = new Set();
                for (const h of allHoldings) {
                    if (!seen.has(h.ticker)) {
                        seen.add(h.ticker);
                        unique.push(h);
                    }
                }

                setHoldings(unique);
            } catch (err) {
                console.error('포트폴리오 로드 오류:', err);
            }
        };
        fetchAllHoldings();
    }, []);

    // 다종목 일괄 시뮬레이션
    const handleSubmit = async (entries) => {
        try {
            setLoading(true);
            setError(null);
            setResults([]);
            setActiveResult(null);

            // 모든 종목 동시 시뮬레이션 실행
            const promises = entries.map(entry => runSimulation(entry));
            const allResults = await Promise.allSettled(promises);

            const successResults = allResults
                .filter(r => r.status === 'fulfilled')
                .map(r => r.value);

            if (successResults.length === 0) {
                setError('시뮬레이션 실행에 실패했습니다.');
                return;
            }

            setResults(successResults);
            setActiveResult(successResults[0]);
        } catch (err) {
            console.error('시뮬레이션 오류:', err);
            setError('시뮬레이션 실행에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    // 통화별 포맷터
    const fmtVal = (value, currency) => {
        if (currency === 'USD') return formatUSD(value);
        return formatCurrency(value);
    };

    // 요약 카드용: USD일 때 원화 환산 병기
    const fmtSummary = (value, currency) => {
        if (currency === 'USD') {
            const krwValue = value * DEFAULT_EXCHANGE_RATE;
            const krwFormatted = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(krwValue);
            return (
                <>
                    <div>{formatUSD(value)}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                        ≈ ₩{krwFormatted}
                    </div>
                </>
            );
        }
        return formatCurrency(value);
    };

    // 전체 합산 계산 (통화별)
    const hasMixedCurrency = results.length > 0 && new Set(results.map(r => r.currency || 'KRW')).size > 1;
    const krwResults = results.filter(r => (r.currency || 'KRW') === 'KRW');
    const usdResults = results.filter(r => (r.currency || 'KRW') === 'USD');

    const calcSummary = (list) => {
        if (list.length === 0) return null;
        const summary = {
            totalFinalValue: list.reduce((s, r) => s + r.final_portfolio_value, 0),
            totalInvested: list.reduce((s, r) => s + r.total_invested, 0),
            totalDividend: list.reduce((s, r) => s + r.total_dividend, 0),
            totalMonthlyDividend: list.reduce((s, r) => s + (r.final_monthly_dividend || 0), 0),
            totalProfit: list.reduce((s, r) => s + r.total_profit, 0),
            currency: list[0].currency || 'KRW',
        };
        summary.totalReturnRate = summary.totalInvested > 0
            ? (summary.totalProfit / summary.totalInvested * 100) : 0;
        return summary;
    };

    const krwSummary = calcSummary(krwResults);
    const usdSummary = calcSummary(usdResults);
    // 단일 통화일 때는 기존 로직 유지
    const totalSummary = !hasMixedCurrency && results.length > 0 ? calcSummary(results) : null;

    return (
        <div>
            <h1 className="page-title">투자 시뮬레이션</h1>
            <p className="page-subtitle">
                여러 종목의 투자 계획을 세우고 미래 자산을 예측해보세요
            </p>

            <div className="simulation-layout">
                {/* 좌측: 입력 폼 */}
                <SimulationForm onSubmit={handleSubmit} loading={loading} holdings={holdings} />

                {/* 우측: 결과 */}
                <div className="simulation-results">
                    {error && (
                        <div className="card">
                            <div className="empty-state">
                                <div className="empty-state-icon">⚠️</div>
                                <div className="empty-state-text">{error}</div>
                            </div>
                        </div>
                    )}

                    {results.length === 0 && !loading && !error && (
                        <div className="card">
                            <div className="empty-state">
                                <div className="empty-state-icon">🎯</div>
                                <div className="empty-state-text">
                                    왼쪽에서 종목별 투자 조건을 설정하고<br />
                                    일괄 시뮬레이션을 실행해보세요
                                </div>
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="card">
                            <div className="loading" style={{ minHeight: '300px' }}>
                                <div className="loading-spinner"></div>
                            </div>
                        </div>
                    )}

                    {/* 전체 합산 요약 */}
                    {(totalSummary || hasMixedCurrency) && !loading && (
                        <div className="card">
                            <h3 className="card-title mb-3">
                                📊 전체 시뮬레이션 합산 ({results.length}개 종목)
                            </h3>

                            {/* 단일 통화 요약 */}
                            {totalSummary && (
                                <>
                                    <div className="result-highlight">
                                        <div className="summary-card positive">
                                            <div className="summary-label">최종 포트폴리오 가치</div>
                                            <div className="summary-value value-positive">
                                                {fmtSummary(totalSummary.totalFinalValue, totalSummary.currency)}
                                            </div>
                                        </div>

                                        <div className="summary-card">
                                            <div className="summary-label">총 투자금액</div>
                                            <div className="summary-value">
                                                {fmtSummary(totalSummary.totalInvested, totalSummary.currency)}
                                            </div>
                                        </div>

                                        <div className="summary-card positive">
                                            <div className="summary-label">총 배당금 수령</div>
                                            <div className="summary-value value-positive">
                                                {fmtSummary(totalSummary.totalDividend, totalSummary.currency)}
                                            </div>
                                        </div>

                                        <div className="summary-card" style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                                            <div className="summary-label" style={{ color: '#22c55e' }}>💰 최종 월배당금</div>
                                            <div className="summary-value" style={{ color: '#22c55e', fontSize: '1.5rem' }}>
                                                {fmtSummary(totalSummary.totalMonthlyDividend, totalSummary.currency)}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{
                                        marginTop: '1.5rem',
                                        padding: '1.5rem',
                                        background: 'rgba(99, 102, 241, 0.1)',
                                        borderRadius: '12px',
                                        textAlign: 'center'
                                    }}>
                                        <div style={{ color: '#94a3b8', marginBottom: '0.5rem' }}>
                                            전체 수익 합산
                                        </div>
                                        <div style={{
                                            fontSize: '2rem',
                                            fontWeight: 700,
                                            color: totalSummary.totalProfit >= 0 ? '#22c55e' : '#ef4444'
                                        }}>
                                            {totalSummary.totalProfit >= 0 ? '+' : ''}{fmtVal(totalSummary.totalProfit, totalSummary.currency)}
                                        </div>
                                        {totalSummary.currency === 'USD' && (
                                            <div style={{ fontSize: '0.9rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                                                ≈ {totalSummary.totalProfit >= 0 ? '+' : ''}₩{new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 }).format(totalSummary.totalProfit * DEFAULT_EXCHANGE_RATE)}
                                            </div>
                                        )}
                                        <div style={{
                                            marginTop: '0.5rem',
                                            fontSize: '1.25rem',
                                            color: totalSummary.totalReturnRate >= 0 ? '#22c55e' : '#ef4444'
                                        }}>
                                            ({formatPercent(totalSummary.totalReturnRate)})
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* 혼합 통화 요약 */}
                            {hasMixedCurrency && (
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    {[krwSummary, usdSummary].filter(Boolean).map(summary => (
                                        <div key={summary.currency} style={{
                                            flex: 1,
                                            minWidth: '200px',
                                            padding: '1.25rem',
                                            background: 'rgba(99, 102, 241, 0.08)',
                                            borderRadius: '12px',
                                        }}>
                                            <div style={{ fontSize: '0.8rem', color: '#6366f1', fontWeight: 600, marginBottom: '0.75rem' }}>
                                                {summary.currency === 'USD' ? '🇺🇸 해외주식 (USD)' : '🇰🇷 국내주식 (KRW)'}
                                            </div>
                                            <div style={{ marginBottom: '0.5rem' }}>
                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>최종 가치</div>
                                                <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#22c55e' }}>
                                                    {fmtVal(summary.totalFinalValue, summary.currency)}
                                                </div>
                                            </div>
                                            <div style={{ marginBottom: '0.5rem' }}>
                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>투자금액</div>
                                                <div style={{ fontSize: '0.9rem', color: '#f8fafc' }}>
                                                    {fmtVal(summary.totalInvested, summary.currency)}
                                                </div>
                                            </div>
                                            <div style={{ marginBottom: '0.5rem' }}>
                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>총 배당금</div>
                                                <div style={{ fontSize: '0.9rem', color: '#22c55e' }}>
                                                    {fmtVal(summary.totalDividend, summary.currency)}
                                                </div>
                                            </div>
                                            <div style={{ marginBottom: '0.5rem', padding: '0.5rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px' }}>
                                                <div style={{ fontSize: '0.7rem', color: '#22c55e' }}>💰 최종 월배당금</div>
                                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#22c55e' }}>
                                                    {fmtVal(summary.totalMonthlyDividend, summary.currency)}
                                                </div>
                                            </div>
                                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                                                <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>총 수익</div>
                                                <div style={{
                                                    fontSize: '1.1rem',
                                                    fontWeight: 700,
                                                    color: summary.totalProfit >= 0 ? '#22c55e' : '#ef4444'
                                                }}>
                                                    {summary.totalProfit >= 0 ? '+' : ''}{fmtVal(summary.totalProfit, summary.currency)}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: summary.totalReturnRate >= 0 ? '#22c55e' : '#ef4444' }}>
                                                    ({formatPercent(summary.totalReturnRate)})
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 종목별 결과 비교 테이블 */}
                            <div style={{ marginTop: '1.5rem' }}>
                                <h4 style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                                    종목별 비교
                                </h4>
                                <div style={{ overflowX: 'auto' }}>
                                    <table className="table" style={{ fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr>
                                                <th>종목</th>
                                                <th className="text-right">투자금</th>
                                                <th className="text-right">최종가치</th>
                                                <th className="text-right">배당금</th>
                                                <th className="text-right" style={{ color: '#22c55e' }}>월배당금</th>
                                                <th className="text-right">총수익</th>
                                                <th className="text-right">수익률</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {results.map((r, i) => {
                                                const cur = r.currency || 'KRW';
                                                return (
                                                    <tr
                                                        key={r.ticker}
                                                        onClick={() => setActiveResult(r)}
                                                        style={{
                                                            cursor: 'pointer',
                                                            background: activeResult?.ticker === r.ticker
                                                                ? 'rgba(99, 102, 241, 0.15)'
                                                                : 'transparent',
                                                        }}
                                                    >
                                                        <td>
                                                            <div style={{ fontWeight: 500 }}>{r.name}</div>
                                                            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                                                {r.ticker}
                                                                {cur === 'USD' && <span style={{ marginLeft: '4px', color: '#6366f1' }}>USD</span>}
                                                            </div>
                                                        </td>
                                                        <td className="text-right font-mono">{fmtVal(r.total_invested, cur)}</td>
                                                        <td className="text-right font-mono">{fmtVal(r.final_portfolio_value, cur)}</td>
                                                        <td className="text-right font-mono" style={{ color: '#22c55e' }}>
                                                            {fmtVal(r.total_dividend, cur)}
                                                        </td>
                                                        <td className="text-right font-mono" style={{ color: '#22c55e', fontWeight: 600 }}>
                                                            {fmtVal(r.final_monthly_dividend || 0, cur)}
                                                        </td>
                                                        <td className="text-right font-mono" style={{
                                                            color: r.total_profit >= 0 ? '#22c55e' : '#ef4444'
                                                        }}>
                                                            {r.total_profit >= 0 ? '+' : ''}{fmtVal(r.total_profit, cur)}
                                                        </td>
                                                        <td className="text-right font-mono" style={{
                                                            color: r.total_return_rate >= 0 ? '#22c55e' : '#ef4444'
                                                        }}>
                                                            {formatPercent(r.total_return_rate)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 개별 종목 상세 결과 */}
                    {activeResult && !loading && (
                        <>
                            <div className="card" style={{ marginTop: '1rem' }}>
                                <h3 className="card-title mb-3">
                                    📈 {activeResult.name} ({activeResult.ticker}) 상세 결과
                                    {results.length > 1 && (
                                        <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>
                                            ▲ 위 테이블에서 다른 종목 클릭
                                        </span>
                                    )}
                                </h3>

                                <div className="result-highlight">
                                    <div className="summary-card positive">
                                        <div className="summary-label">최종 포트폴리오 가치</div>
                                        <div className="summary-value value-positive">
                                            {fmtSummary(activeResult.final_portfolio_value, activeResult.currency)}
                                        </div>
                                    </div>
                                    <div className="summary-card">
                                        <div className="summary-label">총 투자금액</div>
                                        <div className="summary-value">
                                            {fmtSummary(activeResult.total_invested, activeResult.currency)}
                                        </div>
                                    </div>
                                    <div className="summary-card positive">
                                        <div className="summary-label">총 배당금</div>
                                        <div className="summary-value value-positive">
                                            {fmtSummary(activeResult.total_dividend, activeResult.currency)}
                                        </div>
                                    </div>
                                    <div className="summary-card" style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                                        <div className="summary-label" style={{ color: '#22c55e' }}>💰 최종 월배당금</div>
                                        <div className="summary-value" style={{ color: '#22c55e', fontSize: '1.5rem' }}>
                                            {fmtSummary(activeResult.final_monthly_dividend || 0, activeResult.currency)}
                                        </div>
                                    </div>
                                </div>

                                {/* 현재 보유 주식 정보 */}
                                {activeResult.initial_shares > 0 && (
                                    <div style={{
                                        marginTop: '1rem',
                                        padding: '0.75rem 1rem',
                                        background: 'rgba(99, 102, 241, 0.08)',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1.5rem',
                                        fontSize: '0.85rem',
                                    }}>
                                        <div style={{ color: '#94a3b8' }}>
                                            📦 시작 보유: <strong style={{ color: '#f8fafc' }}>{formatNumber(activeResult.initial_shares)}주</strong>
                                        </div>
                                        <div style={{ color: '#94a3b8' }}>
                                            시작 평가금액: <strong style={{ color: '#f8fafc' }}>{fmtVal(activeResult.initial_value, activeResult.currency)}</strong>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <SimulationChart data={activeResult} currency={activeResult.currency} />
                            <SimulationTable data={activeResult} currency={activeResult.currency} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Simulation;
