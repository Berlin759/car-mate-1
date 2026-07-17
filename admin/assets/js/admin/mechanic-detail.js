$(document).ready(function () {
    // Update Mechanic Status
    $(document).on("click", "#update-mechanic-status", function () {
        const mechanicId = $("#mechanic-id").val();
        const status = $("#mechanic-status-select").val();

        if (!mechanicId) {
            showToast(0, "Invalid mechanic Id");
            return;
        };

        if (!status) {
            showToast(0, "Please select a status.");
            return;
        };

        const payload = {
            mechanicId: mechanicId,
            status: parseInt(status),
        };

        postAjaxCall("/suspend-mechanic", payload, function (response) {
            showToast(response.flag, response.msg);
            if (response.flag === 8) {
                window.location.reload();
            };
        });
    });
});
