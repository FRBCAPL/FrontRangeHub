function updateFinancialBreakdownSettings() {
    if (currentOperator) {
        // Load calculation method (percentage or dollar amount)
        useDollarAmounts = currentOperator.use_dollar_amounts || currentOperator.useDollarAmounts || false;
        _savedUseDollarAmounts = useDollarAmounts;
        
        // Load financial breakdown percentages and names from operator profile
        // Support both new field names and old field names for backward compatibility
        prizeFundPercentage = parseFloat(currentOperator.prize_fund_percentage || currentOperator.prizeFundPercentage);
        prizeFundName = currentOperator.prize_fund_name || currentOperator.prizeFundName || 'Prize Fund';
        firstOrganizationPercentage = parseFloat(currentOperator.first_organization_percentage || currentOperator.league_manager_percentage || currentOperator.leagueManagerPercentage);
        firstOrganizationName = currentOperator.first_organization_name || currentOperator.firstOrganizationName || 
                                currentOperator.league_manager_name || 'League Manager';
        secondOrganizationPercentage = parseFloat(currentOperator.second_organization_percentage || currentOperator.usa_pool_league_percentage || currentOperator.usaPoolLeaguePercentage);
        secondOrganizationName = currentOperator.second_organization_name || currentOperator.secondOrganizationName || 
                                currentOperator.usa_pool_league_name || 'Parent/National Organization';
        
        // Load dollar amount settings
        prizeFundAmount = currentOperator.prize_fund_amount || currentOperator.prizeFundAmount || null;
        prizeFundAmountType = currentOperator.prize_fund_amount_type || currentOperator.prizeFundAmountType || 'perTeam';
        firstOrganizationAmount = currentOperator.first_organization_amount || currentOperator.firstOrganizationAmount || null;
        firstOrganizationAmountType = currentOperator.first_organization_amount_type || currentOperator.firstOrganizationAmountType || 'perTeam';
        secondOrganizationAmount = currentOperator.second_organization_amount || currentOperator.secondOrganizationAmount || null;
        secondOrganizationAmountType = currentOperator.second_organization_amount_type || currentOperator.secondOrganizationAmountType || 'perTeam';
        
        // Validate percentages (must be valid numbers)
        if (isNaN(prizeFundPercentage)) prizeFundPercentage = 50.0;
        if (isNaN(firstOrganizationPercentage)) firstOrganizationPercentage = 60.0;
        if (isNaN(secondOrganizationPercentage)) secondOrganizationPercentage = 40.0;
        
        // Update UI labels dynamically
        updateFinancialBreakdownLabels();
        
        console.log('✅ Financial breakdown settings updated:', { 
            useDollarAmounts,
            prizeFundPercentage, 
            prizeFundName,
            prizeFundAmount,
            prizeFundAmountType,
            firstOrganizationPercentage,
            firstOrganizationName,
            firstOrganizationAmount,
            firstOrganizationAmountType,
            secondOrganizationPercentage,
            secondOrganizationName,
            secondOrganizationAmount,
            secondOrganizationAmountType
        });
    }
}
