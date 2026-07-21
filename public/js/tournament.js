/**
 * Tournament - Manages 16-Team World Cup Bracket & Progression
 */
class Tournament {
  constructor() {
    this.teams = [
      { code: 'HU', name: 'Hungary', flag: '🇭🇺', rating: '92', desc: 'The Mighty Magyars! Legendary football tradition and fierce tactical prowess.', featured: true },
      { code: 'AR', name: 'Argentina', flag: '🇦🇷', rating: '96', desc: 'World Cup Champions! Fast-paced and relentless.' },
      { code: 'BR', name: 'Brazil', flag: '🇧🇷', rating: '95', desc: 'Joga Bonito! Five-time world champions.' },
      { code: 'FR', name: 'France', flag: '🇫🇷', rating: '94', desc: 'Explosive pace and deadly clinical finishing.' },
      { code: 'ENG', name: 'England', flag: '🇬🇧', rating: '91', desc: 'Solid defending and powerful penalty strikes.' },
      { code: 'DE', name: 'Germany', flag: '🇩🇪', rating: '92', desc: 'Disciplined precision machine.' },
      { code: 'ES', name: 'Spain', flag: '🇪🇸', rating: '93', desc: 'Tiki-taka masterminds with high grid awareness.' },
      { code: 'PT', name: 'Portugal', flag: '🇵🇹', rating: '90', desc: 'Slick footwork and sharp counter-attacking.' },
      { code: 'IT', name: 'Italy', flag: '🇮🇹', rating: '89', desc: 'Unbreakable defense and tactical dive timing.' },
      { code: 'NL', name: 'Netherlands', flag: '🇳🇱', rating: '88', desc: 'Total Football style with sharp tactical awareness.' },
      { code: 'HR', name: 'Croatia', flag: '🇭🇷', rating: '87', desc: 'Penalty shoot-out specialists with high stamina!' },
      { code: 'JP', name: 'Japan', flag: '🇯🇵', rating: '86', desc: 'Lightning quick reflexes and disciplined shooting.' },
      { code: 'MA', name: 'Morocco', flag: '🇲🇦', rating: '85', desc: 'Fierce crowd support and defensive brick wall.' },
      { code: 'US', name: 'USA', flag: '🇺🇸', rating: '84', desc: 'High energy athletic powerhouse.' },
      { code: 'MX', name: 'Mexico', flag: '🇲🇽', rating: '84', desc: 'Passionate squad with unpredictable trick shots.' },
      { code: 'UY', name: 'Uruguay', flag: '🇺🇾', rating: '85', desc: 'Tenacious spirit and deadly set-piece goals.' }
    ];

    this.stages = ['ROUND OF 16', 'QUARTER-FINAL', 'SEMI-FINAL', 'GRAND FINAL'];
    this.userTeam = null;
    this.currentStageIndex = 0;
    this.bracketMatches = [];
  }

  getTeam(code) {
    return this.teams.find(t => t.code === code) || this.teams[0];
  }

  // Initialize new tournament bracket
  startTournament(userTeamCode) {
    this.userTeam = this.getTeam(userTeamCode);
    this.currentStageIndex = 0;

    // Remaining 15 teams shuffled
    const remainingTeams = this.teams.filter(t => t.code !== userTeamCode);
    this.shuffle(remainingTeams);

    // Round of 16 matches (8 matches total)
    const r16Matches = [];
    
    // User match is match #0
    r16Matches.push({
      team1: this.userTeam,
      team2: remainingTeams[0],
      winner: null
    });

    for (let i = 1; i < 8; i++) {
      r16Matches.push({
        team1: remainingTeams[i * 2 - 1],
        team2: remainingTeams[i * 2],
        winner: null
      });
    }

    this.bracketMatches = [
      r16Matches, // Stage 0: R16 (8 matches)
      [],         // Stage 1: QF (4 matches)
      [],         // Stage 2: SF (2 matches)
      []          // Stage 3: Final (1 match)
    ];

    this.saveState();
  }

  getCurrentOpponent() {
    const currentRound = this.bracketMatches[this.currentStageIndex];
    if (!currentRound || currentRound.length === 0) return null;
    
    const userMatch = currentRound.find(m => m.team1.code === this.userTeam.code || m.team2.code === this.userTeam.code);
    if (!userMatch) return null;

    return userMatch.team1.code === this.userTeam.code ? userMatch.team2 : userMatch.team1;
  }

  advanceTournament(userWon) {
    const currentRound = this.bracketMatches[this.currentStageIndex];
    const userMatchIndex = currentRound.findIndex(m => m.team1.code === this.userTeam.code || m.team2.code === this.userTeam.code);

    if (userMatchIndex === -1) return false;

    const userMatch = currentRound[userMatchIndex];
    const opponent = this.getCurrentOpponent();

    if (userWon) {
      userMatch.winner = this.userTeam;
    } else {
      userMatch.winner = opponent;
      this.saveState();
      return false; // User eliminated
    }

    // Simulate other AI matches in current stage
    currentRound.forEach((match, idx) => {
      if (idx !== userMatchIndex && !match.winner) {
        match.winner = Math.random() < 0.5 ? match.team1 : match.team2;
      }
    });

    // Populate next stage if not final
    if (this.currentStageIndex < 3) {
      const nextRound = [];
      for (let i = 0; i < currentRound.length; i += 2) {
        nextRound.push({
          team1: currentRound[i].winner,
          team2: currentRound[i + 1].winner,
          winner: null
        });
      }
      this.currentStageIndex++;
      this.bracketMatches[this.currentStageIndex] = nextRound;
      this.saveState();
      return true; // Advanced to next round!
    }

    // Final won!
    this.saveState();
    return 'CHAMPION';
  }

  saveState() {
    if (window.storageService) {
      window.storageService.saveTournament({
        userTeamCode: this.userTeam ? this.userTeam.code : null,
        currentStageIndex: this.currentStageIndex,
        bracketMatches: this.bracketMatches
      });
    }
  }

  loadState() {
    if (!window.storageService) return false;
    const saved = window.storageService.loadTournament();
    if (saved && saved.userTeamCode) {
      this.userTeam = this.getTeam(saved.userTeamCode);
      this.currentStageIndex = saved.currentStageIndex || 0;
      this.bracketMatches = saved.bracketMatches || [];
      return true;
    }
    return false;
  }

  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}

window.tournament = new Tournament();
