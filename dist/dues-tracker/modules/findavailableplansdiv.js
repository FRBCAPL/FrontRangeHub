async function findAvailablePlansDiv(maxRetries = 10, delay = 200) {
        for (let i = 0; i < maxRetries; i++) {
            const div = document.getElementById('availablePlans');
            if (div) {
                console.log(`✅ Found availablePlans div on attempt ${i + 1}`);
                // Check if it's actually in the DOM and accessible
                const isInDOM = div.offsetParent !== null || div.closest('#subscription-pane') !== null;
                console.log('Div is in DOM:', isInDOM, 'Parent:', div.parentElement?.id);
                return div;
            }
            if (i < maxRetries - 1) {
                console.log(`⏳ availablePlans div not found, waiting ${delay}ms (attempt ${i + 1}/${maxRetries})...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        return null;
    }
