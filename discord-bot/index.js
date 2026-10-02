import { Client, Events, GatewayIntentBits } from 'discord.js';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WORK_VOICE_CHANNEL_IDS = process.env.WORK_VOICE_CHANNEL_IDS ? process.env.WORK_VOICE_CHANNEL_IDS.split(',').map(id => id.trim()) : [];

if (!DISCORD_TOKEN || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || WORK_VOICE_CHANNEL_IDS.length === 0) {
  console.error("Missing required environment variables. Please check your .env file.");
  process.exit(1);
}

// Initialize Supabase with service role key (Backend only, full bypass of RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Initialize Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// Cache for discord_user_id -> profile user_id mapping
const profileCache = new Map();

async function getProfileByDiscordId(discordUserId) {
  if (profileCache.has(discordUserId)) {
    return profileCache.get(discordUserId);
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, discord_user_id')
    .eq('discord_user_id', discordUserId)
    .single();

  if (error || !data) {
    if (error?.code !== 'PGRST116') { // PGRST116 is "Rows not found"
      console.error(`[DB Error] fetching profile for Discord ID ${discordUserId}:`, error);
    } else {
      console.log(`[DB Info] Profile not found for Discord ID ${discordUserId}`);
    }
    return null;
  }

  profileCache.set(discordUserId, data);
  return data;
}

// Helper to create a new session
async function startSession(discordUserId, channelId, channelName) {
  console.log(`[startSession] Looking up profile for Discord ID: ${discordUserId}`);
  const profile = await getProfileByDiscordId(discordUserId);
  console.log(`[startSession] Profile lookup result:`, profile);
  
  if (!profile) {
    console.warn(`[Warning] Ignored join for Discord ID ${discordUserId}: No linked profile found in database.`);
    return;
  }

  // Prevent duplicate open sessions
  const { data: existingSessions } = await supabase
    .from('voice_sessions')
    .select('id')
    .eq('discord_user_id', discordUserId)
    .is('left_at', null);

  if (existingSessions && existingSessions.length > 0) {
    console.warn(`[Warning] User ${discordUserId} already has an open session. Avoiding duplicate.`);
    return;
  }

  const { error } = await supabase
    .from('voice_sessions')
    .insert([
      {
        discord_user_id: discordUserId,
        channel_id: channelId,
        channel_name: channelName,
        joined_at: new Date().toISOString()
      }
    ]);

  if (error) {
    console.error(`[DB Error] Starting session for ${discordUserId}:`, error);
  } else {
    console.log(`[Session Started] ${discordUserId} joined work channel ${channelName} (${channelId})`);
  }
}

// Helper to end an active session
async function endSession(discordUserId) {
  // Find the open session
  const { data: openSessions, error: fetchError } = await supabase
    .from('voice_sessions')
    .select('*')
    .eq('discord_user_id', discordUserId)
    .is('left_at', null)
    .order('joined_at', { ascending: false });

  if (fetchError) {
    console.error(`[DB Error] Fetching open sessions for ${discordUserId}:`, fetchError);
    return;
  }

  if (openSessions && openSessions.length > 0) {
    // There could theoretically be multiple if the bot crashed, we close all open ones.
    const now = new Date().toISOString();
    
    for (const session of openSessions) {
      const { error: updateError } = await supabase
        .from('voice_sessions')
        .update({ left_at: now })
        .eq('id', session.id);
        
      if (updateError) {
        console.error(`[DB Error] Ending session ${session.id}:`, updateError);
      } else {
        console.log(`[Session Ended] ${discordUserId} left. Session ${session.id} closed.`);
      }
    }
  }
}

// On Ready - Reconcile Sessions
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Discord bot logged in as ${readyClient.user.tag}`);
  
  console.log('Reconciling active voice states...');
  // 1. Fetch all currently open sessions in the database
  const { data: openSessions, error: fetchError } = await supabase
    .from('voice_sessions')
    .select('*')
    .is('left_at', null);
    
  if (fetchError) {
    console.error('[DB Error] Failed to fetch open sessions on startup:', fetchError);
    return;
  }
  
  const currentOpenDbDiscordIds = new Set((openSessions || []).map(s => s.discord_user_id));
  const activeVoiceDiscordIds = new Set();
  const now = new Date().toISOString();

  // 2. Iterate through all voice channels the bot can see
  for (const guild of readyClient.guilds.cache.values()) {
    for (const channel of guild.channels.cache.values()) {
      if (channel.isVoiceBased()) {
        const isWorkChannel = WORK_VOICE_CHANNEL_IDS.includes(channel.id);
        
        for (const [memberId, member] of channel.members) {
          if (member?.user?.bot) continue;
          
          if (isWorkChannel) {
            activeVoiceDiscordIds.add(memberId);
            // If they are in a work channel but have no open DB session, start one
            if (!currentOpenDbDiscordIds.has(memberId)) {
               console.log(`[Reconciliation] Starting missing session for ${memberId}`);
               await startSession(memberId, channel.id, channel.name);
               currentOpenDbDiscordIds.add(memberId);
            }
          }
        }
      }
    }
  }

  // 3. Close any sessions in the DB for users who are no longer in a work channel
  for (const session of (openSessions || [])) {
    if (!activeVoiceDiscordIds.has(session.discord_user_id)) {
      console.log(`[Reconciliation] Closing abandoned session for ${session.discord_user_id}`);
      await supabase
        .from('voice_sessions')
        .update({ left_at: now })
        .eq('id', session.id);
    }
  }
  
  console.log('Reconciliation complete. Bot is fully active.');
});

// Voice State Update Event
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  // Ignore bots safely
  if (newState.member?.user?.bot) return;

  const discordUserId = newState.id;
  const oldChannelId = oldState.channelId;
  const newChannelId = newState.channelId;

  // No channel change (mute/deafen events)
  if (oldChannelId === newChannelId) return;

  const wasInWorkChannel = WORK_VOICE_CHANNEL_IDS.includes(oldChannelId);
  const isInWorkChannel = WORK_VOICE_CHANNEL_IDS.includes(newChannelId);

  console.log(`\n[VoiceStateUpdate]`);
  console.log(`User ID: ${discordUserId}`);
  console.log(`Username: ${newState.member?.user?.username || 'Unknown'}`);
  console.log(`Old Channel ID: ${oldChannelId}`);
  console.log(`New Channel ID: ${newChannelId}`);
  console.log(`WORK_VOICE_CHANNEL_IDS:`, WORK_VOICE_CHANNEL_IDS);
  console.log(`wasInWorkChannel: ${wasInWorkChannel}`);
  console.log(`isInWorkChannel: ${isInWorkChannel}`);

  try {
    if (!wasInWorkChannel && isInWorkChannel) {
      // User joined a work channel
      await startSession(discordUserId, newChannelId, newState.channel.name);
    } 
    else if (wasInWorkChannel && !isInWorkChannel) {
      // User left a work channel
      await endSession(discordUserId);
    } 
    else if (wasInWorkChannel && isInWorkChannel) {
      // User moved from one work channel to another
      await endSession(discordUserId);
      await startSession(discordUserId, newChannelId, newState.channel.name);
    }
  } catch (err) {
    console.error(`[Error] processing voice state update for ${discordUserId}:`, err);
  }
});

client.login(DISCORD_TOKEN);
