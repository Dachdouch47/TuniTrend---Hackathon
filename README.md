# TuniTrend

**Promotion intelligente par Newsjacking – propulsé par l’IA**

TuniTrend est une application web qui aide les marketeurs et entrepreneurs tunisiens à créer des stratégies de communication percutantes en s’appuyant sur l’actualité du moment (Newsjacking). L’intelligence artificielle (Groq) génère des mots-clés, des stratégies, des suggestions d’influenceurs et des idées de produits/services adaptées au marché tunisien.

<<<<<<< HEAD
![TuniTrend Screenshot](/tunitrend.png) 
=======
![TuniTrend Screenshot](/tunitrend.png)
>>>>>>> 85261b1 (2)

---


## Fonctionnalités

- **Tableau de bord dynamique** : nuage de mots-clés tendance, hashtags populaires, plateformes sociales
- **Actualités** : collecte des derniers articles de Mosaïque FM (flux RSS) avec vérification de la source
- **Promotion** : formulaire détaillé (domaine, thème, public, budget, format, objectif) → stratégie IA + influenceurs
- **Influenceurs** : recommandation de 5 influenceurs tunisiens pertinents (format cartes)
- **Suggestions produits** : analyse des tendances pour proposer 5 produits/services à fort potentiel
- **Chat IA** : discussion contextuelle pour affiner la stratégie
- **Interface moderne** : design vert/or, glassmorphism, mode sombre automatique, animations fluides

---

## Technologies

- **Backend** : Python 3.10+, FastAPI, Uvicorn
- **Frontend** : HTML5, CSS3, Vanilla JavaScript (pas de framework)
- **IA** : Groq Cloud (`llama-3.3-70b-versatile`)
- **Données** : Flux RSS Mosaïque FM, DuckDuckGo Search (tendances)
- **Graphiques** : Chart.js (optionnel)

---

## Installation

### Prérequis
- Python 3.10 ou plus récent
- Clé API Groq (gratuite – https://console.groq.com)

### Étapes

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/votre-utilisateur/tunitrend.git
   cd tunitrend
<<<<<<< HEAD
=======
   ```

2. **Créer un environnement virtuel**
   ```bash
   python -m venv venv
   source venv/bin/activate
   venv\Scripts\activate
   ```

3. **Installer les dépendances**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configurer la clé API**
   - Copiez le fichier `.env.example` en `.env`
   - Ajoutez votre clé :
   GROQ_API_KEY=gsk_votre_clé

5. **Lancer le serveur**
   ```bash
   python main.py
   ```

---

## Utilisation

- Accueil – aperçu des tendances
- Actualités – vérification des sources
- Promotion – génération de stratégie IA
- Suggestions – idées de produits

---

## Structure du projet

tunitrend/
├── main.py
├── index.html
├── script.js
├── requirements.txt
├── .env.example
└── README.md

---

## Licence

MIT
>>>>>>> 85261b1 (2)
