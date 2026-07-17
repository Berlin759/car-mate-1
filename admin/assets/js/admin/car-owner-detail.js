$(document).ready(function () {
    // Update Owner Status
    $(document).on("click", "#update-owner-status", function () {
        const ownerId = $("#owner-id").val();
        const status = $("#owner-status-select").val();

        if (!ownerId) {
            showToast(0, "Invalid owner Id");
            return;
        };

        if (!status) {
            showToast(0, "Please select a status.");
            return;
        };

        const payload = {
            ownerId: ownerId,
            status: parseInt(status),
        };

        postAjaxCall("/suspend-owner", payload, function (response) {
            showToast(response.flag, response.msg);
            if (response.flag === 8) {
                window.location.reload();
            };
        });
    });
});
