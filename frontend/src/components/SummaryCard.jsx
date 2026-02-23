import { formatCurrency, formatPercent, getProfitColorClass, formatUSDWithKRW, DEFAULT_EXCHANGE_RATE } from '../utils/api';

function SummaryCard({ label, value, isPercent = false, showChange = false, isOverseas = false, exchangeRate = DEFAULT_EXCHANGE_RATE }) {
    const colorClass = showChange ? getProfitColorClass(value) : '';
    const cardClass = showChange ? (value > 0 ? 'positive' : value < 0 ? 'negative' : '') : '';

    // 해외주식이고 퍼센트가 아닌 경우 달러/원화 병기
    const renderValue = () => {
        if (isPercent) {
            return formatPercent(value);
        }

        if (isOverseas) {
            const formatted = formatUSDWithKRW(value, exchangeRate);
            if (formatted === '-') return '-';
            return (
                <div>
                    <div>{formatted.usd}</div>
                    <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                        {formatted.krw}
                    </div>
                </div>
            );
        }

        return formatCurrency(value);
    };

    return (
        <div className={`summary-card ${cardClass}`}>
            <div className="summary-label">{label}</div>
            <div className={`summary-value ${colorClass}`}>
                {renderValue()}
            </div>
            {showChange && !isPercent && (
                <div className={`summary-change ${value >= 0 ? 'positive' : 'negative'}`}>
                    {value >= 0 ? '▲' : '▼'}
                </div>
            )}
        </div>
    );
}

export default SummaryCard;
