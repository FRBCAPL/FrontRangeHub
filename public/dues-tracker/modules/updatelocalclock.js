function updateLocalClock() {
    const clockTimeElement = document.getElementById('clockTime');
    const clockDateElement = document.getElementById('clockDate');
    
    if (!clockTimeElement || !clockDateElement) {
        return; // Elements not found, clock might not be visible yet
    }
    
    const now = new Date();
    
    // Format time: HH:MM:SS AM/PM
    const timeOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    };
    const timeString = now.toLocaleTimeString(undefined, timeOptions);
    
    // Format date: Day, Month DD, YYYY
    const dateOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    const dateString = now.toLocaleDateString(undefined, dateOptions);
    
    clockTimeElement.textContent = timeString;
    clockDateElement.textContent = dateString;
}
