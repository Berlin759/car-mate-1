$(document).ready(function () {
    fetchChatReportList();
});

$(document).on("click", ".report-status-filter", function () {
    const status = $(this).data('status');
    const statusText = $(this).data('status-text');
    $("#clear-status-filter").removeClass("d-none");
    $("#status-filter-btn .filter-data").text(statusText).addClass("active");
    $("#status-filter-btn .hr-line-sm").addClass("active");
    fetchChatReportList({ status: status });
});

$(document).on("click", "#clear-status-filter", function () {
    $("#clear-status-filter").addClass("d-none");
    $("#status-filter-btn .filter-data").text("").removeClass("active");
    $("#status-filter-btn .hr-line-sm").removeClass("active");
    fetchChatReportList({ status: "" });
});

$(document).on("click", "#reset-report-filters", function () {
    $("#reset-report-filters").addClass("d-none");
    $("#clear-status-filter").addClass("d-none");
    $("#status-filter-btn .filter-data").text("").removeClass("active");
    $("#status-filter-btn .hr-line-sm").removeClass("active");
    fetchChatReportList({ status: "" });
});

$(document).on("click", ".resolve-report-btn", function () {
    const reportId = $(this).data("report-id");
    const reportStatus = $(this).data("report-status") || 1;

    if (!reportId) {
        showToast(0, "Invalid report ID");
        return;
    };

    $("#resolve-report-id").val(reportId);
    $("#resolve-report-status").val(reportStatus);
    $("#resolve-admin-notes").val("");
    $("#resolveReportModal").modal("show");
});

$(document).on("click", "#confirm-resolve-report", function () {
    const reportId = $("#resolve-report-id").val();
    const status = $("#resolve-report-status").val();
    const adminNotes = $("#resolve-admin-notes").val().trim();

    if (!reportId) {
        showToast(0, "Report ID is required.");
        return;
    };

    const payload = {
        reportId: reportId,
        status: status,
        adminNotes: adminNotes,
    };

    postAjaxCall("/resolve-chat-report", payload, function (response) {
        showToast(response.flag, response.msg);

        if (response.flag === 1) {
            $("#resolveReportModal").modal("hide");
            fetchChatReportList();
        };
    });
});

function fetchChatReportList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/chat-report-list", "chat-report-list-table-data");
    toggleResetButtonVisibility("#reset-report-filters", "#chat-report-filter-section");
};