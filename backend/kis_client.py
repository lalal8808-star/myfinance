"""
한국투자증권 KIS API 클라이언트

pykis 라이브러리를 래핑하여 필요한 기능을 제공합니다.
API 키가 설정되지 않은 경우 데모 데이터를 반환합니다.
"""
import httpx
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import json

from config import settings
from models import (
    StockHolding, PortfolioSummary, StockHistory, 
    StockInfo, DividendInfo, HistoricalReturn
)


class KISClient:
    """한국투자증권 API 클라이언트"""
    
    def __init__(self):
        self.base_url = settings.KIS_BASE_URL
        self.app_key = settings.KIS_APP_KEY
        self.app_secret = settings.KIS_APP_SECRET
        self.account_number = settings.KIS_ACCOUNT_NUMBER
        self.account_product_code = settings.KIS_ACCOUNT_PRODUCT_CODE
        self.is_virtual = settings.KIS_IS_VIRTUAL
        
        self._access_token: Optional[str] = None
        self._token_expires_at: Optional[datetime] = None
        
        # ISA 전용 토큰 (별도 API 키 사용 시)
        self._isa_access_token: Optional[str] = None
        self._isa_token_expires_at: Optional[datetime] = None
        
        # API 키가 설정되어 있는지 확인
        self.is_configured = bool(
            self.app_key and 
            self.app_secret and 
            self.account_number and
            self.app_key != "your_app_key_here"
        )
    
    async def _get_access_token(self) -> str:
        """액세스 토큰 발급 또는 캐시된 토큰 반환"""
        if self._access_token and self._token_expires_at:
            if datetime.now() < self._token_expires_at:
                return self._access_token
        
        async with httpx.AsyncClient() as client:
            url = f"{self.base_url}/oauth2/tokenP"
            headers = {"content-type": "application/json"}
            body = {
                "grant_type": "client_credentials",
                "appkey": self.app_key,
                "appsecret": self.app_secret
            }
            
            response = await client.post(url, headers=headers, json=body)
            data = response.json()
            
            self._access_token = data.get("access_token")
            # 토큰 만료 시간 설정 (기본 24시간, 여유를 두고 23시간으로 설정)
            self._token_expires_at = datetime.now() + timedelta(hours=23)
            
            return self._access_token
    
    async def _get_isa_access_token(self) -> str:
        """ISA 전용 액세스 토큰 발급 또는 캐시된 토큰 반환"""
        # ISA 전용 키가 없으면 공통 토큰 사용
        if not settings.has_separate_isa_key:
            return await self._get_access_token()
        
        if self._isa_access_token and self._isa_token_expires_at:
            if datetime.now() < self._isa_token_expires_at:
                return self._isa_access_token
        
        async with httpx.AsyncClient() as client:
            url = f"{self.base_url}/oauth2/tokenP"
            headers = {"content-type": "application/json"}
            body = {
                "grant_type": "client_credentials",
                "appkey": settings.isa_app_key,
                "appsecret": settings.isa_app_secret
            }
            
            response = await client.post(url, headers=headers, json=body)
            data = response.json()
            
            self._isa_access_token = data.get("access_token")
            self._isa_token_expires_at = datetime.now() + timedelta(hours=23)
            
            return self._isa_access_token
    
    def _get_demo_portfolio(self) -> PortfolioSummary:
        """데모 포트폴리오 데이터"""
        demo_holdings = [
            StockHolding(
                ticker="005930",
                name="삼성전자",
                quantity=50,
                avg_price=65000,
                current_price=72000,
                profit_loss=350000,
                profit_rate=10.77,
                eval_amount=3600000,
                purchase_amount=3250000
            ),
            StockHolding(
                ticker="000660",
                name="SK하이닉스",
                quantity=20,
                avg_price=125000,
                current_price=180000,
                profit_loss=1100000,
                profit_rate=44.0,
                eval_amount=3600000,
                purchase_amount=2500000
            ),
            StockHolding(
                ticker="035420",
                name="NAVER",
                quantity=15,
                avg_price=210000,
                current_price=195000,
                profit_loss=-225000,
                profit_rate=-7.14,
                eval_amount=2925000,
                purchase_amount=3150000
            ),
            StockHolding(
                ticker="051910",
                name="LG화학",
                quantity=8,
                avg_price=420000,
                current_price=385000,
                profit_loss=-280000,
                profit_rate=-8.33,
                eval_amount=3080000,
                purchase_amount=3360000
            ),
            StockHolding(
                ticker="006400",
                name="삼성SDI",
                quantity=10,
                avg_price=380000,
                current_price=420000,
                profit_loss=400000,
                profit_rate=10.53,
                eval_amount=4200000,
                purchase_amount=3800000
            ),
        ]
        
        total_invested = sum(h.purchase_amount for h in demo_holdings)
        total_eval = sum(h.eval_amount for h in demo_holdings)
        total_profit_loss = total_eval - total_invested
        profit_rate = (total_profit_loss / total_invested) * 100 if total_invested > 0 else 0
        
        return PortfolioSummary(
            total_invested=total_invested,
            total_eval=total_eval,
            total_profit_loss=total_profit_loss,
            profit_rate=round(profit_rate, 2),
            holdings=demo_holdings
        )
    
    async def get_portfolio(self) -> PortfolioSummary:
        """계좌 잔고 및 보유 종목 조회"""
        if not self.is_configured:
            return self._get_demo_portfolio()
        
        try:
            token = await self._get_access_token()
            
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/uapi/domestic-stock/v1/trading/inquire-balance"
                
                tr_id = "VTTC8434R" if self.is_virtual else "TTTC8434R"
                
                headers = {
                    "content-type": "application/json",
                    "authorization": f"Bearer {token}",
                    "appkey": self.app_key,
                    "appsecret": self.app_secret,
                    "tr_id": tr_id,
                }
                
                params = {
                    "CANO": self.account_number,
                    "ACNT_PRDT_CD": self.account_product_code,
                    "AFHR_FLPR_YN": "N",
                    "OFL_YN": "",
                    "INQR_DVSN": "02",
                    "UNPR_DVSN": "01",
                    "FUND_STTL_ICLD_YN": "N",
                    "FNCG_AMT_AUTO_RDPT_YN": "N",
                    "PRCS_DVSN": "00",
                    "CTX_AREA_FK100": "",
                    "CTX_AREA_NK100": "",
                }
                
                response = await client.get(url, headers=headers, params=params)
                data = response.json()
                
                holdings = []
                for item in data.get("output1", []):
                    if int(item.get("hldg_qty", 0)) > 0:
                        quantity = int(item.get("hldg_qty", 0))
                        avg_price = float(item.get("pchs_avg_pric", 0))
                        current_price = float(item.get("prpr", 0))
                        purchase_amount = quantity * avg_price
                        eval_amount = float(item.get("evlu_amt", 0))
                        profit_loss = float(item.get("evlu_pfls_amt", 0))
                        profit_rate = float(item.get("evlu_pfls_rt", 0))
                        
                        holdings.append(StockHolding(
                            ticker=item.get("pdno", ""),
                            name=item.get("prdt_name", ""),
                            quantity=quantity,
                            avg_price=avg_price,
                            current_price=current_price,
                            profit_loss=profit_loss,
                            profit_rate=profit_rate,
                            eval_amount=eval_amount,
                            purchase_amount=purchase_amount
                        ))
                
                # 총계 정보
                output2 = data.get("output2", [{}])[0] if data.get("output2") else {}
                total_invested = float(output2.get("pchs_amt_smtl_amt", 0))
                total_eval = float(output2.get("evlu_amt_smtl_amt", 0))
                total_profit_loss = float(output2.get("evlu_pfls_smtl_amt", 0))
                profit_rate = (total_profit_loss / total_invested * 100) if total_invested > 0 else 0
                
                # 일일 증감
                bfdy_tot = float(output2.get("bfdy_tot_asst_evlu_amt", 0))
                daily_change = float(output2.get("asst_icdc_amt", 0))
                daily_change_rate = float(output2.get("asst_icdc_erng_rt", 0))
                
                # bfdy_tot_asst_evlu_amt가 없으면 asst_icdc_amt도 없을 수 있음
                if daily_change == 0 and bfdy_tot > 0:
                    daily_change = total_eval - bfdy_tot
                    daily_change_rate = (daily_change / bfdy_tot * 100) if bfdy_tot > 0 else 0
                
                return PortfolioSummary(
                    total_invested=total_invested,
                    total_eval=total_eval,
                    total_profit_loss=total_profit_loss,
                    profit_rate=round(profit_rate, 2),
                    daily_change=round(daily_change, 0),
                    daily_change_rate=round(daily_change_rate, 2),
                    holdings=holdings
                )
                
        except Exception as e:
            print(f"API 호출 오류: {e}")
            return self._get_demo_portfolio()
    
    def _get_demo_stock_info(self, ticker: str) -> StockInfo:
        """데모 종목 정보"""
        demo_stocks = {
            "005930": StockInfo(
                ticker="005930", name="삼성전자", current_price=72000,
                change_rate=1.5, high_52week=85000, low_52week=58000,
                market_cap=430000000000000, per=12.5, pbr=1.2
            ),
            "000660": StockInfo(
                ticker="000660", name="SK하이닉스", current_price=180000,
                change_rate=2.3, high_52week=200000, low_52week=100000,
                market_cap=130000000000000, per=8.5, pbr=1.8
            ),
            "035420": StockInfo(
                ticker="035420", name="NAVER", current_price=195000,
                change_rate=-0.8, high_52week=250000, low_52week=170000,
                market_cap=32000000000000, per=25.3, pbr=1.5
            ),
        }
        
        return demo_stocks.get(ticker, StockInfo(
            ticker=ticker, name=f"종목 {ticker}", current_price=50000,
            change_rate=0.5, high_52week=60000, low_52week=40000,
            market_cap=10000000000000, per=15.0, pbr=1.0
        ))
    
    async def get_stock_info(self, ticker: str) -> StockInfo:
        """종목 현재가 및 기본 정보 조회"""
        if not self.is_configured:
            return self._get_demo_stock_info(ticker)
        
        try:
            token = await self._get_access_token()
            
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/uapi/domestic-stock/v1/quotations/inquire-price"
                
                headers = {
                    "content-type": "application/json",
                    "authorization": f"Bearer {token}",
                    "appkey": self.app_key,
                    "appsecret": self.app_secret,
                    "tr_id": "FHKST01010100",
                }
                
                params = {
                    "FID_COND_MRKT_DIV_CODE": "J",
                    "FID_INPUT_ISCD": ticker,
                }
                
                response = await client.get(url, headers=headers, params=params)
                data = response.json()
                output = data.get("output", {})
                
                return StockInfo(
                    ticker=ticker,
                    name=output.get("hts_kor_isnm", ""),
                    current_price=float(output.get("stck_prpr", 0)),
                    change_rate=float(output.get("prdy_ctrt", 0)),
                    high_52week=float(output.get("stck_hgpr", 0)),
                    low_52week=float(output.get("stck_lwpr", 0)),
                    market_cap=float(output.get("hts_avls", 0)) * 100000000 if output.get("hts_avls") else None,
                    per=float(output.get("per", 0)) if output.get("per") else None,
                    pbr=float(output.get("pbr", 0)) if output.get("pbr") else None,
                )
                
        except Exception as e:
            print(f"종목 정보 조회 오류: {e}")
            return self._get_demo_stock_info(ticker)
    
    def _get_demo_stock_history(self, ticker: str, years: int = 5) -> List[StockHistory]:
        """데모 주가 히스토리 생성"""
        import random
        
        history = []
        base_price = 50000
        
        # 최근 날짜부터 과거로
        end_date = datetime.now()
        days = years * 252  # 영업일 기준
        
        for i in range(days):
            date = end_date - timedelta(days=i * 1.4)  # 영업일 대략 환산
            
            # 랜덤 변동폭
            change = random.uniform(-0.03, 0.035)
            base_price = base_price * (1 + change)
            base_price = max(base_price, 10000)  # 최소가 제한
            
            high = base_price * random.uniform(1.0, 1.02)
            low = base_price * random.uniform(0.98, 1.0)
            open_price = random.uniform(low, high)
            
            history.append(StockHistory(
                date=date.strftime("%Y-%m-%d"),
                open=round(open_price, 0),
                high=round(high, 0),
                low=round(low, 0),
                close=round(base_price, 0),
                volume=random.randint(1000000, 50000000)
            ))
        
        # 날짜순 정렬 (오래된 것부터)
        history.reverse()
        return history
    
    async def get_stock_history(self, ticker: str, years: int = 5) -> List[StockHistory]:
        """기간별 주가 히스토리 조회"""
        if not self.is_configured:
            return self._get_demo_stock_history(ticker, years)
        
        try:
            token = await self._get_access_token()
            history = []
            
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice"
                
                headers = {
                    "content-type": "application/json",
                    "authorization": f"Bearer {token}",
                    "appkey": self.app_key,
                    "appsecret": self.app_secret,
                    "tr_id": "FHKST03010100",
                }
                
                # 기간 설정
                end_date = datetime.now()
                start_date = end_date - timedelta(days=years * 365)
                
                params = {
                    "FID_COND_MRKT_DIV_CODE": "J",
                    "FID_INPUT_ISCD": ticker,
                    "FID_INPUT_DATE_1": start_date.strftime("%Y%m%d"),
                    "FID_INPUT_DATE_2": end_date.strftime("%Y%m%d"),
                    "FID_PERIOD_DIV_CODE": "D",  # 일봉
                    "FID_ORG_ADJ_PRC": "0",  # 수정주가
                }
                
                response = await client.get(url, headers=headers, params=params)
                data = response.json()
                
                for item in data.get("output2", []):
                    history.append(StockHistory(
                        date=f"{item.get('stck_bsop_date', '')[:4]}-{item.get('stck_bsop_date', '')[4:6]}-{item.get('stck_bsop_date', '')[6:8]}",
                        open=float(item.get("stck_oprc", 0)),
                        high=float(item.get("stck_hgpr", 0)),
                        low=float(item.get("stck_lwpr", 0)),
                        close=float(item.get("stck_clpr", 0)),
                        volume=int(item.get("acml_vol", 0))
                    ))
                
                # 날짜순 정렬
                history.sort(key=lambda x: x.date)
                return history
                
        except Exception as e:
            print(f"주가 히스토리 조회 오류: {e}")
            return self._get_demo_stock_history(ticker, years)
    
    def _get_demo_dividend_info(self, ticker: str) -> DividendInfo:
        """데모 배당 정보"""
        demo_dividends = {
            "005930": DividendInfo(
                ticker="005930", name="삼성전자",
                dividend_per_share=1444, dividend_yield=2.0,
                ex_dividend_date="2025-12-27", pay_date="2026-04-20",
                dividend_payout_ratio=25.0
            ),
            "000660": DividendInfo(
                ticker="000660", name="SK하이닉스",
                dividend_per_share=1200, dividend_yield=0.67,
                ex_dividend_date="2025-12-27", pay_date="2026-04-18",
                dividend_payout_ratio=10.0
            ),
            "035420": DividendInfo(
                ticker="035420", name="NAVER",
                dividend_per_share=500, dividend_yield=0.26,
                ex_dividend_date="2025-12-27", pay_date="2026-04-15",
                dividend_payout_ratio=5.0
            ),
        }
        
        return demo_dividends.get(ticker, DividendInfo(
            ticker=ticker, name=f"종목 {ticker}",
            dividend_per_share=1000, dividend_yield=2.0,
            ex_dividend_date="2025-12-27", pay_date="2026-04-20",
            dividend_payout_ratio=20.0
        ))
    
    async def get_dividend_info(self, ticker: str) -> DividendInfo:
        """배당 정보 조회"""
        if not self.is_configured:
            return self._get_demo_dividend_info(ticker)
        
        # KIS API에서 배당 정보를 직접 제공하는 엔드포인트가 제한적이므로
        # 기본적으로 예탁원정보(배당) API 호출 시도
        try:
            stock_info = await self.get_stock_info(ticker)
            
            # 배당 정보는 별도 API 또는 외부 소스 필요
            # 여기서는 기본값 반환
            return DividendInfo(
                ticker=ticker,
                name=stock_info.name,
                dividend_per_share=0,
                dividend_yield=0,
                ex_dividend_date=None,
                pay_date=None,
                dividend_payout_ratio=None
            )
            
        except Exception as e:
            print(f"배당 정보 조회 오류: {e}")
            return self._get_demo_dividend_info(ticker)
    
    async def get_historical_returns(self, ticker: str) -> List[HistoricalReturn]:
        """과거 수익률 계산 (1년, 5년, 10년)"""
        history = await self.get_stock_history(ticker, years=10)
        
        if not history:
            return []
        
        returns = []
        current_price = history[-1].close
        
        for period_years, label in [(1, "1Y"), (5, "5Y"), (10, "10Y")]:
            target_days = period_years * 252  # 영업일 기준
            
            if len(history) >= target_days:
                start_price = history[-target_days].close
            elif len(history) > 0:
                start_price = history[0].close
            else:
                continue
            
            if start_price > 0:
                total_return = ((current_price - start_price) / start_price) * 100
                annualized = ((current_price / start_price) ** (1 / period_years) - 1) * 100
                
                returns.append(HistoricalReturn(
                    period=label,
                    start_price=start_price,
                    end_price=current_price,
                    return_rate=round(total_return, 2),
                    annualized_return=round(annualized, 2)
                ))
        
        return returns
    
    def _get_demo_overseas_portfolio(self) -> PortfolioSummary:
        """데모 해외주식 포트폴리오"""
        demo_holdings = [
            StockHolding(
                ticker="AAPL",
                name="애플",
                quantity=10,
                avg_price=150.0,
                current_price=178.5,
                profit_loss=285.0,
                profit_rate=19.0,
                eval_amount=1785.0,
                purchase_amount=1500.0
            ),
            StockHolding(
                ticker="MSFT",
                name="마이크로소프트",
                quantity=5,
                avg_price=320.0,
                current_price=405.0,
                profit_loss=425.0,
                profit_rate=26.56,
                eval_amount=2025.0,
                purchase_amount=1600.0
            ),
            StockHolding(
                ticker="GOOGL",
                name="알파벳",
                quantity=8,
                avg_price=130.0,
                current_price=142.0,
                profit_loss=96.0,
                profit_rate=9.23,
                eval_amount=1136.0,
                purchase_amount=1040.0
            ),
        ]
        
        total_invested = sum(h.purchase_amount for h in demo_holdings)
        total_eval = sum(h.eval_amount for h in demo_holdings)
        total_profit_loss = total_eval - total_invested
        profit_rate = (total_profit_loss / total_invested) * 100 if total_invested > 0 else 0
        
        return PortfolioSummary(
            total_invested=total_invested,
            total_eval=total_eval,
            total_profit_loss=total_profit_loss,
            profit_rate=round(profit_rate, 2),
            holdings=demo_holdings
        )
    
    async def get_overseas_portfolio(self, market: str = "NASD") -> PortfolioSummary:
        """
        해외주식 잔고 조회
        market: NASD(나스닥), NYSE(뉴욕), AMEX(아멕스), SEHK(홍콩)
        """
        if not self.is_configured:
            return self._get_demo_overseas_portfolio()
        
        try:
            token = await self._get_access_token()
            
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/uapi/overseas-stock/v1/trading/inquire-balance"
                
                # 실전/모의 TR ID
                tr_id = "VTTS3012R" if self.is_virtual else "TTTS3012R"
                
                headers = {
                    "content-type": "application/json",
                    "authorization": f"Bearer {token}",
                    "appkey": self.app_key,
                    "appsecret": self.app_secret,
                    "tr_id": tr_id,
                }
                
                # 해외주식용 계좌 정보
                overseas_acct = settings.overseas_account
                overseas_prod = settings.overseas_product_code
                
                params = {
                    "CANO": overseas_acct,
                    "ACNT_PRDT_CD": overseas_prod,
                    "OVRS_EXCG_CD": market,
                    "TR_CRCY_CD": "USD",
                    "CTX_AREA_FK200": "",
                    "CTX_AREA_NK200": "",
                }
                
                response = await client.get(url, headers=headers, params=params)
                data = response.json()
                
                holdings = []
                for item in data.get("output1", []):
                    if float(item.get("ovrs_cblc_qty", 0)) > 0:
                        quantity = int(float(item.get("ovrs_cblc_qty", 0)))
                        avg_price = float(item.get("pchs_avg_pric", 0))
                        current_price = float(item.get("now_pric2", 0))
                        purchase_amount = float(item.get("frcr_pchs_amt1", 0))
                        eval_amount = float(item.get("ovrs_stck_evlu_amt", 0))
                        profit_loss = float(item.get("frcr_evlu_pfls_amt", 0))
                        profit_rate = float(item.get("evlu_pfls_rt", 0))
                        
                        holdings.append(StockHolding(
                            ticker=item.get("ovrs_pdno", ""),
                            name=item.get("ovrs_item_name", ""),
                            quantity=quantity,
                            avg_price=avg_price,
                            current_price=current_price,
                            profit_loss=profit_loss,
                            profit_rate=profit_rate,
                            eval_amount=eval_amount,
                            purchase_amount=purchase_amount
                        ))
                
                # 총계 계산
                total_invested = sum(h.purchase_amount for h in holdings)
                total_eval = sum(h.eval_amount for h in holdings)
                total_profit_loss = total_eval - total_invested
                profit_rate = (total_profit_loss / total_invested * 100) if total_invested > 0 else 0
                
                return PortfolioSummary(
                    total_invested=total_invested,
                    total_eval=total_eval,
                    total_profit_loss=total_profit_loss,
                    profit_rate=round(profit_rate, 2),
                    holdings=holdings
                )
                
        except Exception as e:
            print(f"해외주식 잔고 조회 오류: {e}")
            return self._get_demo_overseas_portfolio()
    
    def _get_demo_isa_portfolio(self) -> PortfolioSummary:
        """데모 ISA 포트폴리오"""
        demo_holdings = [
            StockHolding(
                ticker="069500",
                name="KODEX 200",
                quantity=100,
                avg_price=35000,
                current_price=38500,
                profit_loss=350000,
                profit_rate=10.0,
                eval_amount=3850000,
                purchase_amount=3500000
            ),
            StockHolding(
                ticker="132030",
                name="KODEX 골드선물(H)",
                quantity=50,
                avg_price=15000,
                current_price=16200,
                profit_loss=60000,
                profit_rate=8.0,
                eval_amount=810000,
                purchase_amount=750000
            ),
        ]
        
        total_invested = sum(h.purchase_amount for h in demo_holdings)
        total_eval = sum(h.eval_amount for h in demo_holdings)
        total_profit_loss = total_eval - total_invested
        profit_rate = (total_profit_loss / total_invested) * 100 if total_invested > 0 else 0
        
        return PortfolioSummary(
            total_invested=total_invested,
            total_eval=total_eval,
            total_profit_loss=total_profit_loss,
            profit_rate=round(profit_rate, 2),
            holdings=demo_holdings
        )
    
    async def get_isa_portfolio(self) -> PortfolioSummary:
        """ISA 계좌 잔고 조회"""
        if not self.is_configured or not settings.KIS_ISA_ACCOUNT_NUMBER:
            return self._get_demo_isa_portfolio()
        
        try:
            token = await self._get_isa_access_token()
            isa_app_key = settings.isa_app_key
            isa_app_secret = settings.isa_app_secret
            
            async with httpx.AsyncClient() as client:
                url = f"{self.base_url}/uapi/domestic-stock/v1/trading/inquire-balance"
                
                tr_id = "VTTC8434R" if self.is_virtual else "TTTC8434R"
                
                headers = {
                    "content-type": "application/json",
                    "authorization": f"Bearer {token}",
                    "appkey": isa_app_key,
                    "appsecret": isa_app_secret,
                    "tr_id": tr_id,
                }
                
                params = {
                    "CANO": settings.KIS_ISA_ACCOUNT_NUMBER,
                    "ACNT_PRDT_CD": settings.KIS_ISA_PRODUCT_CODE,
                    "AFHR_FLPR_YN": "N",
                    "OFL_YN": "",
                    "INQR_DVSN": "02",
                    "UNPR_DVSN": "01",
                    "FUND_STTL_ICLD_YN": "Y",  # ISA는 펀드 포함
                    "FNCG_AMT_AUTO_RDPT_YN": "N",
                    "PRCS_DVSN": "00",
                    "CTX_AREA_FK100": "",
                    "CTX_AREA_NK100": "",
                }
                
                response = await client.get(url, headers=headers, params=params)
                data = response.json()
                
                holdings = []
                for item in data.get("output1", []):
                    if int(item.get("hldg_qty", 0)) > 0:
                        quantity = int(item.get("hldg_qty", 0))
                        avg_price = float(item.get("pchs_avg_pric", 0))
                        current_price = float(item.get("prpr", 0))
                        purchase_amount = quantity * avg_price
                        eval_amount = float(item.get("evlu_amt", 0))
                        profit_loss = float(item.get("evlu_pfls_amt", 0))
                        profit_rate = float(item.get("evlu_pfls_rt", 0))
                        
                        holdings.append(StockHolding(
                            ticker=item.get("pdno", ""),
                            name=item.get("prdt_name", ""),
                            quantity=quantity,
                            avg_price=avg_price,
                            current_price=current_price,
                            profit_loss=profit_loss,
                            profit_rate=profit_rate,
                            eval_amount=eval_amount,
                            purchase_amount=purchase_amount
                        ))
                
                # 총계
                output2 = data.get("output2", [{}])[0] if data.get("output2") else {}
                total_invested = float(output2.get("pchs_amt_smtl_amt", 0))
                total_eval = float(output2.get("evlu_amt_smtl_amt", 0))
                total_profit_loss = float(output2.get("evlu_pfls_smtl_amt", 0))
                profit_rate = (total_profit_loss / total_invested * 100) if total_invested > 0 else 0
                
                # 일일 증감
                bfdy_tot = float(output2.get("bfdy_tot_asst_evlu_amt", 0))
                daily_change = float(output2.get("asst_icdc_amt", 0))
                daily_change_rate = float(output2.get("asst_icdc_erng_rt", 0))
                if daily_change == 0 and bfdy_tot > 0:
                    daily_change = total_eval - bfdy_tot
                    daily_change_rate = (daily_change / bfdy_tot * 100) if bfdy_tot > 0 else 0
                
                return PortfolioSummary(
                    total_invested=total_invested,
                    total_eval=total_eval,
                    total_profit_loss=total_profit_loss,
                    profit_rate=round(profit_rate, 2),
                    daily_change=round(daily_change, 0),
                    daily_change_rate=round(daily_change_rate, 2),
                    holdings=holdings
                )
                
        except Exception as e:
            print(f"ISA 잔고 조회 오류: {e}")
            return self._get_demo_isa_portfolio()


# 싱글톤 인스턴스
kis_client = KISClient()

