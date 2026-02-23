import { formatPercent } from '../utils/api';

function ReturnsCard({ returns }) {
    if (!returns || returns.length === 0) {
        return (
            <div className="card">
                <h3 className="card-title">과거 수익률</h3>
                <div className="loading">
                    <div className="loading-spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <h3 className="card-title mb-3">과거 수익률</h3>

            <div className="stats-grid">
                {returns.map((ret) => (
                    <div className="stat-item" key={ret.period}>
                        <div className="stat-label">{ret.period} 수익률</div>
                        <div className={`stat-value ${ret.return_rate >= 0 ? 'value-positive' : 'value-negative'}`}>
                            {formatPercent(ret.return_rate)}
                        </div>
                        <div className="stat-label mt-1" style={{ fontSize: '0.75rem' }}>
                            연환산: {formatPercent(ret.annualized_return)}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ReturnsCard;
