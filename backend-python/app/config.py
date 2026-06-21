from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

# Path assoluto al .env, indipendente dalla working directory
_ENV_PATH = Path(__file__).parent.parent / ".env"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_PATH),
        env_file_encoding="utf-8"
    )

    database_url: str
    secret_key: str = "coiled-spring-dev-secret-change-in-prod"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7
    anthropic_api_key: str = ""
    encryption_key: str = ""
    cors_origins: str = ""
    stripe_publishable_key: str = ""
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    resend_api_key: str = ""
    frontend_url: str = "http://localhost:3000"
    admin_key: str = ""
    admin_email: str = "sgarbo.fra@gmail.com"
    admin_secret: str = ""
    debug: bool = True

settings = Settings()

if settings.stripe_secret_key:
    print(f"[CONFIG] Stripe secret key loaded: {settings.stripe_secret_key[:15]}...")
else:
    print("[CONFIG] WARNING: STRIPE_SECRET_KEY not found in environment!")

if settings.anthropic_api_key:
    print(f"[CONFIG] Anthropic API key loaded: {settings.anthropic_api_key[:10]}...")
else:
    print("[CONFIG] WARNING: ANTHROPIC_API_KEY not found!")
