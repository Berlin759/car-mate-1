$(document).ready(function () {
    loadPricingDetails();
});

$(document).on("submit", "#pricing-form", function (e) {
    e.preventDefault();

    const payload = {
        basePrice: parseFloat($("#basePrice").val()) || 0,
        perKmCharge: parseFloat($("#perKmCharge").val()) || 0,
        peakHourSurcharge: parseFloat($("#peakHourSurcharge").val()) || 0,
        peakHourStart: $("#peakHourStart").val(),
        peakHourEnd: $("#peakHourEnd").val(),
        eveningPeakStart: $("#eveningPeakStart").val(),
        eveningPeakEnd: $("#eveningPeakEnd").val(),
        weekendSurcharge: parseFloat($("#weekendSurcharge").val()) || 0,
        platformCommission: parseFloat($("#platformCommission").val()) || 0,
        minimumFare: parseFloat($("#minimumFare").val()) || 0,
        cancellationFee: parseFloat($("#cancellationFee").val()) || 0,
        gstPercentage: parseFloat($("#gstPercentage").val()) || 0,
    };

    if (payload.platformCommission < 0 || payload.platformCommission > 100) {
        showToast(0, "Platform commission must be between 0 and 100.");
        return;
    }

    if (payload.peakHourSurcharge < 0 || payload.peakHourSurcharge > 100) {
        showToast(0, "Peak-hour surcharge must be between 0 and 100.");
        return;
    }

    if (payload.weekendSurcharge < 0 || payload.weekendSurcharge > 100) {
        showToast(0, "Weekend surcharge must be between 0 and 100.");
        return;
    }

    if (payload.gstPercentage < 0 || payload.gstPercentage > 100) {
        showToast(0, "GST percentage must be between 0 and 100.");
        return;
    }

    postAjaxCall("/update-pricing", payload, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 1) {
            loadPricingDetails();
        } else if (response.flag === 8) {
            window.location.reload();
        }
    });
});

function loadPricingDetails() {
    postAjaxCall("/pricing-details", {}, function (response) {
        if (response.flag === 1 && response.data) {
            const p = response.data;
            $("#basePrice").val(p.basePrice || 0);
            $("#perKmCharge").val(p.perKmCharge || 0);
            $("#peakHourSurcharge").val(p.peakHourSurcharge || 0);
            $("#peakHourStart").val(p.peakHourStart || "07:00");
            $("#peakHourEnd").val(p.peakHourEnd || "10:00");
            $("#eveningPeakStart").val(p.eveningPeakStart || "17:00");
            $("#eveningPeakEnd").val(p.eveningPeakEnd || "20:00");
            $("#weekendSurcharge").val(p.weekendSurcharge || 0);
            $("#platformCommission").val(p.platformCommission || 10);
            $("#minimumFare").val(p.minimumFare || 0);
            $("#cancellationFee").val(p.cancellationFee || 0);
            $("#gstPercentage").val(p.gstPercentage || 18);
        };
    });
};