from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """한국투자증권 API 설정"""
    
    # API 인증 정보 (국내/해외 공통)
    KIS_APP_KEY: str = ""
    KIS_APP_SECRET: str = ""
    
    # 국내주식 계좌 정보
    KIS_ACCOUNT_NUMBER: str = ""
    KIS_ACCOUNT_PRODUCT_CODE: str = "01"
    
    # 해외주식 계좌 정보 (국내와 동일할 수 있음)
    KIS_OVERSEAS_ACCOUNT_NUMBER: str = ""
    KIS_OVERSEAS_PRODUCT_CODE: str = "01"
    
    # ISA 계좌 정보
    KIS_ISA_ACCOUNT_NUMBER: str = ""
    KIS_ISA_PRODUCT_CODE: str = "01"
    
    # ISA 전용 API 키 (별도 발급받은 경우)
    KIS_ISA_APP_KEY: str = ""
    KIS_ISA_APP_SECRET: str = ""
    
    # 모의투자 여부
    KIS_IS_VIRTUAL: bool = True
    
    # API Base URL
    @property
    def KIS_BASE_URL(self) -> str:
        if self.KIS_IS_VIRTUAL:
            return "https://openapivts.koreainvestment.com:29443"
        return "https://openapi.koreainvestment.com:9443"
    
    # 해외주식 계좌번호 (미설정시 국내계좌 사용)
    @property
    def overseas_account(self) -> str:
        return self.KIS_OVERSEAS_ACCOUNT_NUMBER or self.KIS_ACCOUNT_NUMBER
    
    @property
    def overseas_product_code(self) -> str:
        return self.KIS_OVERSEAS_PRODUCT_CODE or self.KIS_ACCOUNT_PRODUCT_CODE
    
    # ISA 전용 API 키 (미설정시 공통 키 사용)
    @property
    def isa_app_key(self) -> str:
        return self.KIS_ISA_APP_KEY or self.KIS_APP_KEY
    
    @property
    def isa_app_secret(self) -> str:
        return self.KIS_ISA_APP_SECRET or self.KIS_APP_SECRET
    
    @property
    def has_separate_isa_key(self) -> bool:
        return bool(self.KIS_ISA_APP_KEY and self.KIS_ISA_APP_SECRET)
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
