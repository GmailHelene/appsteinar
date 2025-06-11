from flask import Flask, render_template, request, jsonify, flash, redirect, url_for
import openai
import os
import hashlib
import json
import base64
from datetime import datetime, timedelta
from pathlib import Path
from werkzeug.utils import secure_filename
from PIL import Image
import io
from config import config

app = Flask(__name__)

# Konfigurasjon
config_name = os.environ.get('FLASK_ENV', 'development')
app.config.from_object(config[config_name])

# OpenAI setup
if app.config['OPENAI_API_KEY']:
    openai.api_key = app.config['OPENAI_API_KEY']

# Cache for resultater
results_cache = {}

def allowed_file(filename):
    """Sjekk om filtype er tillatt"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def compress_image(image_data, max_size=(800, 600), quality=85):
    """Komprimer bilde for bedre ytelse"""
    try:
        img = Image.open(io.BytesIO(image_data))
        
        # Konverter til RGB hvis nødvendig
        if img.mode in ('RGBA', 'LA', 'P'):
            img = img.convert('RGB')
        
        # Resize hvis for stort
        img.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        # Komprimer
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=quality, optimize=True)
        return output.getvalue()
    except Exception as e:
        print(f"Bildekomprimering feilet: {e}")
        return image_data

def hent_gpt_svar(prompt, image_data=None):
    """Hent svar fra GPT med eller uten bilde"""
    if not app.config['OPENAI_API_KEY']:
        return "Feil: Ingen OpenAI API-nøkkel konfigurert. Kontakt administrator."
    
    try:
        # Lag cache-nøkkel
        cache_key = hashlib.md5(prompt.encode()).hexdigest()
        if image_data:
            cache_key += hashlib.md5(image_data).hexdigest()[:8]
        
        # Sjekk cache
        if cache_key in results_cache:
            cached_result = results_cache[cache_key]
            if datetime.now() - cached_result['timestamp'] < timedelta(seconds=app.config['CACHE_TIMEOUT']):
                return cached_result['result']
        
        messages = [
            {"role": "system", "content": """Du er en ekspert geolog og mineralog som hjelper med steinidentifikasjon. 
            Gi alltid strukturerte, nøyaktige svar med:
            1. Mest sannsynlig steintype
            2. Geologisk klassifikasjon
            3. Karakteristiske egenskaper
            4. Hvor den typisk finnes
            5. Foreslåtte tester for verifisering
            6. Interessante fakta
            
            Vær ærlig hvis du er usikker og foreslå alternative muligheter."""}
        ]
        
        # Hvis bilde er inkludert
        if image_data:
            # Komprimer bilde
            compressed_image = compress_image(image_data)
            base64_image = base64.b64encode(compressed_image).decode('utf-8')
            
            messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}",
                            "detail": "high"
                        }
                    }
                ]
            })
        else:
            messages.append({"role": "user", "content": prompt})
        
        response = openai.ChatCompletion.create(
            model="gpt-4-vision-preview" if image_data else "gpt-3.5-turbo",
            messages=messages,
            max_tokens=1500,
            temperature=0.7
        )
        
        result = response.choices[0].message.content
        
        # Cache resultatet
        results_cache[cache_key] = {
            'result': result,
            'timestamp': datetime.now()
        }
        
        return result
        
    except Exception as e:
        return f"Feil ved henting av AI-svar: {str(e)}"

# Routes
@app.route('/')
def index():
    """Hovedside"""
    return render_template('index.html')

@app.route('/identifikator')
def identifikator():
    """Identifikasjonside"""
    return render_template('identifikator.html')

@app.route('/kategorier')
def kategorier():
    """Kategorier side"""
    return render_template('kategorier.html')

@app.route('/offline')
def offline():
    """Offline side"""
    return render_template('offline.html')

@app.route('/api/identifiser', methods=['POST'])
def identifiser_stein():
    """Identifiser stein basert på input"""
    try:
        # Håndter både JSON og FormData
        if request.is_json:
            data = request.get_json()
            image_data = None
        else:
            data = request.form.to_dict()
            image_data = None
            
            # Håndter bildefil
            if 'bilde' in request.files:
                file = request.files['bilde']
                if file and file.filename != '' and allowed_file(file.filename):
                    image_data = file.read()
        
        # Hent data
        farge = data.get('farge', '').strip()
        storrelse = data.get('storrelse', '').strip()
        vekt = data.get('vekt', '').strip()
        hardhet = data.get('hardhet', '').strip()
        transparens = data.get('transparens', '').strip()
        glans = data.get('glans', '').strip()
        detaljer = data.get('detaljer', '').strip()
        funnet_sted = data.get('funnet_sted', '').strip()
        
        # Valider input
        if not any([farge, storrelse, vekt, detaljer, image_data]):
            return jsonify({
                'success': False,
                'error': 'Vennligst oppgi minst én egenskap eller last opp et bilde.'
            }), 400
        
        # Bygg prompt
        prompt_parts = ["Jeg har funnet en stein med følgende egenskaper:\n"]
        
        if image_data:
            prompt_parts.append("BILDE: Se vedlagt bilde for visuell analyse.")
        
        if farge:
            prompt_parts.append(f"FARGE: {farge}")
        if storrelse:
            prompt_parts.append(f"STØRRELSE: {storrelse}")
        if vekt:
            prompt_parts.append(f"VEKT: {vekt}")
        if hardhet:
            prompt_parts.append(f"HARDHET: {hardhet}")
        if transparens:
            prompt_parts.append(f"TRANSPARENS: {transparens}")
        if glans:
            prompt_parts.append(f"GLANS: {glans}")
        if funnet_sted:
            prompt_parts.append(f"FUNNET VED: {funnet_sted}")
        if detaljer:
            prompt_parts.append(f"ANDRE DETALJER: {detaljer}")
        
        prompt_parts.append("\nVennligst analyser denne steinen grundig og gi en detaljert vurdering.")
        
        prompt = "\n".join(prompt_parts)
        
        # Begrens prompt-lengde
        if len(prompt) > app.config['MAX_PROMPT_LENGTH']:
            prompt = prompt[:app.config['MAX_PROMPT_LENGTH']] + "..."
        
        # Få AI-svar
        resultat = hent_gpt_svar(prompt, image_data)
        
        return jsonify({
            'success': True,
            'resultat': resultat,
            'analysert_dato': datetime.now().isoformat(),
            'har_bilde': image_data is not None
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Feil under identifikasjon: {str(e)}'
        }), 500

@app.route('/api/kategori', methods=['POST'])
def hent_kategori_info():
    """Hent informasjon om steinkategori"""
    try:
        data = request.get_json()
        kategori = data.get('kategori', '').strip()
        
        if not kategori:
            return jsonify({
                'success': False,
                'error': 'Ingen kategori spesifisert.'
            }), 400
        
        # Definer prompts for hver kategori
        kategori_prompts = {
            "magmatiske": (
                "Gi en detaljert oversikt over magmatiske bergarter. "
                "Forklar hvordan de dannes, de to hovedtypene (plutoniske og vulkanske), "
                "og gi eksempler som granitt, basalt, obsidian og pumice. "
                "Inkluder informasjon om mineraler, tekstur og bruksområder."
            ),
            "sedimentære": (
                "Gi en detaljert oversikt over sedimentære bergarter. "
                "Forklar dannelsesprosessen, de tre hovedtypene (klastiske, kjemiske, organiske), "
                "og gi eksempler som sandstein, kalkstein, skifer og konglomerat. "
                "Inkluder informasjon om lagdeling og fossiler."
            ),
            "metamorfe": (
                "Gi en detaljert oversikt over metamorfe bergarter. "
                "Forklar metamorfose-prosessen, kontakt- vs regional metamorfose, "
                "og gi eksempler som marmor, gneis, skifer og kvartssitt. "
                "Inkluder informasjon om foliasjon og mineralendringer."
            ),
            "meteoritter": (
                "Gi en detaljert oversikt over meteoritter. "
                "Forklar de tre hovedtypene (stein-, jern- og stein-jern meteoritter), "
                "hvordan de identifiseres, og deres vitenskapelige betydning. "
                "Inkluder informasjon om kjente meteorittfall og samleobjekter."
            ),
            "edelstener": (
                "Gi en detaljert oversikt over edelstener. "
                "Forklar forskjellen på edelstener og halvedelstener, "
                "viktige egenskaper som hardhet og klarhet, "
                "og gi eksempler som diamant, rubin, safir og smaragd. "
                "Inkluder informasjon om syntetiske vs naturlige steiner."
            ),
            "mineraler": (
                "Gi en detaljert oversikt over mineraler. "
                "Forklar krystallsystemer, mineralegenskaper som hardhet og spalting, "
                "og gi eksempler som kvarts, feltspat, glimmer og kalsitt. "
                "Inkluder informasjon om mineral-identifikasjon og samleobjekter."
            )
        }
        
        # Finn matching prompt
        prompt = None
        for key, value in kategori_prompts.items():
            if key.lower() in kategori.lower():
                prompt = value
                break
        
        if not prompt:
            # Generisk prompt for ukjente kategorier
            prompt = f"Gi en oversikt over steiner/bergarter i kategorien '{kategori}'. Forklar egenskaper, dannelse og eksempler."
        
        resultat = hent_gpt_svar(prompt)
        
        return jsonify({
            'success': True,
            'resultat': resultat,
            'kategori': kategori,
            'hentet_dato': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Feil ved henting av kategori-info: {str(e)}'
        }), 500

@app.route('/api/forslag', methods=['GET'])
def hent_identifikasjon_tips():
    """Hent tips for steinidentifikasjon"""
    tips = [
        "Ta et tydelig bilde i god belysning",
        "Mål steinens dimensjoner nøyaktig", 
        "Test hardhet med en mynt (hardhet ~3) eller glass (hardhet ~5.5)",
        "Noter om steinen er magnetisk",
        "Beskriv glansen (metallisk, glassaktig, matt)",
        "Sjekk om steinen er gjennomsiktig, gjennomskinelig eller ugjennomsiktig",
        "Noter hvor steinen ble funnet (strand, fjell, elv, etc.)",
        "Observer eventuelle krystallformer eller lag",
        "Test om steinen reagerer med eddiksyre (bobler = kalkstein)",
        "Noter om steinen har særlig tyngde (tung = kanskje metallholdig)"
    ]
    
    return jsonify({
        'success': True,
        'tips': tips
    })

@app.route('/health')
def health_check():
    """Health check for produksjon"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0',
        'openai_configured': bool(app.config['OPENAI_API_KEY'])
    })

# Error handlers
@app.errorhandler(404)
def not_found_error(error):
    return render_template('errors/404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    return render_template('errors/500.html'), 500

@app.errorhandler(413)
def too_large(error):
    return jsonify({
        'success': False,
        'error': 'Filen er for stor. Maksimal størrelse er 16MB.'
    }), 413

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)