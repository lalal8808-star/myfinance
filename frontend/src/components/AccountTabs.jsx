function AccountTabs({ activeTab, onTabChange }) {
    const tabs = [
        { id: 'domestic', label: '🇰🇷 국내주식', icon: '' },
        { id: 'overseas', label: '🇺🇸 해외주식', icon: '' },
        { id: 'isa', label: '📊 ISA', icon: '' },
    ];

    return (
        <div className="account-tabs">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    className={`account-tab ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => onTabChange(tab.id)}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}

export default AccountTabs;
