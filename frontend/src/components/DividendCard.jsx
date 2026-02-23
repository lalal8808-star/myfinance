import { formatCurrency, formatPercent } from '../utils/api';

function DividendCard({ dividend }) {
    if (!dividend) {
        return (
            <div className="card">
                <h3 className="card-title">배당 정보</h3>
                <div className="loading">
                    <div className="loading-spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <h3 className="card-title mb-3">배당 정보</h3>

            <div className="stats-grid">
                <div className="stat-item">
                    <div className="stat-label">주당 배당금</div>
                    <div className="stat-value">
                        {formatCurrency(dividend.dividend_per_share)}
                    </div>
                </div>

                <div className="stat-item">
                    <div className="stat-label">배당률</div>
                    <div className="stat-value value-positive">
                        {formatPercent(dividend.dividend_yield, false)}
                    </div>
                </div>

                <div className="stat-item">
                    <div className="stat-label">배당락일</div>
                    <div className="stat-value">
                        {dividend.ex_dividend_date || '-'}
                    </div>
                </div>

                <div className="stat-item">
                    <div className="stat-label">배당지급일</div>
                    <div className="stat-value">
                        {dividend.pay_date || '-'}
                    </div>
                </div>

                {dividend.dividend_payout_ratio && (
                    <div className="stat-item">
                        <div className="stat-label">배당성향</div>
                        <div className="stat-value">
                            {formatPercent(dividend.dividend_payout_ratio, false)}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default DividendCard;
