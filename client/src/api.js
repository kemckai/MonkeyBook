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

export function checkIdentity() { return request('/identity/me'); }
export function claimIdentity() { return request('/identity/claim', { method: 'POST' }); }
export function rerollIdentity() { return request('/identity/reroll', { method: 'POST' }); }
export function updateBio(bio) { return request('/identity/bio', { method: 'PUT', body: JSON.stringify({ bio }) }); }
export function getProfile(id) { return request(`/identity/profile/${id}`); }

export function getPosts(opts = {}) {
  const params = new URLSearchParams();
  if (opts.sort) params.set('sort', opts.sort);
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

export function getTroops() { return request('/troops'); }
export function getTroop(id) { return request(`/troops/${id}`); }
export function createTroop(name, description) { return request('/troops', { method: 'POST', body: JSON.stringify({ name, description }) }); }
export function joinTroop(id) { return request(`/troops/${id}/join`, { method: 'POST' }); }

export function getNotifications() { return request('/notifications'); }
export function markRead(id) { return request(`/notifications/${id}/read`, { method: 'PUT' }); }
export function markAllRead() { return request('/notifications/read-all', { method: 'PUT' }); }

export function getMonkeyOfTheDay() { return request('/monkey-of-the-day'); }

export async function uploadImage(file) {
  const form = new FormData();
  form.append('image', file);
  const res = await fetch(`${API}/upload`, { method: 'POST', credentials: 'include', body: form });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}
