from app.core.config import Settings

def test_cors_origins_comma_separated_parsing():
    settings = Settings(
        ALLOWED_ORIGINS="https://app.vercel.app, http://localhost:5173, https://hirestream.io"
    )
    assert settings.ALLOWED_ORIGINS == [
        "https://app.vercel.app",
        "http://localhost:5173",
        "https://hirestream.io"
    ]

def test_cors_origins_json_list_parsing():
    settings = Settings(
        ALLOWED_ORIGINS='["https://app.vercel.app", "http://localhost:5173"]'
    )
    assert settings.ALLOWED_ORIGINS == [
        "https://app.vercel.app",
        "http://localhost:5173"
    ]

def test_database_url_normalization():
    settings = Settings(
        DATABASE_URL="postgres://user:password@render-db-host.com:5432/hiring_platform"
    )
    assert settings.DATABASE_URL.startswith("postgresql://")
    assert "postgres://" not in settings.DATABASE_URL
