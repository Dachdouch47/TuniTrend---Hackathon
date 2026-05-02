# TuniTrend

**Promotion intelligente par Newsjacking – propulsé par l’IA**

TuniTrend est une application web qui aide les marketeurs et entrepreneurs tunisiens à créer des stratégies de communication percutantes en s’appuyant sur l’actualité du moment (Newsjacking). L’intelligence artificielle (Groq) génère des mots-clés, des stratégies, des suggestions d’influenceurs et des idées de produits/services adaptées au marché tunisien.

![TuniTrend Screenshot](/tunitrend.png) *(optionnel)*

---

##  Fonctionnalités

- **Tableau de bord dynamique** : nuage de mots-clés tendance, hashtags populaires, plateformes sociales
- **Actualités** : collecte des derniers articles de Mosaïque FM (flux RSS) avec vérification de la source
- **Promotion** : formulaire détaillé (domaine, thème, public, budget, format, objectif) → stratégie IA + influenceurs
- **Influenceurs** : recommandation de 5 influenceurs tunisiens pertinents (format cartes)
- **Suggestions produits** : analyse des tendances pour proposer 5 produits/services à fort potentiel
- **Chat IA** : discussion contextuelle pour affiner la stratégie
- **Interface moderne** : design vert/or, glassmorphism, mode sombre automatique, animations fluides

---

##  Technologies

- **Backend** : Python 3.10+, FastAPI, Uvicorn
- **Frontend** : HTML5, CSS3, Vanilla JavaScript (pas de framework)
- **IA** : Groq Cloud (`llama-3.3-70b-versatile`)
- **Données** : Flux RSS Mosaïque FM, DuckDuckGo Search (tendances)
- **Graphiques** : Chart.js (optionnel)

---

##  Installation

### Prérequis
- Python 3.10 ou plus récent
- Clé API Groq (gratuite – [console.groq.com](https://console.groq.com))

### Étapes

1. **Cloner le dépôt**
   ```bash
   git clone https://github.com/votre-utilisateur/tunitrend.git
   cd tunitrend