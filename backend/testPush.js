const mongoose = require('mongoose');
const User = require('./models/User');
const webpush = require('web-push');
require('dotenv').config();

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const main = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected DB');
  const users = await User.find({});
  for (const user of users) {
    if (user.pushSubscriptions && user.pushSubscriptions.length > 0) {
      console.log(`Found push subscriptions for ${user.username}: ${user.pushSubscriptions.length}`);
      for (const sub of user.pushSubscriptions) {
        const pSub = { endpoint: sub.endpoint, keys: sub.keys };
        try {
           await webpush.sendNotification(pSub, JSON.stringify({title: 'Test', body: 'Test push'}));
           console.log('Success push to', user.username);
        } catch(e) {
           console.error('Failed to push to', user.username, e);
        }
      }
    }
  }
  process.exit();
};

main().catch(console.error);
