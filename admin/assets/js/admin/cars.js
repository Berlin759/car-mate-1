$(document).ready(function () {
    fetchAllCarsList();
});

// Status Filter Object
$(document).on("click", ".car-status-filter", function () {
    const status = $(this).data('status');
    const statusText = $(this).data('status-text');

    $("#clear-status-filter").removeClass("d-none");
    $("#status-filter-btn .filter-data").text(statusText).addClass("active");
    $("#status-filter-btn .hr-line-sm").addClass("active");

    fetchAllCarsList({ status: status });
});

$(document).on("click", "#clear-status-filter", function () {
    $("#clear-status-filter").addClass("d-none");
    $("#status-filter-btn .filter-data").text("").removeClass("active");
    $("#status-filter-btn .hr-line-sm").removeClass("active");

    fetchAllCarsList({ status: "" });
});

$(document).on("click", "#reset-car-filters", function () {
    $("#reset-car-filters").addClass("d-none");

    // Status
    $("#clear-status-filter").addClass("d-none");
    $("#status-filter-btn .filter-data").text("").removeClass("active");
    $("#status-filter-btn .hr-line-sm").removeClass("active");

    fetchAllCarsList({ status: "" });
});

function fetchAllCarsList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/car-list", "car-list-table-data");
    toggleResetButtonVisibility("#reset-car-filters", "#car-filter-section");
};