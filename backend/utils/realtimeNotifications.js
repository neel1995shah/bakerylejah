const webpush = require('web-push');
const User = require('../models/User');

const FIRM_NAMES = ['krish', 'harsh', 'harssh', 'meet'];
const FIRM_USERNAME_REGEX = new RegExp(`^(${FIRM_NAMES.join('|')})$`, 'i');

const normalizeName = (value) => (value || '').toLowerCase().trim();
const isFirmMember = (username) => FIRM_NAMES.includes(normalizeName(username));

const formatActorInitial = (username) => {
  const normalized = String(username || '').trim();
  return normalized ? normalized.charAt(0).toUpperCase() : '';
};

const formatChangeList = (changes = []) => {
  const cleanChanges = changes.filter(Boolean);
  if (cleanChanges.length === 0) {
    return '';
  }

  if (cleanChanges.length === 1) {
    return cleanChanges[0];
  }

  if (cleanChanges.length === 2) {
    return `${cleanChanges[0]} and ${cleanChanges[1]}`;
  }

  return `${cleanChanges.slice(0, -1).join(', ')} and ${cleanChanges[cleanChanges.length - 1]}`;
};

const buildNotificationBody = (payload) => {
  const actor = formatActorInitial(payload.user);
  
  // New format: K U ACC details 105 in: 500→600, handler: old→new
  if (payload.actionType && payload.entryType) {
    const actionCode = payload.actionType; // 'U', 'A', 'D'
    const typeCode = payload.entryType; // 'ACC', 'P&L', 'LED'
    const indexNum = payload.entryCode || '';
    
    // Format changes with from→to notation
    const changeDetails = (payload.detailedChanges || [])
      .map(change => {
        if (change.field && change.oldValue !== undefined && change.newValue !== undefined) {
          return `${change.field}: ${change.oldValue}→${change.newValue}`;
        }
        return change;
      })
      .filter(Boolean)
      .join(', ');
    
    if (!changeDetails) {
      return `${actor} ${actionCode} ${typeCode}`.trim();
    }
    
    return `${actor} ${actionCode} ${typeCode} details ${indexNum} ${changeDetails}`.trim();
  }
  
  // Fallback to old format for backward compatibility
  const baseAction = payload.action || 'updated something';
  const changeList = formatChangeList(payload.changes || []);

  if (!changeList) {
    return `${actor} ${baseAction} inside ${payload.module}`.trim();
  }

  return `${actor} ${baseAction}: ${changeList} inside ${payload.module}`.trim();
};

let webPushConfigured = false;

const configureWebPush = () => {
  if (webPushConfigured) {
    return;
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

  if (publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    webPushConfigured = true;
  }
};

const cleanPayload = (payload = {}) => ({
  action: payload.action || '',
  user: payload.user || '',
  module: payload.module || '',
  changes: Array.isArray(payload.changes) ? payload.changes : [],
  body: payload.body || ''
});

const saveSubscription = async (userId, subscription, userAgent = '') => {
  const user = await User.findById(userId);
  if (!user) {
    return null;
  }

  const normalizedSubscription = {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime ? new Date(subscription.expirationTime) : null,
    keys: {
      p256dh: subscription.keys?.p256dh,
      auth: subscription.keys?.auth
    },
    userAgent,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const existingIndex = (user.pushSubscriptions || []).findIndex(
    (entry) => entry.endpoint === normalizedSubscription.endpoint
  );

  if (existingIndex >= 0) {
    const existing = user.pushSubscriptions[existingIndex];
    existing.endpoint = normalizedSubscription.endpoint;
    existing.expirationTime = normalizedSubscription.expirationTime;
    existing.keys = normalizedSubscription.keys;
    existing.userAgent = normalizedSubscription.userAgent;
    existing.updatedAt = normalizedSubscription.updatedAt;
    if (!existing.createdAt) {
      existing.createdAt = normalizedSubscription.createdAt;
    }
  } else {
    user.pushSubscriptions.push(normalizedSubscription);
  }

  await user.save();
  return normalizedSubscription;
};

const sendPushToUser = async (user, payload) => {
  if (!user?.pushSubscriptions?.length) {
    return;
  }

  const notification = {
    title: 'Gamdom Alert',
    body: payload.body || buildNotificationBody(payload),
    icon: '/logo_embedded.svg',
    badge: '/logo_embedded.svg',
    url: '/',
    tag: `gamdom-${payload.module}-${payload.action}`
  };

  const subscriptions = [...user.pushSubscriptions];

  for (const subscription of subscriptions) {
    const webPushSubscription = {
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime || null,
      keys: subscription.keys
    };

    try {
      await webpush.sendNotification(webPushSubscription, JSON.stringify(notification));
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        user.pushSubscriptions = user.pushSubscriptions.filter(
          (entry) => entry.endpoint !== subscription.endpoint
        );
      }
    }
  }

  await user.save();
};

const broadcastRealtimeNotification = async (io, payload) => {
  const clean = cleanPayload(payload);

  if (!io || !clean.user || !clean.action || !clean.module) {
    return;
  }

  io.emit('realtime-update', clean);

  if (!isFirmMember(clean.user)) {
    return;
  }

  configureWebPush();

  if (!webPushConfigured) {
    return;
  }

  const firmUsers = await User.find({ username: { $regex: FIRM_USERNAME_REGEX } });
  const recipients = firmUsers.filter((user) => normalizeName(user.username) !== normalizeName(clean.user));

  for (const recipient of recipients) {
    if (io.activeUsers?.has(normalizeName(recipient.username))) {
      continue;
    }

    await sendPushToUser(recipient, clean);
  }
};

module.exports = {
  broadcastRealtimeNotification,
  configureWebPush,
  saveSubscription,
  isFirmMember,
  buildNotificationBody,
  formatActorInitial
};