unbanUser(userId) {
  return api.post(`/users/${userId}/unban`);
},

// --- НОВЫЙ МЕТОД ДЛЯ ИНИЦИАЦИИ БАНА ---
initiateBan(userId, reason, duration) {
  return api.post(`/users/${userId}/initiate-ban`, { reason, duration });
},

requestAccountDeletion() {
  return api.post('/users/delete-account/request');
} 