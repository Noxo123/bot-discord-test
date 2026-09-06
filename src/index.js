import 'dotenv/config';
import {
  Client,
  Events,
  GatewayIntentBits,
  SlashCommandBuilder,
} from 'discord.js';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openrouter/auto';
const SYSTEM_PROMPT =
  process.env.SYSTEM_PROMPT ||
  'Tu es un assistant Discord utile, concis et amical. Réponds en français sauf si on te demande une autre langue.';

if (!DISCORD_TOKEN) {
  throw new Error('DISCORD_TOKEN est manquant dans le fichier .env');
}

if (!OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY est manquant dans le fichier .env');
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// Historique léger en mémoire, séparé par serveur/salon/utilisateur.
// Il est perdu au redémarrage du bot, ce qui évite aussi de stocker des conversations sur disque.
const conversations = new Map();
const MAX_HISTORY_MESSAGES = 12;

const commands = [
  new SlashCommandBuilder()
    .setName('ai')
    .setDescription('Pose une question à l’IA via OpenRouter')
    .addStringOption((option) =>
      option
        .setName('prompt')
        .setDescription('Ta question')
        .setRequired(true)
        .setMaxLength(4000),
    ),
  new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Efface ton historique de conversation avec le bot'),
  new SlashCommandBuilder()
    .setName('model')
    .setDescription('Affiche le modèle OpenRouter configuré'),
].map((command) => command.toJSON());

function conversationKey(interaction) {
  return `${interaction.guildId ?? 'dm'}:${interaction.channelId}:${interaction.user.id}`;
}

function splitDiscordMessage(text, maxLength = 1900) {
  const chunks = [];
  let remaining = text.trim();

  while (remaining.length > maxLength) {
    let cut = remaining.lastIndexOf('\n', maxLength);
    if (cut < maxLength * 0.5) cut = remaining.lastIndexOf(' ', maxLength);
    if (cut < maxLength * 0.5) cut = maxLength;

    chunks.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }

  if (remaining) chunks.push(remaining);
  return chunks.length ? chunks : ['Aucune réponse reçue.'];
}

async function askOpenRouter(messages) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'Noxo Discord Bot',
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      temperature: 0.7,
      max_tokens: 1200,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const apiMessage = data?.error?.message || data?.message || `HTTP ${response.status}`;
    throw new Error(`OpenRouter: ${apiMessage}`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('OpenRouter n’a renvoyé aucun texte exploitable.');
  }

  return {
    content,
    model: data.model || OPENROUTER_MODEL,
  };
}

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`✅ Connecté en tant que ${readyClient.user.tag}`);

  try {
    // Enregistre les slash commands globalement.
    await readyClient.application.commands.set(commands);
    console.log('✅ Commandes /ai, /reset et /model enregistrées.');
  } catch (error) {
    console.error('❌ Impossible d’enregistrer les slash commands :', error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'model') {
    await interaction.reply({
      content: `🤖 Modèle configuré : \`${OPENROUTER_MODEL}\``,
      ephemeral: true,
    });
    return;
  }

  const key = conversationKey(interaction);

  if (interaction.commandName === 'reset') {
    conversations.delete(key);
    await interaction.reply({
      content: '🧹 Ton historique de conversation a été effacé.',
      ephemeral: true,
    });
    return;
  }

  if (interaction.commandName !== 'ai') return;

  const prompt = interaction.options.getString('prompt', true).trim();
  await interaction.deferReply();

  const history = conversations.get(key) || [];
  const requestMessages = [
    ...history,
    { role: 'user', content: prompt },
  ].slice(-MAX_HISTORY_MESSAGES);

  try {
    const answer = await askOpenRouter(requestMessages);

    conversations.set(
      key,
      [
        ...requestMessages,
        { role: 'assistant', content: answer.content },
      ].slice(-MAX_HISTORY_MESSAGES),
    );

    const chunks = splitDiscordMessage(answer.content);
    await interaction.editReply(chunks[0]);

    for (const chunk of chunks.slice(1)) {
      await interaction.followUp(chunk);
    }
  } catch (error) {
    console.error(error);
    await interaction.editReply(
      `❌ Impossible de contacter OpenRouter.\n\`${String(error.message || error).slice(0, 1500)}\``,
    );
  }
});

client.on(Events.Error, (error) => {
  console.error('Erreur Discord :', error);
});

client.login(DISCORD_TOKEN);
