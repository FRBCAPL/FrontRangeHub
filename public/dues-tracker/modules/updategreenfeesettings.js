function updateGreenFeeSettings() {
    if (currentOperator) {
        if (currentOperator.green_fees_enabled !== undefined && currentOperator.green_fees_enabled !== null) {
            greenFeesEnabled = currentOperator.green_fees_enabled === true || currentOperator.green_fees_enabled === 'true';
        } else {
            const hasAmount = currentOperator.green_fee_amount && parseFloat(currentOperator.green_fee_amount) > 0;
            greenFeesEnabled = hasAmount;
        }
        
        greenFeeName = currentOperator.green_fee_name || 'Green Fee';
        greenFeeAmount = parseFloat(currentOperator.green_fee_amount) || 0;
        greenFeePayoutAmount = parseFloat(currentOperator.green_fee_payout_amount) || 0;
        
        console.log('✅ Green fee settings updated:', { greenFeesEnabled, greenFeeName, greenFeeAmount, greenFeePayoutAmount });
        
        toggleGreenFeeUI(greenFeesEnabled);
        if (typeof updateGreenFeeLabels === 'function') updateGreenFeeLabels();
    }
}
