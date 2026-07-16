$(document).ready(function () {
    fetchDisputeList();
});

$(document).on("click", ".dispute-status-filter", function () {
    const status = $(this).data('status');
    const statusText = $(this).data('status-text');
    $("#clear-status-filter").removeClass("d-none");
    $("#status-filter-btn .filter-data").text(statusText).addClass("active");
    $("#status-filter-btn .hr-line-sm").addClass("active");
    fetchDisputeList({ status: status });
});

$(document).on("click", "#clear-status-filter", function () {
    $("#clear-status-filter").addClass("d-none");
    $("#status-filter-btn .filter-data").text("").removeClass("active");
    $("#status-filter-btn .hr-line-sm").removeClass("active");
    fetchDisputeList({ status: "" });
});

$(document).on("click", "#reset-dispute-filters", function () {
    $("#reset-dispute-filters").addClass("d-none");
    $("#clear-status-filter").addClass("d-none");
    $("#status-filter-btn .filter-data").text("").removeClass("active");
    $("#status-filter-btn .hr-line-sm").removeClass("active");
    fetchDisputeList({ status: "" });
});

$(document).on("click", ".resolve-dispute-btn", function () {
    const disputeId = $(this).data("dispute-id");
    if (!disputeId) { showToast(0, "Invalid dispute ID"); return; }
    $("#resolve-dispute-id").val(disputeId);
    $("#resolve-resolution").val("");
    $("#resolve-refund").val(0);
    $("#resolve-penalty").val(0);
    $("#resolveDisputeModal").modal("show");
});

$(document).on("click", "#confirm-resolve-dispute", function () {
    const disputeId = $("#resolve-dispute-id").val();
    const resolution = $("#resolve-resolution").val().trim();
    const refundAmount = $("#resolve-refund").val();
    const penaltyAmount = $("#resolve-penalty").val();

    if (!resolution) {
        showToast(0, "Resolution notes are required.");
        return;
    }

    postAjaxCall("/resolve-dispute", {
        disputeId: disputeId,
        resolution: resolution,
        refundAmount: refundAmount,
        penaltyAmount: penaltyAmount,
    }, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 1) {
            $("#resolveDisputeModal").modal("hide");
            fetchDisputeList();
        }
    });
});

function fetchDisputeList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/dispute-list", "dispute-list-table-data");
    toggleResetButtonVisibility("#reset-dispute-filters", "#dispute-filter-section");
};