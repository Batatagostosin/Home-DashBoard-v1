import psutil
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

BASE_DIR = Path(__file__).resolve().parent
app = FastAPI()

@app.get("/")
def serve_dashboard():
    return FileResponse(BASE_DIR / "index.html")

@app.get("/api/stats")
def get_stats():
    return {
        "cpu": psutil.cpu_percent(interval=0.2),
        "ram": psutil.virtual_memory().percent
    }

app.mount("/", StaticFiles(directory=BASE_DIR), name="static")