import { useState, useEffect, useRef } from 'react';
import { getHistoricalReturns, getDividendInfo, formatNumber } from '../utils/api';

// 금액 쉼표 포맷 (KRW: 정수, USD: 정수)
const formatAmountInput = (value) => {
    const num = String(value).replace(/[^0-9]/g, '');
    return num ? Number(num).toLocaleString('ko-KR') : '';
};

const parseAmountInput = (formatted) => {
    return Number(String(formatted).replace(/[^0-9]/g, '')) || 0;
};

// localStorage 프리셋 관리
const PRESET_STORAGE_KEY = 'sim_presets';

const getSavedPresets = () => {
    try {
        const raw = localStorage.getItem(PRESET_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const savePresetsToStorage = (presets) => {
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
};

const defaultStockEntry = {
    id: Date.now(),
    ticker: '',
    name: '',
    current_price: 0,
    accountType: '',
    currency: 'KRW',
    initial_shares: 0,
    annual_investment: 12000000,
    annual_investment_display: '12,000,000',
    years: 20,
    expected_annual_return: 8,
    expected_dividend_yield: 2,
    reinvest_dividend: true,
    dividend_growth_rate: 3,
    useHistoricalReturn: true,
    loadingData: false,
};

function SimulationForm({ onSubmit, loading, holdings = [] }) {
    const [stockEntries, setStockEntries] = useState([{ ...defaultStockEntry }]);
    const [activeEntryIndex, setActiveEntryIndex] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef(null);

    // 프리셋 저장/불러오기 상태
    const [showPresetPanel, setShowPresetPanel] = useState(false);
    const [presetName, setPresetName] = useState('');
    const [savedPresets, setSavedPresets] = useState(getSavedPresets());
    const [showSaveInput, setShowSaveInput] = useState(false);
    const [presetMessage, setPresetMessage] = useState(null);
    const presetPanelRef = useRef(null);

    // 클릭 외부 감지
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
            if (presetPanelRef.current && !presetPanelRef.current.contains(event.target)) {
                setShowPresetPanel(false);
                setShowSaveInput(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const activeEntry = stockEntries[activeEntryIndex];

    const updateEntry = (index, updates) => {
        setStockEntries(prev => prev.map((entry, i) =>
            i === index ? { ...entry, ...updates } : entry
        ));
    };

    // 종목 선택 시 데이터 자동 로드
    const handleStockSelect = async (holding) => {
        const isOverseas = holding.accountType === '해외';
        const currency = isOverseas ? 'USD' : 'KRW';
        const defaultInvestment = isOverseas ? 6000 : 12000000;
        updateEntry(activeEntryIndex, {
            ticker: holding.ticker,
            name: holding.name,
            current_price: holding.current_price || 0,
            accountType: holding.accountType || '',
            currency,
            initial_shares: holding.quantity || 0,
            annual_investment: defaultInvestment,
            annual_investment_display: formatAmountInput(defaultInvestment),
            loadingData: true,
        });
        setShowDropdown(false);
        setSearchQuery('');

        try {
            const [returns, dividend] = await Promise.all([
                getHistoricalReturns(holding.ticker).catch(() => null),
                getDividendInfo(holding.ticker).catch(() => null),
            ]);

            const return10y = returns?.find(r => r.period === '10Y');
            const annualizedReturn = return10y?.annualized_return;

            const currentEntry = stockEntries[activeEntryIndex];
            updateEntry(activeEntryIndex, {
                expected_annual_return: currentEntry.useHistoricalReturn && annualizedReturn
                    ? parseFloat(annualizedReturn.toFixed(1))
                    : currentEntry.expected_annual_return,
                expected_dividend_yield: dividend?.dividend_yield
                    ? parseFloat(dividend.dividend_yield.toFixed(2))
                    : currentEntry.expected_dividend_yield,
                loadingData: false,
            });
        } catch (error) {
            console.error('데이터 로드 오류:', error);
            updateEntry(activeEntryIndex, { loadingData: false });
        }
    };

    // 종목 추가
    const addStockEntry = () => {
        const newEntry = { ...defaultStockEntry, id: Date.now() };
        setStockEntries(prev => [...prev, newEntry]);
        setActiveEntryIndex(stockEntries.length);
    };

    // 종목 삭제
    const removeStockEntry = (index) => {
        if (stockEntries.length === 1) return;
        setStockEntries(prev => prev.filter((_, i) => i !== index));
        if (activeEntryIndex >= index && activeEntryIndex > 0) {
            setActiveEntryIndex(activeEntryIndex - 1);
        }
    };

    // 필드 변경
    const handleFieldChange = (field, value) => {
        updateEntry(activeEntryIndex, { [field]: value });
    };

    // ===== 프리셋 저장/불러오기 =====
    const showMessage = (text, type = 'success') => {
        setPresetMessage({ text, type });
        setTimeout(() => setPresetMessage(null), 2500);
    };

    const savePreset = () => {
        const name = presetName.trim();
        if (!name) {
            showMessage('프리셋 이름을 입력해주세요.', 'error');
            return;
        }

        const configuredEntries = stockEntries.filter(e => e.ticker);
        if (configuredEntries.length === 0) {
            showMessage('최소 1개 종목을 설정해주세요.', 'error');
            return;
        }

        // 저장할 데이터 (불필요한 필드 제거)
        const presetData = configuredEntries.map(e => ({
            ticker: e.ticker,
            name: e.name,
            accountType: e.accountType,
            currency: e.currency,
            initial_shares: e.initial_shares,
            annual_investment: e.annual_investment,
            years: e.years,
            expected_annual_return: e.expected_annual_return,
            expected_dividend_yield: e.expected_dividend_yield,
            reinvest_dividend: e.reinvest_dividend,
            dividend_growth_rate: e.dividend_growth_rate,
            useHistoricalReturn: e.useHistoricalReturn,
        }));

        const newPreset = {
            id: Date.now(),
            name,
            entries: presetData,
            savedAt: new Date().toISOString(),
            totalAnnualInvestment: configuredEntries.reduce((s, e) => s + e.annual_investment, 0),
        };

        // 같은 이름이 있으면 덮어쓰기
        const existing = savedPresets.filter(p => p.name !== name);
        const updated = [newPreset, ...existing];
        savePresetsToStorage(updated);
        setSavedPresets(updated);
        setPresetName('');
        setShowSaveInput(false);
        showMessage(`"${name}" 저장 완료!`);
    };

    const loadPreset = (preset) => {
        const loaded = preset.entries.map((e, i) => ({
            ...defaultStockEntry,
            ...e,
            id: Date.now() + i,
            annual_investment_display: formatAmountInput(e.annual_investment),
            loadingData: false,
        }));
        setStockEntries(loaded);
        setActiveEntryIndex(0);
        setShowPresetPanel(false);
        showMessage(`"${preset.name}" 불러오기 완료!`);
    };

    const deletePreset = (presetId, e) => {
        e.stopPropagation();
        const updated = savedPresets.filter(p => p.id !== presetId);
        savePresetsToStorage(updated);
        setSavedPresets(updated);
        showMessage('프리셋 삭제됨');
    };

    const formatSavedDate = (isoString) => {
        const d = new Date(isoString);
        const month = d.getMonth() + 1;
        const day = d.getDate();
        const hours = d.getHours().toString().padStart(2, '0');
        const mins = d.getMinutes().toString().padStart(2, '0');
        return `${month}/${day} ${hours}:${mins}`;
    };

    // 연간 투자금액 쉼표 처리
    const handleInvestmentChange = (e) => {
        const raw = parseAmountInput(e.target.value);
        updateEntry(activeEntryIndex, {
            annual_investment: raw,
            annual_investment_display: formatAmountInput(raw),
        });
    };

    // 일괄 시뮬레이션 실행
    const handleSubmit = (e) => {
        e.preventDefault();
        const validEntries = stockEntries.filter(entry => entry.ticker);
        if (validEntries.length === 0) {
            alert('최소 1개 이상의 종목을 선택해주세요.');
            return;
        }
        // 각 종목별 시뮬레이션 파라미터 전달
        onSubmit(validEntries.map(entry => ({
            ticker: entry.ticker,
            name: entry.name,
            current_price: entry.current_price || 0,
            initial_shares: entry.initial_shares,
            annual_investment: entry.annual_investment,
            years: entry.years,
            expected_annual_return: entry.expected_annual_return,
            expected_dividend_yield: entry.expected_dividend_yield,
            reinvest_dividend: entry.reinvest_dividend,
            dividend_growth_rate: entry.dividend_growth_rate,
            currency: entry.currency || 'KRW',
        })));
    };

    // 검색 필터링
    const filteredHoldings = holdings.filter(h => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return h.name.toLowerCase().includes(q) || h.ticker.toLowerCase().includes(q);
    });

    const completedCount = stockEntries.filter(e => e.ticker).length;

    return (
        <div className="card simulation-form-card">
            {/* 헤더: 제목 + 저장/불러오기 버튼 */}
            <div ref={presetPanelRef}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 className="card-title" style={{ marginBottom: 0 }}>투자 시뮬레이션 설정</h3>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <button
                            type="button"
                            className="btn-preset"
                            onClick={() => {
                                setShowSaveInput(!showSaveInput);
                                setShowPresetPanel(false);
                            }}
                            title="현재 설정 저장"
                        >
                            💾
                        </button>
                        <button
                            type="button"
                            className="btn-preset"
                            onClick={() => {
                                setShowPresetPanel(!showPresetPanel);
                                setShowSaveInput(false);
                                setSavedPresets(getSavedPresets());
                            }}
                            title="저장된 설정 불러오기"
                            style={{ position: 'relative' }}
                        >
                            📂
                            {savedPresets.length > 0 && (
                                <span className="preset-badge">{savedPresets.length}</span>
                            )}
                        </button>
                    </div>
                </div>

                {/* 토스트 메시지 */}
                {presetMessage && (
                    <div className={`preset-toast ${presetMessage.type}`}>
                        {presetMessage.type === 'success' ? '✅' : '⚠️'} {presetMessage.text}
                    </div>
                )}

                {/* 저장 입력 */}
                {showSaveInput && (
                    <div className="preset-save-bar">
                        <input
                            type="text"
                            className="form-input"
                            placeholder="프리셋 이름 입력..."
                            value={presetName}
                            onChange={(e) => setPresetName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && savePreset()}
                            autoFocus
                            style={{ fontSize: '0.85rem', padding: '0.5rem 0.75rem', flex: 1 }}
                        />
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={savePreset}
                            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                        >
                            저장
                        </button>
                    </div>
                )}

                {/* 불러오기 패널 */}
                {showPresetPanel && (
                    <div className="preset-list-panel">
                        <div className="preset-list-header">저장된 프리셋</div>
                        {savedPresets.length === 0 ? (
                            <div className="preset-list-empty">
                                저장된 프리셋이 없습니다
                            </div>
                        ) : (
                            <div className="preset-list-items">
                                {savedPresets.map(preset => (
                                    <div
                                        key={preset.id}
                                        className="preset-list-item"
                                        onClick={() => loadPreset(preset)}
                                    >
                                        <div className="preset-item-info">
                                            <div className="preset-item-name">{preset.name}</div>
                                            <div className="preset-item-meta">
                                                <span>{preset.entries.length}개 종목</span>
                                                <span>·</span>
                                                <span>₩{formatNumber(preset.totalAnnualInvestment)}/년</span>
                                                <span>·</span>
                                                <span>{formatSavedDate(preset.savedAt)}</span>
                                            </div>
                                        </div>
                                        <button
                                            className="preset-item-delete"
                                            onClick={(e) => deletePreset(preset.id, e)}
                                            title="삭제"
                                        >
                                            🗑
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 종목 탭 리스트 */}
            <div className="sim-stock-tabs">
                {stockEntries.map((entry, index) => (
                    <div
                        key={entry.id}
                        className={`sim-stock-tab ${activeEntryIndex === index ? 'active' : ''} ${entry.ticker ? 'configured' : ''}`}
                        onClick={() => setActiveEntryIndex(index)}
                    >
                        <span className="sim-stock-tab-name">
                            {entry.ticker ? (
                                <>
                                    <span className="sim-stock-tab-icon">{entry.name.charAt(0)}</span>
                                    {entry.name.length > 8 ? entry.name.substring(0, 8) + '..' : entry.name}
                                </>
                            ) : (
                                <span style={{ color: '#64748b' }}>미설정</span>
                            )}
                        </span>
                        {stockEntries.length > 1 && (
                            <button
                                className="sim-stock-tab-remove"
                                onClick={(e) => { e.stopPropagation(); removeStockEntry(index); }}
                                title="삭제"
                            >
                                ×
                            </button>
                        )}
                    </div>
                ))}
                <button className="sim-stock-tab add" onClick={addStockEntry} title="종목 추가">
                    +
                </button>
            </div>

            {/* 활성 종목 편집 폼 */}
            {activeEntry && (
                <form onSubmit={handleSubmit}>
                    {/* 종목 선택 */}
                    <div className="form-group">
                        <label className="form-label">종목 선택</label>
                        <div className="stock-select-container" ref={dropdownRef}>
                            <div
                                className="form-input"
                                onClick={() => setShowDropdown(!showDropdown)}
                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                            >
                                {activeEntry.ticker ? (
                                    <>
                                        <div className="stock-option-icon" style={{ width: '28px', height: '28px' }}>
                                            {activeEntry.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 500 }}>{activeEntry.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{activeEntry.ticker}</div>
                                        </div>
                                    </>
                                ) : (
                                    <span style={{ color: '#64748b' }}>보유 종목 중 선택하세요</span>
                                )}
                            </div>

                            {showDropdown && (
                                <div className="stock-select-dropdown">
                                    <div style={{ padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="종목명 또는 코드로 검색..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            autoFocus
                                            style={{ fontSize: '0.85rem', padding: '0.5rem' }}
                                        />
                                    </div>
                                    <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                                        {filteredHoldings.map((holding) => (
                                            <div
                                                key={holding.ticker}
                                                className={`stock-select-option ${activeEntry.ticker === holding.ticker ? 'selected' : ''}`}
                                                onClick={() => handleStockSelect(holding)}
                                            >
                                                <div className="stock-option-icon">
                                                    {holding.name.charAt(0)}
                                                </div>
                                                <div className="stock-option-info">
                                                    <div className="stock-option-name">{holding.name}</div>
                                                    <div className="stock-option-ticker">{holding.ticker}</div>
                                                </div>
                                                {holding.quantity > 0 && (
                                                    <div style={{
                                                        marginLeft: 'auto',
                                                        fontSize: '0.75rem',
                                                        color: '#6366f1',
                                                        fontWeight: 500,
                                                        whiteSpace: 'nowrap',
                                                    }}>
                                                        {formatNumber(holding.quantity)}주
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {filteredHoldings.length === 0 && (
                                            <div style={{ padding: '1rem', textAlign: 'center', color: '#64748b' }}>
                                                검색 결과가 없습니다
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                        {activeEntry.loadingData && (
                            <div style={{ fontSize: '0.75rem', color: '#6366f1', marginTop: '0.5rem' }}>
                                📊 과거 데이터 로딩 중...
                            </div>
                        )}
                    </div>

                    {/* 현재 보유 수량 */}
                    {activeEntry.ticker && (
                        <div className="form-group">
                            <label className="form-label">
                                현재 보유 수량 (주)
                                <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '0.5rem' }}>
                                    종목 선택 시 자동 입력
                                </span>
                            </label>
                            <input
                                type="number"
                                className="form-input"
                                value={activeEntry.initial_shares}
                                onChange={(e) => handleFieldChange('initial_shares', parseFloat(e.target.value) || 0)}
                                min="0"
                                step="1"
                            />
                            {activeEntry.initial_shares > 0 && (
                                <div style={{ fontSize: '0.7rem', color: '#22c55e', marginTop: '0.25rem' }}>
                                    📦 보유 {formatNumber(activeEntry.initial_shares)}주부터 시작
                                </div>
                            )}
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">
                            연간 투자금액 ({activeEntry.currency === 'USD' ? '달러' : '원'})
                            {activeEntry.currency === 'USD' && (
                                <span style={{ fontSize: '0.7rem', color: '#6366f1', marginLeft: '0.5rem' }}>💵 해외계좌</span>
                            )}
                        </label>
                        <div style={{ position: 'relative' }}>
                            {activeEntry.currency === 'USD' && (
                                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 500 }}>$</span>
                            )}
                            <input
                                type="text"
                                className="form-input"
                                value={activeEntry.annual_investment_display}
                                onChange={handleInvestmentChange}
                                placeholder={activeEntry.currency === 'USD' ? '6,000' : '12,000,000'}
                                inputMode="numeric"
                                style={activeEntry.currency === 'USD' ? { paddingLeft: '28px' } : {}}
                            />
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.25rem' }}>
                            월 약 {activeEntry.currency === 'USD' ? '$' : ''}{formatNumber(Math.round(activeEntry.annual_investment / 12))}{activeEntry.currency === 'USD' ? '' : '원'}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">투자 기간 (년)</label>
                        <select
                            className="form-input form-select"
                            value={activeEntry.years}
                            onChange={(e) => handleFieldChange('years', parseInt(e.target.value))}
                        >
                            <option value={5}>5년</option>
                            <option value={10}>10년</option>
                            <option value={15}>15년</option>
                            <option value={20}>20년</option>
                            <option value={25}>25년</option>
                            <option value={30}>30년</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <label className="form-label" style={{ marginBottom: 0 }}>예상 연간 수익률 (%)</label>
                            <div className="toggle-switch">
                                <span className="toggle-switch-label">자동</span>
                                <div
                                    className={`toggle-switch-track ${activeEntry.useHistoricalReturn ? 'active' : ''}`}
                                    onClick={() => handleFieldChange('useHistoricalReturn', !activeEntry.useHistoricalReturn)}
                                >
                                    <div className="toggle-switch-thumb"></div>
                                </div>
                            </div>
                        </div>
                        <input
                            type="number"
                            className="form-input"
                            value={activeEntry.expected_annual_return}
                            onChange={(e) => handleFieldChange('expected_annual_return', parseFloat(e.target.value) || 0)}
                            min="-20"
                            max="50"
                            step="0.5"
                            disabled={activeEntry.useHistoricalReturn && activeEntry.ticker}
                            style={{ opacity: activeEntry.useHistoricalReturn && activeEntry.ticker ? 0.7 : 1 }}
                        />
                        {activeEntry.useHistoricalReturn && (
                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                                📈 과거 10년 수익률 기준 자동 입력
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            예상 배당률 (%)
                            <span style={{ fontSize: '0.7rem', color: '#64748b', marginLeft: '0.5rem' }}>
                                종목 선택 시 자동 입력
                            </span>
                        </label>
                        <input
                            type="number"
                            className="form-input"
                            value={activeEntry.expected_dividend_yield}
                            onChange={(e) => handleFieldChange('expected_dividend_yield', parseFloat(e.target.value) || 0)}
                            min="0"
                            max="20"
                            step="0.01"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">배당 성장률 (%/년)</label>
                        <input
                            type="number"
                            className="form-input"
                            value={activeEntry.dividend_growth_rate}
                            onChange={(e) => handleFieldChange('dividend_growth_rate', parseFloat(e.target.value) || 0)}
                            min="0"
                            max="20"
                            step="0.01"
                        />
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={activeEntry.reinvest_dividend}
                                onChange={(e) => handleFieldChange('reinvest_dividend', e.target.checked)}
                                style={{ width: '18px', height: '18px' }}
                            />
                            <span className="form-label" style={{ marginBottom: 0 }}>
                                배당금 자동 재투자
                            </span>
                        </label>
                    </div>

                    {/* 현황 요약 */}
                    <div style={{
                        padding: '0.75rem 1rem',
                        background: 'rgba(99, 102, 241, 0.08)',
                        borderRadius: '8px',
                        marginBottom: '1rem',
                        fontSize: '0.85rem',
                    }}>
                        <div style={{ color: '#94a3b8', marginBottom: '0.25rem' }}>
                            설정 완료: <strong style={{ color: '#f8fafc' }}>{completedCount}</strong> / {stockEntries.length}개 종목
                        </div>
                        {completedCount > 0 && (() => {
                            const configured = stockEntries.filter(e => e.ticker);
                            const krwTotal = configured.filter(e => e.currency !== 'USD').reduce((s, e) => s + e.annual_investment, 0);
                            const usdTotal = configured.filter(e => e.currency === 'USD').reduce((s, e) => s + e.annual_investment, 0);
                            return (
                                <div style={{ color: '#64748b', fontSize: '0.75rem' }}>
                                    총 연간 투자: {krwTotal > 0 && `₩${formatNumber(krwTotal)}`}{krwTotal > 0 && usdTotal > 0 && ' + '}{usdTotal > 0 && `$${formatNumber(usdTotal)}`}
                                </div>
                            );
                        })()}
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%' }}
                        disabled={loading || completedCount === 0}
                    >
                        {loading ? '계산 중...' : `🚀 ${completedCount}개 종목 일괄 시뮬레이션`}
                    </button>
                </form>
            )}
        </div>
    );
}

export default SimulationForm;
