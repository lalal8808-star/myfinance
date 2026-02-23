import { useState, useMemo } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { formatCurrency, formatNumber } from '../utils/api';

function PriceChart({ data, title = '주가 추이' }) {
    const [period, setPeriod] = useState('5Y');

    // 기간에 따른 데이터 필터링
    const filteredData = useMemo(() => {
        if (!data || data.length === 0) return [];

        const now = new Date();
        let startDate;

        switch (period) {
            case '1M':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
            case '6M':
                startDate = new Date(now.setMonth(now.getMonth() - 6));
                break;
            case '1Y':
                startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                break;
            case '5Y':
                startDate = new Date(now.setFullYear(now.getFullYear() - 5));
                break;
            case '10Y':
                startDate = new Date(now.setFullYear(now.getFullYear() - 10));
                break;
            default:
                return data;
        }

        return data.filter(item => new Date(item.date) >= startDate);
    }, [data, period]);

    // Y축 범위 계산
    const yDomain = useMemo(() => {
        if (filteredData.length === 0) return [0, 100];

        const prices = filteredData.map(d => d.close);
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const padding = (max - min) * 0.1;

        return [Math.floor(min - padding), Math.ceil(max + padding)];
    }, [filteredData]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="custom-tooltip">
                    <div className="label">{data.date}</div>
                    <div className="value">종가: {formatCurrency(data.close)}</div>
                    <div className="value">고가: {formatCurrency(data.high)}</div>
                    <div className="value">저가: {formatCurrency(data.low)}</div>
                    <div className="value">거래량: {formatNumber(data.volume)}</div>
                </div>
            );
        }
        return null;
    };

    if (!data || data.length === 0) {
        return (
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">{title}</h3>
                </div>
                <div className="empty-state">
                    <div className="empty-state-text">차트 데이터를 불러오는 중...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="chart-header">
                <h3 className="card-title">{title}</h3>
                <div className="toggle-group">
                    {['1M', '6M', '1Y', '5Y', '10Y'].map((p) => (
                        <button
                            key={p}
                            className={`toggle-btn ${period === p ? 'active' : ''}`}
                            onClick={() => setPeriod(p)}
                        >
                            {p}
                        </button>
                    ))}
                </div>
            </div>

            <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis
                            dataKey="date"
                            stroke="#64748b"
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            tickFormatter={(value) => {
                                const date = new Date(value);
                                return `${date.getMonth() + 1}/${date.getDate()}`;
                            }}
                        />
                        <YAxis
                            domain={yDomain}
                            stroke="#64748b"
                            tick={{ fill: '#64748b', fontSize: 12 }}
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="close"
                            stroke="#6366f1"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorPrice)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default PriceChart;
