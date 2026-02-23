"""
한국투자증권 포트폴리오 API 서버

FastAPI 기반 RESTful API 서버
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from datetime import datetime

from models import (
    PortfolioSummary, TotalAssetSummary, StockInfo, StockHistory, 
    DividendInfo, HistoricalReturn,
    SimulationRequest, SimulationResult, YearlyResult
)
from kis_client import kis_client


app = FastAPI(
    title="투자 포트폴리오 API",
    description="한국투자증권 API를 활용한 포트폴리오 관리 시스템",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # 배포 환경(Vercel 등)에서 접근 가능하도록 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """서버 상태 확인"""
    return {
        "status": "running",
        "api_configured": kis_client.is_configured,
        "timestamp": datetime.now().isoformat()
    }


@app.get("/api/portfolio", response_model=PortfolioSummary)
async def get_portfolio():
    """
    포트폴리오 현황 조회 (국내주식)
    
    보유 종목, 수량, 매입가, 현재가, 수익률, 손익금액 반환
    """
    return await kis_client.get_portfolio()


@app.get("/api/portfolio/overseas", response_model=PortfolioSummary)
async def get_overseas_portfolio(market: str = "NASD"):
    """
    해외주식 포트폴리오 조회
    
    - market: NASD(나스닥), NYSE(뉴욕), AMEX(아멕스), SEHK(홍콩)
    """
    return await kis_client.get_overseas_portfolio(market)


@app.get("/api/portfolio/isa", response_model=PortfolioSummary)
async def get_isa_portfolio():
    """
    ISA 계좌 포트폴리오 조회
    """
    return await kis_client.get_isa_portfolio()


@app.get("/api/portfolio/total", response_model=TotalAssetSummary)
async def get_total_assets(exchange_rate: float = 1450.0):
    """
    전체 자산 총합 조회 (국내 + 해외 + ISA)
    
    해외주식은 환율을 적용하여 원화로 환산합니다.
    - exchange_rate: USD/KRW 환율 (기본 1,450원)
    """
    import asyncio
    
    # 3개 계좌 동시 조회
    domestic, overseas, isa = await asyncio.gather(
        kis_client.get_portfolio(),
        kis_client.get_overseas_portfolio(),
        kis_client.get_isa_portfolio(),
        return_exceptions=True
    )
    
    total_eval_krw = 0.0
    total_invested_krw = 0.0
    daily_change_krw = 0.0
    
    # 국내주식
    if isinstance(domestic, PortfolioSummary):
        total_eval_krw += domestic.total_eval
        total_invested_krw += domestic.total_invested
        daily_change_krw += domestic.daily_change
    else:
        domestic = None
    
    # 해외주식 (USD -> KRW 환산)
    if isinstance(overseas, PortfolioSummary):
        total_eval_krw += overseas.total_eval * exchange_rate
        total_invested_krw += overseas.total_invested * exchange_rate
        daily_change_krw += overseas.daily_change * exchange_rate
    else:
        overseas = None
    
    # ISA
    if isinstance(isa, PortfolioSummary):
        total_eval_krw += isa.total_eval
        total_invested_krw += isa.total_invested
        daily_change_krw += isa.daily_change
    else:
        isa = None
    
    total_profit_loss_krw = total_eval_krw - total_invested_krw
    total_profit_rate = (total_profit_loss_krw / total_invested_krw * 100) if total_invested_krw > 0 else 0
    
    # 일일 증감률 (전체 기준)
    prev_total = total_eval_krw - daily_change_krw
    daily_change_rate = (daily_change_krw / prev_total * 100) if prev_total > 0 else 0
    
    return TotalAssetSummary(
        total_eval_krw=round(total_eval_krw, 0),
        total_invested_krw=round(total_invested_krw, 0),
        total_profit_loss_krw=round(total_profit_loss_krw, 0),
        total_profit_rate=round(total_profit_rate, 2),
        daily_change_krw=round(daily_change_krw, 0),
        daily_change_rate=round(daily_change_rate, 2),
        exchange_rate=exchange_rate,
        domestic=domestic if isinstance(domestic, PortfolioSummary) else None,
        overseas=overseas if isinstance(overseas, PortfolioSummary) else None,
        isa=isa if isinstance(isa, PortfolioSummary) else None
    )


@app.get("/api/stock/{ticker}", response_model=StockInfo)
async def get_stock_info(ticker: str):
    """
    종목 상세 정보 조회
    
    현재가, 등락률, 52주 고가/저가, 시가총액, PER, PBR 등
    """
    return await kis_client.get_stock_info(ticker)


@app.get("/api/stock/{ticker}/history", response_model=List[StockHistory])
async def get_stock_history(ticker: str, years: int = 5):
    """
    종목 주가 히스토리 조회
    
    - years: 조회 기간 (1, 5, 10년)
    """
    if years not in [1, 5, 10]:
        raise HTTPException(status_code=400, detail="years must be 1, 5, or 10")
    
    return await kis_client.get_stock_history(ticker, years)


@app.get("/api/stock/{ticker}/dividend", response_model=DividendInfo)
async def get_dividend_info(ticker: str):
    """
    종목 배당 정보 조회
    
    주당배당금, 배당률, 배당락일, 지급일 등
    """
    return await kis_client.get_dividend_info(ticker)


@app.get("/api/stock/{ticker}/returns", response_model=List[HistoricalReturn])
async def get_historical_returns(ticker: str):
    """
    종목 과거 수익률 조회
    
    1년, 5년, 10년 수익률 및 연환산 수익률
    """
    return await kis_client.get_historical_returns(ticker)


@app.post("/api/simulation", response_model=SimulationResult)
async def run_simulation(request: SimulationRequest):
    """
    투자 시뮬레이션 실행
    
    매년 동일 금액 투자 시 미래 자산 및 배당금 예측
    """
    # 현재 주가 정보 조회 (프론트엔드에서 제공한 가격 우선 사용)
    if request.current_price and request.current_price > 0:
        initial_price = request.current_price
        stock_name = request.name or f"종목 {request.ticker}"
    else:
        stock_info = await kis_client.get_stock_info(request.ticker)
        initial_price = stock_info.current_price
        stock_name = stock_info.name
    
    if initial_price <= 0:
        raise HTTPException(status_code=400, detail="Invalid stock price")
    
    yearly_results = []
    
    # 시뮬레이션 변수 초기화 (현재 보유 수량 포함)
    accumulated_shares = request.initial_shares  # 현재 보유 주식부터 시작
    initial_value = accumulated_shares * initial_price  # 현재 보유 주식 평가금액
    total_invested = 0.0
    total_dividend = 0.0
    current_price = initial_price
    
    # 배당금 계산: 초기 주당 배당금 기준으로 배당성장률만 적용
    initial_dividend_per_share = initial_price * (request.expected_dividend_yield / 100)
    
    # 통화에 따른 금액 소수점 자릿수 (USD는 정수 반올림)
    yr_decimals = 0
    
    for year in range(1, request.years + 1):
        # 연간 투자금으로 주식 매수
        shares_bought = request.annual_investment / current_price
        accumulated_shares += shares_bought
        total_invested += request.annual_investment
        
        # 연간 배당금 계산 (주당 배당금 × 보유 주식수)
        # 배당성장률은 주당 배당금에만 적용 (주가 상승과 독립)
        dividend_per_share = initial_dividend_per_share * ((1 + request.dividend_growth_rate / 100) ** year)
        yearly_dividend = accumulated_shares * dividend_per_share
        
        # 배당금 재투자
        if request.reinvest_dividend:
            reinvest_shares = yearly_dividend / current_price
            accumulated_shares += reinvest_shares
        
        total_dividend += yearly_dividend
        
        # 포트폴리오 가치 계산
        portfolio_value = accumulated_shares * current_price
        
        # 총 수익률 계산 (초기 보유분 + 신규 투자금 기준)
        total_base = total_invested + initial_value
        total_return_rate = ((portfolio_value + total_dividend - total_base) / total_base) * 100 if total_base > 0 else 0
        
        yearly_results.append(YearlyResult(
            year=year,
            invested_amount=round(total_invested + initial_value, yr_decimals),
            portfolio_value=round(portfolio_value, yr_decimals),
            yearly_dividend=round(yearly_dividend, yr_decimals),
            monthly_dividend=round(yearly_dividend / 12, yr_decimals),
            total_dividend=round(total_dividend, yr_decimals),
            accumulated_shares=round(accumulated_shares, 2),
            total_return_rate=round(total_return_rate, 2)
        ))
        
        # 다음 해 가격 업데이트 (배당수익률은 별도 관리하므로 주가만 업데이트)
        current_price *= (1 + request.expected_annual_return / 100)
    
    # 최종 결과
    final_result = yearly_results[-1]
    
    return SimulationResult(
        ticker=request.ticker,
        name=stock_name,
        initial_price=initial_price,
        initial_shares=request.initial_shares,
        initial_value=round(initial_value, yr_decimals),
        yearly_results=yearly_results,
        final_portfolio_value=round(final_result.portfolio_value, yr_decimals),
        total_invested=round(final_result.invested_amount, yr_decimals),
        total_dividend=round(final_result.total_dividend, yr_decimals),
        final_monthly_dividend=round(final_result.monthly_dividend, yr_decimals),
        total_profit=round(final_result.portfolio_value + final_result.total_dividend - final_result.invested_amount, yr_decimals),
        total_return_rate=final_result.total_return_rate,
        currency=request.currency
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
