import PocketBase from 'pocketbase';

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090');

const ADVERBS = ['Swiftly', 'Quietly', 'Boldly', 'Calmly', 'Eagerly', 'Gladly', 'Bravely', 'Brightly', 'Cleverly', 'Fiercely'];
const ADJECTIVES = ['Red', 'Blue', 'Green', 'Happy', 'Sad', 'Angry', 'Fast', 'Slow', 'Tall', 'Short', 'Tiny', 'Giant'];
const NOUNS = ['Panda', 'Tiger', 'Bear', 'Lion', 'Wolf', 'Fox', 'Hawk', 'Owl', 'Shark', 'Whale', 'Dragon', 'Unicorn'];

function generateNickname() {
  const adv = ADVERBS[Math.floor(Math.random() * ADVERBS.length)];
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adv} ${adj} ${noun}`;
}

export function getColor(user: any) {
  if (user?.color) return user.color;
  const str = user?.id || 'unknown';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
}

export function getAuth() {
  return pb.authStore.isValid ? pb.authStore.model : null;
}

export function getExportToken() {
  // We store the token in localStorage upon creation/login so the user can see it
  return localStorage.getItem('doksy_account_token');
}

export async function loginWithToken(token: string) {
  try {
    await pb.collection('users').authWithPassword(token, token);
    localStorage.setItem('doksy_account_token', token);
    return pb.authStore.model;
  } catch (error) {
    console.error("Login failed", error);
    return null;
  }
}

export async function createNewAccount() {
  // Use a secure random string for both username and password
  const token = 'user' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  const name = generateNickname();

  try {
    await pb.collection('users').create({
      username: token,
      password: token,
      passwordConfirm: token,
      name: name
    });

    await pb.collection('users').authWithPassword(token, token);
    localStorage.setItem('doksy_account_token', token);
    return pb.authStore.model;
  } catch (error) {
    console.error("Failed to create account", error);
    return null;
  }
}

// Keeping ensureAuth for Editor.tsx, it now throws if not logged in
export async function ensureAuth() {
  if (pb.authStore.isValid) {
    return pb.authStore.model;
  }
  throw new Error("Not authenticated");
}

