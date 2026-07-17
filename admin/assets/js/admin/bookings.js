$(document).ready(function () {
    fetchAllBookingList();
});

// Filter Object
$(document).on("click", ".booking-status-filter", function () {
    const status = $(this).data('status');
    const statusText = $(this).data('status-text');

    $("#clear-status-filter").removeClass("d-none");
    $("#status-filter-btn .filter-data").text(statusText).addClass("active");
    $("#status-filter-btn .hr-line-sm").addClass("active");

    fetchAllBookingList({ status: status });
});

$(document).on("click", "#clear-status-filter", function () {
    $("#clear-status-filter").addClass("d-none");
    $("#status-filter-btn .filter-data").text("").removeClass("active");
    $("#status-filter-btn .hr-line-sm").removeClass("active");

    fetchAllBookingList({ status: "" });
});

$(document).on("click", "#reset-booking-filters", function () {
    $("#reset-booking-filters").addClass("d-none");
    $("#status-filter-btn .filter-data").removeClass("active").text('');
    $("#status-filter-btn .hr-line-sm").removeClass("active");

    $("#clear-status-filter").addClass("d-none");

    fetchAllBookingList({ status: "" });
});

$(document).on("click", ".booking_delete", function () {
    const bookingId = $(this).data("booking-id");
    if (!bookingId) {
        showToast(0, "Invalid booking Id");
        return;
    };

    postAjaxCall("/booking-delete", { bookingId: bookingId }, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 1) {
            filterData("/booking-list", "booking-list-table-data");
        };
    });
});

function fetchAllBookingList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/booking-list", "booking-list-table-data");
    toggleResetButtonVisibility("#reset-booking-filters", "#booking-filter-section");
};