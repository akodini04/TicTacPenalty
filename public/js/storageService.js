/**
 * StorageService - Infrastructure for local storage and server DB sync
 */
class StorageService {
  constructor() {
    this.STORAGE_KEY_TOURNAMENT = 'penalty_tictactoe_tourney_v1';
    this.STORAGE_KEY_AUDIO = 'penalty_tictactoe_audio_v1';
    this.STORAGE_KEY_STATS = 'penalty_tictactoe_stats_v1';
  }

  // Load tournament state from LocalStorage
  loadTournament() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY_TOURNAMENT);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.warn('Failed to load tournament from localStorage:', e);
      return null;
    }
  }

  // Save tournament state to LocalStorage
  saveTournament(tourneyState) {
    try {
      localStorage.setItem(this.STORAGE_KEY_TOURNAMENT, JSON.stringify(tourneyState));
    } catch (e) {
      console.warn('Failed to save tournament to localStorage:', e);
    }
  }

  // Clear tournament state
  clearTournament() {
    try {
      localStorage.removeItem(this.STORAGE_KEY_TOURNAMENT);
    } catch (e) {
      console.warn('Failed to clear tournament:', e);
    }
  }

  // Audio settings
  getAudioEnabled() {
    return localStorage.getItem(this.STORAGE_KEY_AUDIO) !== 'false';
  }

  setAudioEnabled(enabled) {
    localStorage.setItem(this.STORAGE_KEY_AUDIO, enabled ? 'true' : 'false');
  }

  // Sync high score or victory with Node.js Server Backend API (DB ready)
  async syncVictoryWithServer(teamCode, teamName, totalWins) {
    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team: teamCode, name: teamName, wins: totalWins })
      });
      return await res.json();
    } catch (e) {
      console.log('Server sync offline or DB API unavailable, using fallback storage');
      return { success: false, fallback: true };
    }
  }
}

// Global instance
window.storageService = new StorageService();
