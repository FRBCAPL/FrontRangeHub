// Global state management
class AppState {
  constructor() {
    this.authToken = localStorage.getItem('authToken');
    this.currentOperator = JSON.parse(localStorage.getItem('currentOperator') || 'null');
    this.currentTeamId = null;
    this.divisions = [];
    this.teams = [];
    this.filteredTeams = [];
    this.currentDivisionId = null;
    this.currentWeek = 1;
    this.currentWeeklyPaymentTeamId = null;
    this.currentWeeklyTeamDues = 0;
    this.currentSortColumn = null;
    this.currentSortDirection = 'asc';
    this.currentWeeklyPaymentWeek = 1;
    this.projectionMode = false;
    this.allPlayersData = [];
    this.currentPlayersSortColumn = null;
    this.currentPlayersSortDirection = 'asc';
    
    // Flags
    this.divisionNameListenersSetup = false;
    this.datePickerListenersSetup = false;
    this.duesFieldListenerSetup = false;
    
    // Sanction fee settings
    this.sanctionFeesEnabled = false;
    this.sanctionFeeName = 'Sanction Fee';
    this.sanctionFeeAmount = 25.00;
    this.sanctionFeePayoutAmount = 20.00;
    
    // Financial breakdown settings
    this.prizeFundPercentage = 50.0;
    this.prizeFundName = 'Prize Fund';
    this.firstOrganizationPercentage = 60.0;
    this.firstOrganizationName = 'League Manager';
    this.secondOrganizationPercentage = 40.0;
    this.secondOrganizationName = 'Parent/National Organization';
    this.useDollarAmounts = false;
    this._savedUseDollarAmounts = false;
    
    // Dollar amount settings
    this.prizeFundAmount = null;
    this.prizeFundAmountType = 'perTeam';
    this.firstOrganizationAmount = null;
    this.firstOrganizationAmountType = 'perTeam';
    this.secondOrganizationAmount = null;
    this.secondOrganizationAmountType = 'perTeam';
    
    // Division calculation method
    this._savedDivisionUseDollarAmounts = false;
  }
  
  setAuthToken(token) {
    this.authToken = token;
    if (token) {
      localStorage.setItem('authToken', token);
    } else {
      localStorage.removeItem('authToken');
    }
  }
  
  setCurrentOperator(operator) {
    this.currentOperator = operator;
    if (operator) {
      localStorage.setItem('currentOperator', JSON.stringify(operator));
    } else {
      localStorage.removeItem('currentOperator');
    }
  }
}

// Export singleton instance
export const appState = new AppState();
