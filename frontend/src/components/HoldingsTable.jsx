import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatPercent, formatNumber, getProfitColorClass, formatUSD, formatUSDWithKRW, DEFAULT_EXCHANGE_RATE } from '../utils/api';

function HoldingsTable({ holdings, isOverseas = false, exchangeRate = DEFAULT_EXCHANGE_RATE }) {
    const navigate = useNavigate();
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    const sortedHoldings = useMemo(() => {
        if (!holdings || !sortConfig.key) return holdings;

        return [...holdings].sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            // 문자열 비교 (종목명)
            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            if (aValue < bValue) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [holdings, sortConfig]);

    const handleSort = (key) => {
        setSortConfig((prev) => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
        }));
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return <span className="sort-indicator">⇅</span>;
        return (
            <span className="sort-indicator active">
                {sortConfig.direction === 'asc' ? '▲' : '▼'}
            </span>
        );
    };

    // 금액 포맷팅 (해외주식: 달러 + 원화 병기)
    const formatAmount = (value) => {
        if (isOverseas) {
            const formatted = formatUSDWithKRW(value, exchangeRate);
            return formatted === '-' ? '-' : formatted;
        }
        return formatCurrency(value);
    };

    // 단가 포맷팅 (해외주식: 달러만)
    const formatPrice = (value) => {
        if (isOverseas) {
            return formatUSD(value);
        }
        return formatCurrency(value);
    };

    if (!holdings || holdings.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <div className="empty-state-text">보유 종목이 없습니다</div>
            </div>
        );
    }

    const columns = [
        { key: 'name', label: '종목', align: 'left' },
        { key: 'quantity', label: '보유수량', align: 'right' },
        { key: 'avg_price', label: '매입단가', align: 'right' },
        { key: 'current_price', label: '현재가', align: 'right' },
        { key: 'eval_amount', label: '평가금액', align: 'right' },
        { key: 'profit_loss', label: '손익금액', align: 'right' },
        { key: 'profit_rate', label: '수익률', align: 'right' },
    ];

    return (
        <div className="table-container">
            {isOverseas && (
                <div style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: '8px',
                    marginBottom: '1rem',
                    fontSize: '0.875rem',
                    color: '#94a3b8'
                }}>
                    💱 적용 환율: <strong style={{ color: '#f8fafc' }}>$1 = ₩{exchangeRate.toLocaleString()}</strong>
                </div>
            )}
            <table className="table">
                <thead>
                    <tr>
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className={`${col.align === 'right' ? 'text-right' : ''} sortable-header`}
                                onClick={() => handleSort(col.key)}
                            >
                                {col.label}
                                {getSortIndicator(col.key)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sortedHoldings.map((holding) => {
                        const evalFormatted = formatAmount(holding.eval_amount);
                        const profitFormatted = formatAmount(holding.profit_loss);

                        return (
                            <tr
                                key={holding.ticker}
                                onClick={() => navigate(`/stock/${holding.ticker}`)}
                                style={{ cursor: 'pointer' }}
                            >
                                <td>
                                    <div className="ticker-cell">
                                        <div className="ticker-icon">
                                            {holding.name.charAt(0)}
                                        </div>
                                        <div className="ticker-info">
                                            <span className="ticker-name">{holding.name}</span>
                                            <span className="ticker-code">{holding.ticker}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="text-right font-mono">
                                    {formatNumber(holding.quantity)}{isOverseas ? '주' : '주'}
                                </td>
                                <td className="text-right font-mono">
                                    {formatPrice(holding.avg_price)}
                                </td>
                                <td className="text-right font-mono">
                                    {formatPrice(holding.current_price)}
                                </td>
                                <td className="text-right font-mono">
                                    {isOverseas ? (
                                        <div>
                                            <div>{evalFormatted.usd}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{evalFormatted.krw}</div>
                                        </div>
                                    ) : formatCurrency(holding.eval_amount)}
                                </td>
                                <td className={`text-right font-mono ${getProfitColorClass(holding.profit_loss)}`}>
                                    {isOverseas ? (
                                        <div>
                                            <div>{holding.profit_loss >= 0 ? '+' : ''}{profitFormatted.usd}</div>
                                            <div style={{ fontSize: '0.75rem', opacity: 0.8 }}>{profitFormatted.krw}</div>
                                        </div>
                                    ) : (
                                        <>{holding.profit_loss >= 0 ? '+' : ''}{formatCurrency(holding.profit_loss)}</>
                                    )}
                                </td>
                                <td className={`text-right font-mono ${getProfitColorClass(holding.profit_rate)}`}>
                                    {formatPercent(holding.profit_rate)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default HoldingsTable;
