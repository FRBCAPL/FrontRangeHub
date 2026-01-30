function initializeClock() {
    updateLocalClock(); // Update immediately
    setInterval(updateLocalClock, 1000); // Update every second
}
