$(document).ready(function () {
    loadPricingDetails();
});

// Allow only numbers and max 2 decimal places
$('.amount-input, .percentage-input').on('keydown', function (e) {
    const key = e.key;
    const value = $(this).val();

    // Allow control/navigation keys
    if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(key)) {
        return;
    };

    // Allow decimal point only once
    if (key === '.') {
        if (value.includes('.')) {
            e.preventDefault();
        };
        return;
    };

    // Allow only numbers
    if (!/^[0-9]$/.test(key)) {
        e.preventDefault();
    };
});

// Amount
$('.amount-input').on('input', function () {
    let value = $(this).val();

    // Remove invalid characters
    value = value.replace(/[^0-9.]/g, '');

    // Keep only first decimal
    const parts = value.split('.');

    if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
    };

    // Maximum 2 digits after decimal
    if (value.includes('.')) {
        const decimalParts = value.split('.');

        value = decimalParts[0] + '.' + decimalParts[1].substring(0, 2);
    };

    $(this).val(value);
});

// Percentage: 0 - 100
$('.percentage-input').on('input', function () {
    let value = $(this).val();

    // Remove invalid characters
    value = value.replace(/[^0-9.]/g, '');

    // Keep only first decimal
    const parts = value.split('.');

    if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
    };

    // Maximum 2 digits after decimal
    if (value.includes('.')) {
        const decimalParts = value.split('.');

        value = decimalParts[0] + '.' + decimalParts[1].substring(0, 2);
    };

    // Maximum 100
    if (value !== '' && parseFloat(value) > 100) {
        value = '100';
    };

    $(this).val(value);
});

$(document).on("submit", "#pricing-form", function (e) {
    e.preventDefault();

    const payload = {
        basePrice: parseFloat($("#basePrice").val()) || 0,
        perKmCharge: parseFloat($("#perKmCharge").val()) || 0,
        platformCommission: parseFloat($("#platformCommission").val()) || 0,
        cancellationFee: parseFloat($("#cancellationFee").val()) || 0,
        gstPercentage: parseFloat($("#gstPercentage").val()) || 0,
    };

    if (payload.platformCommission < 0 || payload.platformCommission > 100) {
        showToast(0, "Platform commission must be between 0 and 100.");
        return;
    };

    if (payload.cancellationFee < 0 || payload.cancellationFee > 100) {
        showToast(0, "Cancellation Fee must be between 0 and 100.");
        return;
    };

    if (payload.gstPercentage < 0 || payload.gstPercentage > 100) {
        showToast(0, "GST percentage must be between 0 and 100.");
        return;
    };

    postAjaxCall("/update-pricing", payload, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 1) {
            loadPricingDetails();
        } else if (response.flag === 8) {
            window.location.reload();
        };
    });
});

function loadPricingDetails() {
    postAjaxCall("/pricing-details", {}, function (response) {
        if (response.flag === 1 && response.data) {
            const p = response.data;
            $("#basePrice").val(p.basePrice || 0);
            $("#perKmCharge").val(p.perKmCharge || 0);
            $("#platformCommission").val(p.platformCommission || 10);
            $("#cancellationFee").val(p.cancellationFee || 0);
            $("#gstPercentage").val(p.gstPercentage || 18);
        };
    });
};