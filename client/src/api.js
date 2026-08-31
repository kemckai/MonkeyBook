const API = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// Auth
export function getAuthMe() { return request('/auth/me'); }
export function register(email, password) {
  return request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
}
export function login(email, password) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
}
export function googleLogin(credential) {
  return request('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) });
}
export function logout() { return request('/auth/logout', { method: 'POST' }); }
export function requestPasswordReset(email) {
  return request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
}
export function resetPassword(token, password) {
  return request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) });
}
export function rerollMonkey() { return request('/auth/reroll-monkey', { method: 'POST' }); }

// Identity / monkey
export function checkIdentity() { return getAuthMe().then((d) => d?.monkey || null); }
export function claimIdentity() { return request('/identity/claim', { method: 'POST' }); }
export function rerollIdentity() { return rerollMonkey(); }
export function updateBio(bio) { return request('/identity/bio', { method: 'PUT', body: JSON.stringify({ bio }) }); }
export function getProfile(id) { return request(`/identity/profile/${id}`); }

// Posts
export function getPosts(opts = {}) {
  const params = new URLSearchParams();
  if (opts.sort) params.set('sort', opts.sort);
  if (opts.feed) params.set('feed', opts.feed);
  if (opts.cursor) params.set('cursor', opts.cursor);
  if (opts.troop_id) params.set('troop_id', opts.troop_id);
  return request(`/posts?${params}`);
}
export function getPost(id) { return request(`/posts/${id}`); }
export function getReplies(id) { return request(`/posts/${id}/replies`); }
export function getMonkeyPosts(monkeyId) { return request(`/posts/monkey/${monkeyId}/posts`); }

export function createPost(content, opts = {}) {
  return request('/posts', {
    method: 'POST',
    body: JSON.stringify({ content, ...opts }),
  });
}
export function deletePost(id) { return request(`/posts/${id}`, { method: 'DELETE' }); }
export function flingPost(id) { return request(`/posts/${id}/fling`, { method: 'POST' }); }

export function toggleReaction(postId, type) { return request(`/reactions/${postId}/${type}`, { method: 'POST' }); }

// Friends
export function getFriends() { return request('/friends'); }
export function getFriendRequests() { return request('/friends/requests'); }
export function getFriendStatus(monkeyId) { return request(`/friends/status/${monkeyId}`); }
export function sendFriendRequest(monkeyId) { return request(`/friends/request/${monkeyId}`, { method: 'POST' }); }
export function acceptFriendRequest(id) { return request(`/friends/accept/${id}`, { method: 'POST' }); }
export function declineFriendRequest(id) { return request(`/friends/decline/${id}`, { method: 'POST' }); }
export function removeFriend(id) { return request(`/friends/${id}`, { method: 'DELETE' }); }

// Reports
export function reportPost(postId, reason, details) {
  return request('/reports', { method: 'POST', body: JSON.stringify({ post_id: postId, reason, details }) });
}

// Admin
export function getAdminStats() { return request('/admin/stats'); }
export function getAdminReports() { return request('/admin/reports'); }
export function dismissReport(id) { return request(`/admin/reports/${id}/dismiss`, { method: 'POST' }); }
export function resolveReport(id) { return request(`/admin/reports/${id}/resolve`, { method: 'POST' }); }
export function adminDeletePost(id) { return request(`/admin/posts/${id}`, { method: 'DELETE' }); }

// Troops
export function getTroops() { return request('/troops'); }
export function getTroop(id) { return request(`/troops/${id}`); }
export function createTroop(name, description) { return request('/troops', { method: 'POST', body: JSON.stringify({ name, description }) }); }
export function joinTroop(id) { return request(`/troops/${id}/join`, { method: 'POST' }); }

// Notifications
export function getNotifications() { return request('/notifications'); }
export function markRead(id) { return request(`/notifications/${id}/read`, { method: 'PUT' }); }
export function markAllRead() { return request('/notifications/read-all', { method: 'PUT' }); }

export function getMonkeyOfTheDay() { return request('/monkey-of-the-day'); }

export async function uploadImage(file) {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`${API}/upload`, { method: 'POST', credentials: 'include', body: form });
  if (!res.ok) throw new Error('Upload failed');
  const data = await res.json();
  if (data.status === 'processing' && data.job_id) {
    return waitForUploadJob(data.job_id);
  }
  return data;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForUploadJob(jobId, attempts = 30) {
  for (let i = 0; i < attempts; i += 1) {
    const status = await request(`/upload/${jobId}`);
    if (status.status === 'completed' && status.url) return { url: status.url };
    if (status.status === 'failed') throw new Error(status.error || 'Upload failed');
    await sleep(1000);
  }
  throw new Error('Upload timed out');
}
