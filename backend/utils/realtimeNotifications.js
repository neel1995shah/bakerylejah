let webpush = null;
try {
  webpush = require('web-push');
} catch (error) {
  // Keep the API running even if push dependency is missing in a deployment.
  console.warn('web-push module is not installed. Push notifications are disabled.');
}
const User = require('../models/User');
const Notification = require('../models/Notification');

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

const formatDetailedChange = (change) => {
  if (!change || typeof change !== 'object' || !change.field) {
    return '';
  }

  const hasOld = change.oldValue !== undefined && change.oldValue !== null && String(change.oldValue) !== '';
  const hasNew = change.newValue !== undefined && change.newValue !== null && String(change.newValue) !== '';

  if (hasOld && hasNew) {
    return `${change.field}: ${change.oldValue}→${change.newValue}`;
  }

  if (!hasOld && hasNew) {
    return `${change.field}: ${change.newValue}`;
  }

  if (hasOld && !hasNew) {
    return `${change.field}: ${change.oldValue}`;
  }

  return '';
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
        if (typeof change === 'string') {
          return change;
        }
        return formatDetailedChange(change);
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

  if (!webpush) {
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
  // Support both legacy (action/module) and new (actionType/entryType) shapes.
  action: payload.action || payload.actionType || '',
  actionType: payload.actionType || '',
  entryType: payload.entryType || '',
  entryCode: payload.entryCode || '',
  user: payload.user || '',
  module: payload.module || payload.entryType || '',
  changes: Array.isArray(payload.changes) ? payload.changes : [],
  detailedChanges: Array.isArray(payload.detailedChanges) ? payload.detailedChanges : [],
  body: payload.body || ''
});

const createNotificationRecord = async (recipientId, payload) => {
  const body = payload.body || buildNotificationBody(payload);
  const changes = (payload.detailedChanges || payload.changes || [])
    .map((change) => {
      if (typeof change === 'string') {
        return change;
      }

      return formatDetailedChange(change);
    })
    .filter(Boolean);

  return Notification.create({
    userId: recipientId,
    actorUsername: payload.user,
    action: payload.action || payload.actionType || '',
    module: payload.module || payload.entryType || '',
    body,
    changes,
    read: false
  });
};

const saveSubscription = async (userId, subscription, userAgent = '') => {
  const user = await User.findById(userId);
  if (!user) {
    return null;
  }

  const endpoint = subscription.endpoint;
  const expirationTime = subscription.expirationTime ? new Date(subscription.expirationTime) : null;
  const p256dh = subscription.keys?.p256dh;
  const auth = subscription.keys?.auth;

  // Find if it already exists
  const existingIndex = (user.pushSubscriptions || []).findIndex(sub => sub.endpoint === endpoint);

  if (existingIndex >= 0) {
    user.pushSubscriptions[existingIndex].expirationTime = expirationTime;
    user.pushSubscriptions[existingIndex].keys = { p256dh, auth };
    user.pushSubscriptions[existingIndex].userAgent = userAgent;
    user.pushSubscriptions[existingIndex].updatedAt = new Date();
  } else {
    // If not exists, push new
    user.pushSubscriptions.push({
      endpoint,
      expirationTime,
      keys: { p256dh, auth },
      userAgent,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // Clean out any invalid old ones smoothly
  user.pushSubscriptions = user.pushSubscriptions.filter(entry => 
    entry && entry.endpoint && entry.keys && entry.keys.p256dh && entry.keys.auth
  );

  await user.save();
  return subscription;
};

const sendPushToUser = async (user, payload) => {
  if (!webpush) {
    return;
  }

  if (!user?.pushSubscriptions?.length) {
    return;
  }

  const notification = {
    title: 'Finance Alert',
    body: payload.body || buildNotificationBody(payload),
    icon: '/logo_embedded.svg',
    badge: '/logo_embedded.svg',
    url: '/',
    tag: `finance-${payload.module}-${payload.action}`
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
      console.log('Successfully pushed web notification to:', subscription.endpoint);
    } catch (error) {
      console.error('Failed to push web notification:', error);
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

  if (!isFirmMember(clean.user)) {
    return;
  }

  configureWebPush();

  const firmUsers = await User.find({ username: { $regex: FIRM_USERNAME_REGEX } });
  const recipients = firmUsers.filter((user) => normalizeName(user.username) !== normalizeName(clean.user));

  for (const recipient of recipients) {
    const savedNotification = await createNotificationRecord(recipient._id, clean);
    const room = normalizeName(recipient.username);

    if (io.activeUsers?.has(room)) {
      io.to(room).emit('realtime-update', {
        _id: savedNotification._id,
        user: clean.user,
        action: clean.action,
        module: clean.module,
        body: savedNotification.body,
        changes: savedNotification.changes,
        read: savedNotification.read,
        date: savedNotification.createdAt,
        actorInitial: formatActorInitial(clean.user)
      });
    }
    
    if (webPushConfigured) {
      await sendPushToUser(recipient, clean);
    }
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