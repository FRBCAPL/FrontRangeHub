function toggleGreenFeeUI(show) {
    // Green fee card
    const greenFeesCard = document.getElementById('greenFeesCard');
    if (greenFeesCard) {
        greenFeesCard.style.display = show ? '' : 'none';
    }
    
    // Green fee section in weekly payment modal
    const greenFeeSection = document.getElementById('greenFeeIncludeSection');
    if (greenFeeSection) {
        greenFeeSection.style.display = show ? '' : 'none';
    }
}
