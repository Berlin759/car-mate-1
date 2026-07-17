$(document).ready(function () {
    fetchKYCList();
});

$(document).on("click", ".kyc-status-filter", function () {
    const status = $(this).data('status');
    const statusText = $(this).data('status-text');
    $("#clear-status-filter").removeClass("d-none");
    $("#status-filter-btn .filter-data").text(statusText).addClass("active");
    $("#status-filter-btn .hr-line-sm").addClass("active");
    fetchKYCList({ status: status });
});

$(document).on("click", "#clear-status-filter", function () {
    $("#clear-status-filter").addClass("d-none");
    $("#status-filter-btn .filter-data").text("").removeClass("active");
    $("#status-filter-btn .hr-line-sm").removeClass("active");
    fetchKYCList({ status: "" });
});

$(document).on("click", "#reset-kyc-filters", function () {
    $("#reset-kyc-filters").addClass("d-none");
    $("#clear-status-filter").addClass("d-none");
    $("#status-filter-btn .filter-data").text("").removeClass("active");
    $("#status-filter-btn .hr-line-sm").removeClass("active");
    fetchKYCList({ status: "" });
});

$(document).on("click", "#kyc-approve-btn", function () {
    const mechanicId = $(this).data("mechanic-id");
    postAjaxCall("/kyc-approve", { mechanicId: mechanicId }, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 1) {
            $("#kycDetailModal").modal("hide");
            fetchKYCList();
        }
    });
});

$(document).on("click", "#kyc-reject-btn", function () {
    const mechanicId = $(this).data("mechanic-id");
    postAjaxCall("/kyc-reject", { mechanicId: mechanicId }, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 1) {
            $("#kycDetailModal").modal("hide");
            fetchKYCList();
        }
    });
});

function fetchKYCList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/kyc-list", "kyc-list-table-data");
    toggleResetButtonVisibility("#reset-kyc-filters", "#kyc-filter-section");
};