const keyName = [
    'Backspace',
    'Delete',
    'Tab',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End'
];

$(document).ready(function () {
    loadPricingDetails();
    updatePlatformFeeUI();
});

$(document).on('change', '#platformFeeType', function () {
    updatePlatformFeeUI();
});

$(document).on('keydown', '.amount-input, .percentage-input', function (e) {

    const key = e.key;
    const value = $(this).val();

    if (e.ctrlKey || e.metaKey || keyName.includes(key)) {
        return;
    };

    if (key === '.') {
        if (value.includes('.')) {
            e.preventDefault();
        };

        return;
    };

    if (!/^[0-9]$/.test(key)) {
        e.preventDefault();
    };
});

$(document).on('input', '.amount-input, .percentage-input', function () {
    let value = $(this).val();

    // Remove all invalid characters
    value = value.replace(/[^0-9.]/g, '');

    // Keep only first decimal point
    const firstDot = value.indexOf('.');

    if (firstDot !== -1) {
        value = value.substring(0, firstDot + 1) + value.substring(firstDot + 1).replace(/\./g, '');
    };

    // Maximum 2 digits after decimal
    if (value.includes('.')) {
        const parts = value.split('.');

        value = parts[0] + '.' + parts[1].substring(0, 2);
    };

    // Percentage maximum 100
    if ($(this).hasClass('percentage-input')) {
        if (value !== '' && parseFloat(value) > 100) {
            value = '100';
        };
    };

    $(this).val(value);
});

$(document).on("submit", "#pricing-form", function (e) {
    e.preventDefault();

    const platformFeeType = parseInt($("#platformFeeType").val(), 10);
    const platformFeeValue = $("#platformFee").val().trim();
    const gstValue = $("#gstPercentage").val().trim();
    const cancellationValue = $("#cancellationFee").val().trim();

    if (![1, 2].includes(platformFeeType)) {
        showToast(0, "Invalid platform fee type.");
        return;
    };

    if (platformFeeValue === "") {
        showToast(0, "Please enter platform fee.");
        $("#platformFee").focus();
        return;
    };

    const platformFee = parseFloat(platformFeeValue);

    if (!Number.isFinite(platformFee) || platformFee < 0) {
        showToast(0, "Platform fee must be a valid number.");
        $("#platformFee").focus();
        return;
    };

    if (platformFeeType === 1 && platformFee > 100) {
        showToast(0, "Platform fee must be between 0 and 100.");
        $("#platformFee").focus();
        return;
    };

    if (!/^\d+(\.\d{1,2})?$/.test(platformFeeValue)) {
        showToast(0, "Platform fee can have maximum 2 decimal places.");
        $("#platformFee").focus();
        return;
    };

    if (gstValue === "") {
        showToast(0, "Please enter GST percentage.");
        $("#gstPercentage").focus();
        return;
    };

    const gstPercentage = parseFloat(gstValue);

    if (!Number.isFinite(gstPercentage) || gstPercentage < 0 || gstPercentage > 100) {
        showToast(0, "GST percentage must be between 0 and 100.");
        $("#gstPercentage").focus();
        return;
    };

    if (!/^\d+(\.\d{1,2})?$/.test(gstValue)) {
        showToast(0, "GST percentage can have maximum 2 decimal places.");
        $("#gstPercentage").focus();
        return;
    };

    if (cancellationValue === "") {
        showToast(0, "Please enter cancellation fee.");
        $("#cancellationFee").focus();
        return;
    };

    const cancellationFee = parseFloat(cancellationValue);

    if (!Number.isFinite(cancellationFee) || cancellationFee < 0 || cancellationFee > 100) {
        showToast(0, "Cancellation fee must be between 0 and 100.");
        $("#cancellationFee").focus();
        return;
    };

    if (!/^\d+(\.\d{1,2})?$/.test(cancellationValue)) {
        showToast(0, "Cancellation fee can have maximum 2 decimal places.");
        $("#cancellationFee").focus();
        return;
    };

    const payload = {
        platformFee: platformFee,
        platformFeeType: platformFeeType,
        gstPercentage: gstPercentage,
        cancellationFee: cancellationFee,
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

            $("#platformFee").val(p.platformFee ?? 5);
            $("#platformFeeType").val(p.platformFeeType ?? 1);
            $("#gstPercentage").val(p.gstPercentage ?? 18);
            $("#cancellationFee").val(p.cancellationFee ?? 3);

            updatePlatformFeeUI();
        };
    });
};

function updatePlatformFeeUI() {
    const type = parseInt($('#platformFeeType').val(), 10);

    const $label = $('#platformFeeLabel');
    const $input = $('#platformFee');

    if (type === 1) {
        // Percentage
        $label.text('Platform Fee (%)');

        $input.removeClass('amount-input').addClass('percentage-input').attr('min', '0').attr('max', '100').val(5);
    } else if (type === 2) {
        // Fixed Amount
        $label.html('Platform Fee (₹)');

        $input.removeClass('percentage-input').addClass('amount-input').attr('min', '0').removeAttr('max').val(25);
    };
};