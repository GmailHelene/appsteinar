# 🗿 SteinID Pro - AI-drevet steinidentifikasjon

En moderne Progressive Web App (PWA) for identifikasjon av steiner, bergarter og mineraler ved hjelp av kunstig intelligens.

## 🌟 Funksjoner

- 📱 **PWA** - Installer som app på mobil/desktop
- 🤖 **AI-analyse** - GPT-4 Vision for bildeanalyse
- 📸 **Bildegjenkjenning** - Last opp eller ta bilder
- 🔄 **Offline-støtte** - Fungerer uten internett
- 📚 **Lærerike kategorier** - Utforsk steintyper
- 💾 **Lokal lagring** - Analyser lagres på enheten
- 🎯 **Eksperttips** - Veiledning for identifikasjon

## 🚀 Live Demo

[https://steinid-pro.railway.app](https://steinid-pro.railway.app)

## 💻 Lokal utvikling

```bash
# Klon repository
git clone <repo-url>
cd stein_identifikator_pwa

# Opprett virtuelt miljø
python -m venv venv
source venv/bin/activate  # På Windows: venv\Scripts\activate

# Installer avhengigheter
pip install -r requirements.txt

# Kopier miljøvariabler
cp .env.example .env

# Rediger .env med din OpenAI API-nøkkel
# OPENAI_API_KEY=sk-your-key-here

# Kjør app
python app.py