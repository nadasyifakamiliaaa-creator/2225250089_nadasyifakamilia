"""Titik masuk server RataKu.

Server ini menyajikan file PWA di folder `frontend/` dan menyediakan API di `/api/*`.
Jalankan dengan: uvicorn backend.app.main:app --reload
"""

import mimetypes

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.config import PROJECT_ROOT, Settings, settings
from backend.app.db import Database
from backend.app.routers import sync, teacher
from backend.app.security import RateLimiter

TEACHER_STATIC = PROJECT_ROOT / "backend" / "app" / "static"

# Windows kadang mendaftarkan .js sebagai text/plain; browser menolak ES module dengan tipe itu.
mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("application/manifest+json", ".webmanifest")

SECURITY_HEADERS = {
    "Content-Security-Policy": (
        "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; "
        "connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    ),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
}

# Berkas yang harus selalu dicek ulang ke server agar pembaruan aplikasi cepat terdeteksi.
NO_CACHE_PATHS = {"/", "/index.html", "/sw.js", "/manifest.webmanifest"}

# Halaman dokumentasi API bawaan FastAPI memuat skrip dari CDN, jadi CSP tidak diterapkan di sana.
DOCS_PATHS = ("/docs", "/redoc", "/openapi.json")


def create_app(config: Settings = settings) -> FastAPI:
    app = FastAPI(title=f"{config.app_name} API", version=config.version)

    if config.allowed_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=config.allowed_origins,
            allow_methods=["GET", "POST"],
            allow_headers=["Content-Type"],
        )

    @app.middleware("http")
    async def add_headers(request: Request, call_next) -> Response:
        response: Response = await call_next(request)
        path = request.url.path
        if not path.startswith(DOCS_PATHS):
            for name, value in SECURITY_HEADERS.items():
                response.headers.setdefault(name, value)
        if path in NO_CACHE_PATHS:
            response.headers["Cache-Control"] = "no-cache"
        return response

    @app.get("/api/health")
    def health() -> dict[str, str]:
        """Cek apakah server hidup."""
        return {"status": "ok", "app": config.app_name, "version": config.version}

    # Keadaan aplikasi: pengaturan, basis data (dibuat saat pertama dipakai), pembatas login.
    app.state.settings = config
    app.state.db = Database(config.database_path)
    app.state.login_limiter = RateLimiter(limit=5, window=60)

    app.include_router(sync.router)
    app.include_router(teacher.router)
    app.mount("/guru/static", StaticFiles(directory=TEACHER_STATIC), name="teacher-static")

    # Harus dipasang paling akhir: semua jalur yang bukan API dilayani sebagai file statis.
    app.mount("/", StaticFiles(directory=config.frontend_dir, html=True), name="frontend")

    return app


app = create_app()
