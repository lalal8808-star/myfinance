import {
    ComposedChart,
    Area,
    Line,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { formatCurrency, formatUSD, formatNumber } from '../utils/api';

function SimulationChart({ data, currency = 'KRW' }) {
    if (!data || !data.yearly_results || data.yearly_results.length === 0) {
        return null;
    }

    const chartData = data.yearly_results.map(yr => ({
        year: `${yr.year}년`,
        invested: yr.invested_amount,
        portfolio: yr.portfolio_value,
        dividend: yr.total_dividend,
        shares: yr.accumulated_shares,
    }));

    const fmtVal = (v) => currency === 'USD' ? formatUSD(v) : formatCurrency(v);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const d = payload[0].payload;
            return (
                <div className="custom-tooltip">
                    <div className="label" style={{ marginBottom: '8px', fontWeight: 600 }}>{label}</div>
                    <div className="value">투자원금: {fmtVal(d.invested)}</div>
                    <div className="value" style={{ color: '#6366f1' }}>
                        포트폴리오: {fmtVal(d.portfolio)}
                    </div>
                    <div className="value" style={{ color: '#22c55e' }}>
                        누적배당금: {fmtVal(d.dividend)}
                    </div>
                    <div className="value">
                        보유주식: {formatNumber(d.shares, 2)}주
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="card">
            <h3 className="card-title mb-3">자산 성장 추이</h3>

            <div className="chart-container" style={{ height: '450px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <defs>
                            <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorDividend" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                            </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />

                        <XAxis
                            dataKey="year"
                            stroke="#64748b"
                            tick={{ fill: '#64748b', fontSize: 12 }}
                        />
                        <YAxis
                            stroke="#64748b"
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            tickFormatter={(value) => {
                                if (currency === 'USD') {
                                    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
                                    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
                                    return `$${value}`;
                                }
                                return `${(value / 100000000).toFixed(0)}억`;
                            }}
                        />

                        <Tooltip content={<CustomTooltip />} />

                        <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                            formatter={(value) => {
                                const labels = {
                                    invested: '투자원금',
                                    portfolio: '포트폴리오 가치',
                                    dividend: '누적 배당금',
                                };
                                return <span style={{ color: '#94a3b8' }}>{labels[value] || value}</span>;
                            }}
                        />

                        {/* 투자원금 영역 */}
                        <Area
                            type="monotone"
                            dataKey="invested"
                            stroke="#64748b"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            fill="none"
                        />

                        {/* 포트폴리오 가치 영역 */}
                        <Area
                            type="monotone"
                            dataKey="portfolio"
                            stroke="#6366f1"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorPortfolio)"
                        />

                        {/* 누적 배당금 바 */}
                        <Bar
                            dataKey="dividend"
                            fill="#22c55e"
                            opacity={0.6}
                            barSize={20}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default SimulationChart;
