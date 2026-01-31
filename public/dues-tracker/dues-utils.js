function formatDate(d){return new Date(d).toLocaleDateString()}
function formatCurrency(a){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(a)}

/** Get effective payment amount: payment.amount or sum of individualPayments (for per-player payments) */
function getPaymentAmount(payment){
    if(!payment)return 0;
    var top=parseFloat(payment.amount);
    if(top>0)return top;
    var ind=payment.individualPayments||payment.individual_payments;
    if(Array.isArray(ind)&&ind.length>0){
        return ind.reduce(function(s,p){return s+(parseFloat(p&&p.amount)||0);},0);
    }
    return 0;
}

function formatDateFromISO(iso){
    if(!iso)return '';
    var s=String(iso).trim();
    var match=s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if(match){var m=parseInt(match[2],10);var d=parseInt(match[3],10);return m+"/"+d+"/"+match[1];}
    return formatDate(iso);
}