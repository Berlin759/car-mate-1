$(document).ready(function () {
    fetchAllTransactionList();
});

// Transaction Status Filter Object
$(document).on("click", ".transaction-status-filter", function () {
    const status = $(this).data('status');
    const statusText = $(this).data('status-text');

    $("#clear-status-filter").removeClass("d-none");
    $("#status-filter-btn .filter-data").text(statusText).addClass("active");
    $("#status-filter-btn .hr-line-sm").addClass("active");

    fetchAllTransactionList({ status: status });
});

$(document).on("click", "#clear-status-filter", function () {
    $("#clear-status-filter").addClass("d-none");
    $("#status-filter-btn .filter-data").text("").removeClass("active");
    $("#status-filter-btn .hr-line-sm").removeClass("active");

    fetchAllTransactionList({ status: "" });
});

// Payout Status Filter Object
$(document).on("click", ".payout-status-filter", function () {
    const status = $(this).data('status');
    const statusText = $(this).data('status-text');

    $("#clear-payout-status-filter").removeClass("d-none");
    $("#payout-status-filter-btn .filter-data").text(statusText).addClass("active");
    $("#payout-status-filter-btn .hr-line-sm").addClass("active");

    fetchAllTransactionList({ payoutStatus: status });
});

$(document).on("click", "#clear-payout-status-filter", function () {
    $("#clear-payout-status-filter").addClass("d-none");
    $("#payout-status-filter-btn .filter-data").text("").removeClass("active");
    $("#payout-status-filter-btn .hr-line-sm").removeClass("active");

    fetchAllTransactionList({ payoutStatus: "" });
});

$(document).on("click", "#reset-transaction-filters", function () {
    $("#reset-transaction-filters").addClass("d-none");

    // Transaction Status
    $("#clear-status-filter").addClass("d-none");
    $("#status-filter-btn .filter-data").removeClass("active").text('');
    $("#status-filter-btn .hr-line-sm").removeClass("active");

    $("#clear-payout-status-filter").addClass("d-none");
    $("#payout-status-filter-btn .filter-data").removeClass("active").text('');
    $("#payout-status-filter-btn .hr-line-sm").removeClass("active");

    fetchAllTransactionList({ status: "", payoutStatus: "" });
});

function fetchAllTransactionList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/transaction-list", "transaction-list-table-data");
    toggleResetButtonVisibility("#reset-transaction-filters", "#transaction-filter-section");
};