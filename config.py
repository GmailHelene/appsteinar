import os
from pathlib import Path
from dotenv import load_dotenv

# Last miljøvariabler
load_dotenv()

class Config:
    # Sikkerhet
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'change-this-in-production-stein-app'
    
    # Upload konfigurasjon
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB
    UPLOAD_FOLDER = Path('uploads')
    UPLOAD_FOLDER.mkdir(exist_ok=True)
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    
    # OpenAI
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
    if not OPENAI_API_KEY:
        print("ADVARSEL: Ingen OpenAI API-nøkkel funnet!")
    
    # App-innstillinger
    MAX_PROMPT_LENGTH = 2000
    CACHE_TIMEOUT = 3600  # 1 time

class DevelopmentConfig(Config):
    DEBUG = True
    
class ProductionConfig(Config):
    DEBUG = False

# Velg konfigurasjon
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}