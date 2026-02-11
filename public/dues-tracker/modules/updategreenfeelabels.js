function updateGreenFeeLabels() {
    const greenFeesCardTitle = document.getElementById('greenFeesCardTitle');
    if (greenFeesCardTitle) {
        greenFeesCardTitle.textContent = `${greenFeeName} Collected`;
    }
}
