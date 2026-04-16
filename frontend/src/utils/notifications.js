import { toast } from 'react-toastify';
import { isFirmMember } from './auth';

const formatActorInitial = (username) => {
  const value = String(username || '').trim();
  return value ? value.charAt(0).toUpperCase() : '';
};

const buildNotificationText = (payload) => {
  const actor = payload.actorInitial || formatActorInitial(payload.user);
  if (payload.body) {
    return payload.body;
  }

  const action = payload.action || 'updated something';
  const module = payload.module || 'Updates';
  return `${actor} ${action} inside ${module}`.trim();
};

export const requestNativePermissions = () => {
  if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
    Notification.requestPermission().catch(err => console.warn('Notification permission dismissed:', err));
  }
};

export const handleNotificationPulse = (payload, currentUser) => {
  const { user } = payload;
  
  if (!user || !currentUser) return false;
  
  // If the person who did the action is me, do not notify me
  if (user.toLowerCase() === currentUser.toLowerCase()) return false;
  
  // If the logged in user is NOT part of the Firm, they don't get notifications from anyone
  if (!isFirmMember(currentUser)) return false;
  
  // If the user who performed the action is NOT part of the Firm, the Firm doesn't get notified
  if (!isFirmMember(user)) return false;

  // Otherwise, a valid Firm action was taken by another Firm member!
  try {
    const audio = new Audio('/fahhhhh.mp3');
    audio.play().catch(err => console.warn('Audio playback blocked by browser until user click:', err));
  } catch (e) {
    console.warn('Audio element not supported:', e);
  }

  // Local app alert is handled via Toast
  toast.info(`${buildNotificationText(payload)}!`, {
    position: "top-right",
    autoClose: 6000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: "colored"
  });

  return true;
};
