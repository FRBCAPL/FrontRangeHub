function formatDate(d){return new Date(d).toLocaleDateString()}
function formatCurrency(a){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(a)}
function formatDateFromISO(iso){if(!iso)return '';return formatDate(iso)}