import ApiService from './api';

export const userService = {
  async getUser(idOrEmail) {
    return ApiService.get(`/api/users/${encodeURIComponent(idOrEmail)}`);
  },

  async syncUsers() {
    return ApiService.post('/admin/sync-users');
  }
}; 