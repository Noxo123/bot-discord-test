# Bot Discord + OpenRouter

Bot Discord Node.js connecté à l'API OpenRouter.

## Fonctionnalités

- `/ai prompt:<question>` : pose une question à l'IA
- `/reset` : efface l'historique de conversation de l'utilisateur dans le salon
- `/model` : affiche le modèle OpenRouter configuré
- Historique court conservé en mémoire
- Découpage automatique des réponses trop longues pour Discord
- Gestion des erreurs OpenRouter
- Aucun token stocké dans GitHub

## 1. Prérequis

- Node.js 20 ou plus récent
- Un bot créé dans le Discord Developer Portal
- Une clé API OpenRouter

## 2. Installation

```bash
git clone https://github.com/Noxo123/bot-discord-test.git
cd bot-discord-test
npm install
```

Copie ensuite `.env.example` vers `.env` :

### Windows CMD

```cmd
copy .env.example .env
```

### PowerShell

```powershell
Copy-Item .env.example .env
```

Puis ouvre `.env` et ajoute tes vraies clés :

```env
DISCORD_TOKEN=ton_vrai_token_discord
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxx
OPENROUTER_MODEL=openrouter/auto
```

Ne publie jamais le fichier `.env` et ne colle jamais tes tokens dans le code source.

## 3. Inviter le bot Discord

Dans le Discord Developer Portal :

1. Ouvre ton application.
2. Va dans **OAuth2 > URL Generator**.
3. Coche `bot` et `applications.commands`.
4. Donne au minimum les permissions permettant au bot de voir le salon et d'envoyer des messages.
5. Ouvre l'URL générée et ajoute le bot à ton serveur.

Le bot utilise des slash commands et n'a donc pas besoin de l'intent privilégié **Message Content**.

## 4. Démarrage

```bash
npm start
```

Au démarrage tu dois voir :

```text
✅ Connecté en tant que ...
✅ Commandes /ai, /reset et /model enregistrées.
```

Les commandes globales Discord peuvent parfois mettre un peu de temps à apparaître après leur premier enregistrement.

## 5. Choisir un autre modèle OpenRouter

Change simplement cette ligne dans `.env` :

```env
OPENROUTER_MODEL=openrouter/auto
```

Exemple avec un slug de modèle disponible sur OpenRouter :

```env
OPENROUTER_MODEL=openai/gpt-5.3-chat
```

Le modèle `openrouter/auto` laisse OpenRouter choisir automatiquement un modèle adapté à la requête.

## Structure

```text
bot-discord-test/
├─ src/
│  └─ index.js
├─ .env.example
├─ .gitignore
├─ package.json
└─ README.md
```

## Sécurité

Si un token Discord ou une clé OpenRouter a déjà été publié sur GitHub, considère-le comme compromis et régénère-le immédiatement depuis le service concerné.
