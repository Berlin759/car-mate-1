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

function fetchKYCList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/kyc-list", "kyc-list-table-data");
    toggleResetButtonVisibility("#reset-kyc-filters", "#kyc-filter-section");
}

$(document).on("click", ".view-kyc-details", function () {
    const mechanicId = $(this).data("mechanic-id");
    if (!mechanicId) { showToast(0, "Invalid mechanic ID"); return; }

    postAjaxCall("/kyc-details", { mechanicId: mechanicId }, function (response) {
        if (response.flag !== 1) { showToast(response.flag, response.msg); return; }
        const kyc = response.data;
        $("#kyc-mechanic-name").text(kyc.mechanicDetails?.fullName || "-");
        $("#kyc-doc-type").text(kyc.documentType || "-");
        $("#kyc-status").text(kyc.status === 1 ? "Pending" : kyc.status === 2 ? "Approved" : "Rejected");
        $("#kyc-submitted").text(kyc.createdAt ? new Date(kyc.createdAt).toLocaleDateString() : "-");
        $("#kyc-doc-number").text(kyc.documentNumber || "-");
        if (kyc.documentImage) {
            $("#kyc-doc-image").html('<img src="' + kyc.documentImage + '" class="img-fluid rounded" style="max-height:200px;">');
        } else {
            $("#kyc-doc-image").text("No image uploaded");
        }
        $("#kyc-approve-btn").data("mechanic-id", mechanicId);
        $("#kyc-reject-btn").data("mechanic-id", mechanicId);
        $("#kycDetailModal").modal("show");
    });
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
