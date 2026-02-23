from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date
from enum import Enum


class StockHolding(BaseModel):
    """보유 종목 정보"""
    ticker: str = Field(..., description="종목코드")
    name: str = Field(..., description="종목명")
    quantity: int = Field(..., description="보유수량")
    avg_price: float = Field(..., description="매입평균가")
    current_price: float = Field(..., description="현재가")
    profit_loss: float = Field(..., description="손익금액")
    profit_rate: float = Field(..., description="수익률(%)")
    eval_amount: float = Field(..., description="평가금액")
    purchase_amount: float = Field(..., description="매입금액")


class PortfolioSummary(BaseModel):
    """포트폴리오 요약"""
    total_invested: float = Field(..., description="총 매입금액")
    total_eval: float = Field(..., description="총 평가금액")
    total_profit_loss: float = Field(..., description="총 손익금액")
    profit_rate: float = Field(..., description="총 수익률(%)")
    daily_change: float = Field(0.0, description="일일 증감액")
    daily_change_rate: float = Field(0.0, description="일일 증감률(%)")
    holdings: List[StockHolding] = Field(default_factory=list)


class TotalAssetSummary(BaseModel):
    """전체 자산 총합"""
    total_eval_krw: float = Field(..., description="전체 평가금액 (원화)")
    total_invested_krw: float = Field(..., description="전체 투자금액 (원화)")
    total_profit_loss_krw: float = Field(..., description="전체 손익금액 (원화)")
    total_profit_rate: float = Field(..., description="전체 수익률(%)")
    daily_change_krw: float = Field(0.0, description="일일 증감액 (원화)")
    daily_change_rate: float = Field(0.0, description="일일 증감률(%)")
    exchange_rate: float = Field(1450.0, description="적용 환율")
    domestic: Optional['PortfolioSummary'] = None
    overseas: Optional['PortfolioSummary'] = None
    isa: Optional['PortfolioSummary'] = None


class StockHistory(BaseModel):
    """주가 히스토리"""
    date: str = Field(..., description="날짜")
    open: float = Field(..., description="시가")
    high: float = Field(..., description="고가")
    low: float = Field(..., description="저가")
    close: float = Field(..., description="종가")
    volume: int = Field(..., description="거래량")


class StockInfo(BaseModel):
    """종목 상세 정보"""
    ticker: str
    name: str
    current_price: float
    change_rate: float
    high_52week: float
    low_52week: float
    market_cap: Optional[float] = None
    per: Optional[float] = None
    pbr: Optional[float] = None


class DividendInfo(BaseModel):
    """배당 정보"""
    ticker: str
    name: str
    dividend_per_share: float = Field(..., description="주당배당금")
    dividend_yield: float = Field(..., description="배당률(%)")
    ex_dividend_date: Optional[str] = Field(None, description="배당락일")
    pay_date: Optional[str] = Field(None, description="배당지급일")
    dividend_payout_ratio: Optional[float] = Field(None, description="배당성향(%)")


class HistoricalReturn(BaseModel):
    """과거 수익률"""
    period: str = Field(..., description="기간 (1Y, 5Y, 10Y)")
    start_price: float
    end_price: float
    return_rate: float = Field(..., description="수익률(%)")
    annualized_return: float = Field(..., description="연환산 수익률(%)")


class SimulationPeriod(str, Enum):
    FIVE_YEARS = "5"
    TEN_YEARS = "10"
    TWENTY_YEARS = "20"


class SimulationRequest(BaseModel):
    """시뮬레이션 요청"""
    ticker: str = Field(..., description="종목코드")
    name: Optional[str] = Field(None, description="종목명 (프론트엔드 제공)")
    current_price: Optional[float] = Field(None, description="현재 주가 (프론트엔드 제공)")
    annual_investment: float = Field(..., description="연간 투자금액", gt=0)
    years: int = Field(..., description="시뮬레이션 기간", ge=1, le=30)
    expected_annual_return: float = Field(..., description="예상 연간 수익률(%)")
    expected_dividend_yield: float = Field(..., description="예상 배당률(%)")
    reinvest_dividend: bool = Field(True, description="배당금 재투자 여부")
    dividend_growth_rate: float = Field(0.0, description="배당 성장률(%)")
    initial_shares: float = Field(0.0, description="현재 보유 주식 수량")
    currency: str = Field("KRW", description="통화 (KRW 또는 USD)")


class YearlyResult(BaseModel):
    """연간 시뮬레이션 결과"""
    year: int
    invested_amount: float = Field(..., description="누적 투자금액")
    portfolio_value: float = Field(..., description="포트폴리오 가치")
    yearly_dividend: float = Field(..., description="당해 배당금")
    monthly_dividend: float = Field(..., description="월배당금 (당해 배당금/12)")
    total_dividend: float = Field(..., description="누적 배당금")
    accumulated_shares: float = Field(..., description="누적 주식 수")
    total_return_rate: float = Field(..., description="총 수익률(%)")


class SimulationResult(BaseModel):
    """시뮬레이션 결과"""
    ticker: str
    name: str
    initial_price: float
    initial_shares: float = Field(0.0, description="시작 보유 주식 수량")
    initial_value: float = Field(0.0, description="시작 보유 주식 평가금액")
    yearly_results: List[YearlyResult]
    final_portfolio_value: float
    total_invested: float
    total_dividend: float
    final_monthly_dividend: float = Field(0.0, description="최종연도 월배당금")
    total_profit: float
    total_return_rate: float
    currency: str = Field("KRW", description="통화 (KRW 또는 USD)")
