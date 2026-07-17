$(document).ready(function () {
    // Approve KYC
    $(document).on("click", "#kyc-approve-btn", function () {
        const mechanicId = $("#kyc-mechanic-id").val();
        if (!mechanicId) {
            showToast(0, "Invalid mechanic Id");
            return;
        };

        postAjaxCall("/kyc-approve", { mechanicId: mechanicId }, function (response) {
            showToast(response.flag, response.msg);
            if (response.flag === 1) {
                setTimeout(function () {
                    window.location.reload();
                }, 1000);
            } else if (response.flag === 8) {
                window.location.reload();
            };
        });
    });

    // Confirm Reject KYC
    $(document).on("click", "#confirm-reject-kyc", function () {
        const mechanicId = $("#kyc-mechanic-id").val();
        const rejectReason = $("#reject-reason").val()?.trim();

        if (!mechanicId) {
            showToast(0, "Invalid mechanic Id");
            return;
        };

        if (!rejectReason) {
            showToast(0, "Please enter a rejection reason.");
            return;
        };

        postAjaxCall("/kyc-reject", { mechanicId: mechanicId, rejectReason: rejectReason }, function (response) {
            showToast(response.flag, response.msg);
            if (response.flag === 1) {
                $("#rejectKycModal").modal("hide");
                setTimeout(function () {
                    window.location.reload();
                }, 1000);
            } else if (response.flag === 8) {
                window.location.reload();
            };
        });
    });
});
