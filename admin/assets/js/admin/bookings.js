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

$(document).on("click", ".booking_details_show", function () {
    return;
    const bookingId = $(this).data("booking-id");
    if (!bookingId) {
        showToast(0, "Invalid booking Id");
        return;
    };

    /* RESET OLD DATA */
    $("#booking_details_body #booking_trx").text("-");
    $("#booking_details_body #booking_guest_name").text("-");
    $("#booking_details_body #booking_room_type").text("-");
    $("#booking_details_body #booking_check_in").text("-");
    $("#booking_details_body #booking_check_out").text("-");
    $("#booking_details_body #booking_status").text("-");
    $("#booking_details_body #booking_trx_status").text("-");

    postAjaxCall("/booking-details", { bookingId: bookingId }, function (response) {
        if (response.flag !== 1) {
            showToast(response.flag, response.msg);
            return;
        };

        const booking = response.data;

        /* BOOKING STATUS */
        let statusText = "Confirmed";
        let statusClass = "alert-success";

        if (parseInt(booking?.status) === 1) {
            statusText = "Pending";
            statusClass = "alert-pending";
        } else if (parseInt(booking?.status) === 3) {
            statusText = "Cancelled";
            statusClass = "alert-danger";
        };

        /* TRANSACTION STATUS */
        let statusTrxText = "Pending";
        let statusTrxClass = "alert-pending";

        if (parseInt(booking?.transactionDetails?.status) === 2) {
            statusTrxText = "Paid";
            statusTrxClass = "alert-accept";
        } else if (parseInt(booking?.transactionDetails?.status) === 3) {
            statusTrxText = "Failed";
            statusTrxClass = "alert-gray";
        } else if (parseInt(booking?.transactionDetails?.status) === 4) {
            statusTrxText = "Refunded";
            statusTrxClass = "alert-end";
        };

        /* SET DATA */
        $("#booking_details_body #booking_trx").text("Booking Id: " + booking?._id || "-");
        $("#booking_details_body #booking_guest_name").text(booking?.userDetails?.fullName || "-");
        $("#booking_details_body #booking_check_in").text(formatDate(booking?.checkIn) || "-");
        $("#booking_details_body #booking_check_out").text(formatDate(booking?.checkOut) || "-");

        $("#booking_status")
            .text(statusText)
            .removeClass("alert-success alert-danger")
            .addClass(statusClass);

        $("#booking_trx_status")
            .text(statusTrxText)
            .removeClass("alert-success alert-danger")
            .addClass(statusTrxClass);

        /* OPEN MODAL */
        $("#booking_detail_modal").modal("show");
    });
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