"""
3sg AI Assistant - Backend FastAPI
MVP pour l'application de promotion de produits avec NewJacking
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse
from pydantic import BaseModel
from typing import Optional, List
import os
from datetime import datetime
import json
from pathlib import Path
import feedparser
from groq import Groq
from duckduckgo_search import DDGS
import requests
from bs4 import BeautifulSoup
import re

app = FastAPI(title="3sg AI Assistant API", version="1.0.0")

# CORS
origins = [
    "http://localhost",
    "http://localhost:8000",
    "http://localhost:3000",
    "http://127.0.0.1",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:3000",
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# Modèles
class PromoteProductRequest(BaseModel):
    domain: str
    theme: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    domain: str
    theme: str
    product_context: str
    messages: List[ChatMessage]

chat_context = {}

# ------- RSS Mosaïque FM -------
def get_mosaique_news_from_rss():
    rss_url = "https://www.mosaiquefm.net/fr/rss"
    feed = feedparser.parse(rss_url)
    articles = []
    for entry in feed.entries[:20]:
        title = entry.title.strip() if hasattr(entry, 'title') else 'Sans titre'
        link = entry.link if hasattr(entry, 'link') else '#'
        snippet = ''
        if hasattr(entry, 'summary'):
            snippet = BeautifulSoup(entry.summary, 'html.parser').get_text().strip()[:200]
        articles.append({'title': title, 'link': link, 'snippet': snippet})
    if not articles:
        raise Exception("Flux RSS vide ou inaccessible.")
    return articles

# ------- Routes statiques -------
@app.get("/", response_class=HTMLResponse)
async def root():
    html_path = Path(__file__).parent / "index.html"
    if html_path.exists():
        return html_path.read_text(encoding='utf-8')
    return {"message": "index.html non trouvé"}

@app.get("/script.js")
async def get_script():
    js_path = Path(__file__).parent / "script.js"
    if js_path.exists():
        return FileResponse(js_path, media_type="application/javascript")
    raise HTTPException(status_code=404, detail="script.js non trouvé")

@app.get("/favicon.ico")
async def get_favicon():
    favicon_path = Path(__file__).parent / "favicon.ico"
    if favicon_path.exists():
        return FileResponse(favicon_path)
    raise HTTPException(status_code=404, detail="Favicon non trouvé")

@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "groq": "configured" if os.environ.get("GROQ_API_KEY") else "missing_api_key",
            "duckduckgo": "available"
        }
    }

# ------- Utilitaires -------
def get_tunisia_trending():
    try:
        ddgs = DDGS()
        results = ddgs.news(keywords="Tunisia", timelimit="d", max_results=10)
        return results
    except Exception as e:
        print(f"Erreur tendances: {e}")
        return []

def get_keywords_with_ai(domain: str, theme: str) -> str:
    try:
        message = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": f"Générer une liste de 10 mots-clés pertinents pour un produit dans le domaine '{domain}' avec le thème '{theme}'. Réponds UNIQUEMENT avec les mots-clés séparés par des virgules."}],
            temperature=0.7, max_tokens=200,
        )
        return message.choices[0].message.content.strip()
    except Exception as e:
        print(f"Erreur mots-clés: {e}")
        return "Erreur lors de la génération des mots-clés"

def generate_newsjacking_strategy(domain: str, theme: str) -> str:
    try:
        prompt = f"""Tu es un expert en marketing digital.
Propose une stratégie de Newsjacking en 3-4 paragraphes pour un produit du domaine '{domain}' avec le thème '{theme}'.
Explique l'angle, les messages clés et les actions sur les réseaux sociaux. Sois précis."""
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8, max_tokens=1000,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Erreur stratégie: {e}")
        return "Erreur lors de la génération de la stratégie."
def get_influencers_suggestions(domain: str, theme: str) -> list:
    prompt = f"""Tu es un expert en marketing d'influence en Tunisie.
Pour un produit dans le domaine '{domain}' avec le thème '{theme}', propose exactement 5 influenceurs tunisiens.
Réponds UNIQUEMENT avec un tableau JSON (sans texte avant ni après) contenant 5 objets avec les clés suivantes :
- "nom" (string)
- "plateforme" (string) : Instagram, TikTok, YouTube, Facebook, etc.
- "abonnes" (string) : estimation du nombre d'abonnés (ex: "230K")
- "type_contenu" (string) : type de contenu produit
- "pertinence" (string) : pourquoi il/elle est pertinent(e) pour ce produit

Exemple de format attendu :
[
  {{"nom": "Maya Khelil", "plateforme": "Instagram", "abonnes": "230K", "type_contenu": "Recettes et nutrition", "pertinence": "Publie du contenu food pendant les événements sportifs"}},
  ...
]"""
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=800,
        )
        raw = response.choices[0].message.content.strip()
        # Nettoyer d'éventuels délimiteurs markdown
        if raw.startswith("```json"):
            raw = raw[7:]
        if raw.endswith("```"):
            raw = raw[:-3]
        influencers = json.loads(raw.strip())
        return influencers
    except Exception as e:
        print(f"Erreur génération influenceurs: {e}")
        return []
    
def get_trending_keywords_with_ai() -> list:
    """Demande à Groq une liste de 12 mots-clés tendance en Tunisie, avec un indice de poids (1-10)."""
    try:
        prompt = """Tu es un expert en tendances tunisiennes.
Donne-moi une liste de 12 mots-clés actuellement très recherchés ou discutés en Tunisie. Pour chaque mot, attribue un poids de 1 à 10 représentant son importance/popularité.
Réponds UNIQUEMENT avec un tableau JSON (sans texte avant ni après) contenant 12 objets avec les clés :
- "word" (string)
- "weight" (int entre 1 et 10)

Exemple : [{"word": "Ramadan", "weight": 9}, ...]"""
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=500,
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```json"):
            raw = raw[7:]
        if raw.endswith("```"):
            raw = raw[:-3]
        data = json.loads(raw.strip())
        return data
    except Exception as e:
        print(f"Erreur mots-clés tendance: {e}")
        return [{"word": "Tunisie", "weight": 10}, {"word": "Innovation", "weight": 8}, ...]  # fallback

@app.get("/api/trending-keywords")
async def get_trending_keywords():
    try:
        keywords = get_trending_keywords_with_ai()
        return {"keywords": keywords, "timestamp": datetime.now().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
def get_trending_keywords_with_ai() -> list:
    try:
        prompt = """Tu es un expert en tendances tunisiennes.
Donne-moi une liste de 12 mots-clés actuellement très recherchés ou discutés en Tunisie. Pour chaque mot, attribue un poids de 1 à 10 représentant son importance/popularité.
Réponds UNIQUEMENT avec un tableau JSON (sans texte avant ni après) contenant 12 objets avec les clés :
- "word" (string)
- "weight" (int entre 1 et 10)

Exemple : [{"word": "Ramadan", "weight": 9}, ...]"""
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=500,
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```json"): raw = raw[7:]
        if raw.endswith("```"): raw = raw[:-3]
        return json.loads(raw.strip())
    except Exception as e:
        print(f"Erreur mots-clés tendance: {e}")
        return []

@app.get("/api/trending-keywords")
async def get_trending_keywords():
    try:
        keywords = get_trending_keywords_with_ai()
        return {"keywords": keywords, "timestamp": datetime.now().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_trending_hashtags_with_ai() -> list:
    """Demande à Groq une liste de hashtags populaires en Tunisie."""
    try:
        prompt = """Tu es un expert en tendances tunisiennes.
Donne-moi une liste de 12 hashtags actuellement populaires en Tunisie.
Réponds UNIQUEMENT avec un tableau JSON (sans texte avant ni après) contenant 12 chaînes de caractères.
Exemple : ["#Tunisia", "#Ramadan", "#Football", ...]"""
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=300,
        )
        raw = response.choices[0].message.content.strip()
        if raw.startswith("```json"): raw = raw[7:]
        if raw.endswith("```"): raw = raw[:-3]
        return json.loads(raw.strip())
    except Exception as e:
        print(f"Erreur hashtags: {e}")
        return []

@app.get("/api/trending-hashtags")
async def get_trending_hashtags():
    try:
        hashtags = get_trending_hashtags_with_ai()
        return {"hashtags": hashtags, "timestamp": datetime.now().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
def generate_product_suggestions() -> str:
    try:
        trending = get_tunisia_trending()
        trending_text = "\n".join([f"- {a.get('title', 'N/A')}" for a in trending[:10]])
        prompt = f"""Voici les tendances en Tunisie :\n{trending_text}\n\nPropose 5 produits/services qui pourraient bien se vendre aujourd'hui. Pour chacun : nom, pourquoi, public cible, potentiel."""
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7, max_tokens=1500,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Erreur suggestions: {e}")
        return "Erreur lors de la génération des suggestions"

def get_tunisia_news_summary() -> str:
    try:
        news = get_tunisia_trending()
        news_text = "\n".join([f"- {a.get('title', 'N/A')}" for a in news[:10]])
        prompt = f"Résume en 3-4 paragraphes les principales actualités en Tunisie :\n{news_text}"
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7, max_tokens=500,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"Erreur résumé: {e}")
        return "Erreur lors de la génération du résumé"

# ------- Endpoints -------
@app.get("/api/news/mosaique")
async def get_mosaique_news():
    try:
        articles = get_mosaique_news_from_rss()
        return {"articles": articles, "count": len(articles), "timestamp": datetime.now().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur RSS : {str(e)}")

@app.get("/api/influencers")
async def get_influencers(domain: str, theme: str):
    if not domain or not theme:
        raise HTTPException(status_code=400, detail="Domain et theme requis")
    suggestions = get_influencers_suggestions(domain, theme)
    return {"influencers": suggestions, "timestamp": datetime.now().isoformat()}

@app.post("/api/promote")
async def promote_product(request: PromoteProductRequest):
    try:
        domain = request.domain.strip()
        theme = request.theme.strip()
        if not domain or not theme:
            raise HTTPException(status_code=400, detail="Domain et theme requis")
        keywords = get_keywords_with_ai(domain, theme)
        strategy = generate_newsjacking_strategy(domain, theme)
        context_id = f"{domain}_{theme}_{datetime.now().timestamp()}"
        chat_context[context_id] = {
            "domain": domain, "theme": theme,
            "keywords": keywords, "strategy": strategy, "messages": []
        }
        return {
            "context_id": context_id, "domain": domain, "theme": theme,
            "keywords": keywords, "strategy": strategy,
            "timestamp": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        system_prompt = f"""Tu es un expert en marketing et Newsjacking.
Domaine: {request.domain}, Thème: {request.theme}.
Contexte stratégie: {request.product_context}
Aide l'utilisateur à affiner son approche."""
        groq_messages = [{"role": "system", "content": system_prompt}]
        for msg in request.messages:
            groq_messages.append({"role": msg.role, "content": msg.content})
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=groq_messages,
            temperature=0.7, max_tokens=800,
        )
        return {
            "response": response.choices[0].message.content.strip(),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/news/tunisia")
async def get_tunisia_news():
    try:
        news = get_tunisia_trending()
        return {"news": news[:15], "summary": get_tunisia_news_summary(), "timestamp": datetime.now().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/products/suggested")
async def get_suggested_products():
    try:
        suggestions = generate_product_suggestions()
        return {"suggestions": suggestions, "timestamp": datetime.now().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/keywords")
async def get_keywords(domain: str, theme: str):
    if not domain or not theme:
        raise HTTPException(status_code=400, detail="Domain et theme requis")
    keywords = get_keywords_with_ai(domain, theme)
    return {"keywords": keywords, "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)