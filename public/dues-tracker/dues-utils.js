function formatDate(d){return new Date(d).toLocaleDateString()}
function formatCurrency(a){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(a)}
function formatDateFromISO(iso){
    if(!iso)return '';
    var s=String(iso).trim();
    var match=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(match){var m=parseInt(match[2],10);var d=parseInt(match[3],10);return m+"/"+d+"/"+match[1];}
    return formatDate(iso);
}