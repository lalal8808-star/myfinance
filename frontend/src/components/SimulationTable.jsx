import { formatCurrency, formatUSD, formatNumber, formatPercent } from '../utils/api';

function SimulationTable({ data, currency = 'KRW' }) {
    if (!data || !data.yearly_results || data.yearly_results.length === 0) {
        return null;
    }

    const fmtVal = (v) => currency === 'USD' ? formatUSD(v) : formatCurrency(v);

    return (
        <div className="card">
            <h3 className="card-title mb-3">연도별 상세 결과</h3>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>연도</th>
                            <th className="text-right">누적 투자금</th>
                            <th className="text-right">포트폴리오 가치</th>
                            <th className="text-right">당해 배당금</th>
                            <th className="text-right" style={{ color: '#22c55e' }}>💰 월배당금</th>
                            <th className="text-right">누적 배당금</th>
                            <th className="text-right">보유 주식</th>
                            <th className="text-right">총 수익률</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.yearly_results.map((yr) => (
                            <tr key={yr.year}>
                                <td>{yr.year}년차</td>
                                <td className="text-right font-mono">
                                    {fmtVal(yr.invested_amount)}
                                </td>
                                <td className="text-right font-mono">
                                    {fmtVal(yr.portfolio_value)}
                                </td>
                                <td className="text-right font-mono value-positive">
                                    {fmtVal(yr.yearly_dividend)}
                                </td>
                                <td className="text-right font-mono" style={{ color: '#22c55e', fontWeight: 600 }}>
                                    {fmtVal(yr.monthly_dividend)}
                                </td>
                                <td className="text-right font-mono value-positive">
                                    {fmtVal(yr.total_dividend)}
                                </td>
                                <td className="text-right font-mono">
                                    {formatNumber(yr.accumulated_shares, 2)}주
                                </td>
                                <td className={`text-right font-mono ${yr.total_return_rate >= 0 ? 'value-positive' : 'value-negative'}`}>
                                    {formatPercent(yr.total_return_rate)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default SimulationTable;
