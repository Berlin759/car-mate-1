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

$(document).ready(function () {});

$(document).on('change', 'input[name="ownerPlatformFeeType"]', function () {
    updateOwnerPlatformFeeUI();
});

$(document).on('change', 'input[name="mechanicPlatformFeeType"]', function () {
    updateMechanicPlatformFeeUI();
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

    const evAdminChargeType = parseInt($("#evAdminChargeType").val(), 10);
    const ownerPlatformFeeType = parseInt($('input[name="ownerPlatformFeeType"]:checked').val(), 10);
    const mechanicPlatformFeeType = parseInt($('input[name="mechanicPlatformFeeType"]:checked').val(), 10);
    const ownerPlatformFeeValue = $("#ownerPlatformFee").val().trim();
    const mechanicPlatformFeeValue = $("#mechanicPlatformFee").val().trim();
    const gstValue = $("#gstPercentage").val().trim();
    const cancellationValue = $("#cancellationFee").val().trim();

    if (![1, 2].includes(evAdminChargeType)) {
        showToast(0, "Invalid admin charge available.");
        return;
    };

    if (![1, 2].includes(ownerPlatformFeeType)) {
        showToast(0, "Invalid owner platform fee type.");
        return;
    };

    if (![1, 2].includes(mechanicPlatformFeeType)) {
        showToast(0, "Invalid mechanic platform fee type.");
        return;
    };

    if (ownerPlatformFeeValue === "") {
        showToast(0, "Please enter owner platform fee.");
        $("#ownerPlatformFee").focus();
        return;
    };

    if (mechanicPlatformFeeValue === "") {
        showToast(0, "Please enter mechanic platform fee.");
        $("#mechanicPlatformFee").focus();
        return;
    };

    const ownerPlatformFee = parseFloat(ownerPlatformFeeValue);
    const mechanicPlatformFee = parseFloat(mechanicPlatformFeeValue);

    if (!Number.isFinite(ownerPlatformFee) || ownerPlatformFee < 0) {
        showToast(0, "Owner platform fee must be a valid number.");
        $("#ownerPlatformFee").focus();
        return;
    };

    if (!Number.isFinite(mechanicPlatformFee) || mechanicPlatformFee < 0) {
        showToast(0, "Mechanic Platform fee must be a valid number.");
        $("#mechanicPlatformFee").focus();
        return;
    };

    if (ownerPlatformFeeType === 1 && ownerPlatformFee > 100) {
        showToast(0, "Owner platform fee must be between 0 and 100.");
        $("#ownerPlatformFee").focus();
        return;
    };

    if (mechanicPlatformFeeType === 1 && mechanicPlatformFee > 100) {
        showToast(0, "Mechanic platform fee must be between 0 and 100.");
        $("#mechanicPlatformFee").focus();
        return;
    };

    if (!/^\d+(\.\d{1,2})?$/.test(ownerPlatformFeeValue)) {
        showToast(0, "Owner platform fee can have maximum 2 decimal places.");
        $("#ownerPlatformFee").focus();
        return;
    };

    if (!/^\d+(\.\d{1,2})?$/.test(mechanicPlatformFeeValue)) {
        showToast(0, "Mechanic platform fee can have maximum 2 decimal places.");
        $("#mechanicPlatformFee").focus();
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
        ownerPlatformFee: ownerPlatformFee,
        mechanicPlatformFee: mechanicPlatformFee,
        evAdminChargeType: evAdminChargeType,
        ownerPlatformFeeType: ownerPlatformFeeType,
        mechanicPlatformFeeType: mechanicPlatformFeeType,
        gstPercentage: gstPercentage,
        cancellationFee: cancellationFee,
    };

    postAjaxCall("/update-pricing", payload, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag !== 0) {
            window.location.reload();
        };
    });
});

function updateOwnerPlatformFeeUI() {
    const type = parseInt($('input[name="ownerPlatformFeeType"]:checked').val(), 10);

    const $label = $('#ownerPlatformFeeLabel');
    const $input = $('#ownerPlatformFee');

    if (type === 1) {
        // Percentage
        $label.text('Platform Fee (%)');

        $input.removeClass('amount-input').addClass('percentage-input').attr('min', '0').attr('max', '100').val(5);

        const value = parseFloat($input.val());

        if (Number.isFinite(value) && value > 100) {
            $input.val('100');
        };
    } else if (type === 2) {
        // Fixed Amount
        $label.html('Platform Fee (₹)');

        $input.removeClass('percentage-input').addClass('amount-input').attr('min', '0').removeAttr('max').val(25);
    };
};

function updateMechanicPlatformFeeUI() {
    const type = parseInt($('input[name="mechanicPlatformFeeType"]:checked').val(), 10);

    const $label = $('#mechanicPlatformFeeLabel');
    const $input = $('#mechanicPlatformFee');

    if (type === 1) {
        // Percentage
        $label.text('Platform Fee (%)');

        $input.removeClass('amount-input').addClass('percentage-input').attr('min', '0').attr('max', '100').val(5);

        const value = parseFloat($input.val());

        if (Number.isFinite(value) && value > 100) {
            $input.val('100');
        };
    } else if (type === 2) {
        // Fixed Amount
        $label.html('Platform Fee (₹)');

        $input.removeClass('percentage-input').addClass('amount-input').attr('min', '0').removeAttr('max').val(25);
    };
};