import ApiService from './api';

export const noteService = {
  async getAllNotes() {
    return ApiService.get('/api/notes');
  },

  async createNote(text) {
    return ApiService.post('/api/notes', { text });
  },

  async deleteNote(id) {
    return ApiService.delete(`/api/notes/${id}`);
  }
}; 