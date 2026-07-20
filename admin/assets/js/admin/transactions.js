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

// Payment Method Filter Object
$(document).on("click", ".transaction-method-filter", function () {
    const paymentMethod = $(this).data('method');
    const paymentMethodText = $(this).data('method-text');

    $("#clear-method-filter").removeClass("d-none");
    $("#method-filter-btn .filter-data").text(paymentMethodText).addClass("active");
    $("#method-filter-btn .hr-line-sm").addClass("active");

    fetchAllTransactionList({});
});

$(document).on("click", "#clear-method-filter", function () {
    $("#clear-method-filter").addClass("d-none");
    $("#method-filter-btn .filter-data").text("").removeClass("active");
    $("#method-filter-btn .hr-line-sm").removeClass("active");

    fetchAllTransactionList({});
});

$(document).on("click", "#reset-transaction-filters", function () {
    $("#reset-transaction-filters").addClass("d-none");

    // Transaction Status
    $("#clear-status-filter").addClass("d-none");
    $("#status-filter-btn .filter-data").removeClass("active").text('');
    $("#status-filter-btn .hr-line-sm").removeClass("active");

    // Payment Method
    $("#clear-method-filter").addClass("d-none");
    $("#method-filter-btn .filter-data").removeClass("active").text('');
    $("#method-filter-btn .hr-line-sm").removeClass("active");

    fetchAllTransactionList({ status: "" });
});

$(document).on("click", ".transaction_details_show", function () {
    const transactionId = $(this).data("transaction-id");
    if (!transactionId) {
        showToast(0, "Invalid transaction Id");
        return;
    };

    /* RESET OLD DATA */
    $("#transaction_details_body #booking_id").text("-");
    $("#transaction_details_body #transaction_id").text("-");
    $("#transaction_details_body #transaction_total_amount").text("-");
    $("#transaction_details_body #transaction_guest_name").text("-");
    $("#transaction_details_body #transaction_pay_method").text("-");
    $("#transaction_details_body #transaction_date").text("-");
    $("#transaction_details_body #booking_total_amount").text("-");
    $("#transaction_details_body #booking_discount_amount").text("-");
    $("#transaction_details_body #booking_final_amount").text("-");
    $("#transaction_details_body #transaction_status").text("-");

    postAjaxCall("/transaction-details", { transactionId: transactionId }, function (response) {
        if (response.flag !== 1) {
            showToast(response.flag, response.msg);
            return;
        };

        const transaction = response.data;

        /* PAYMENT STATUS */
        let statusText = "Pending";
        let statusClass = "alert-pending";

        if (parseInt(transaction?.transactionDetails?.status) === 2) {
            statusText = "Paid";
            statusClass = "alert-accept";
        } else if (parseInt(transaction?.transactionDetails?.status) === 3) {
            statusText = "Failed";
            statusClass = "alert-danger";
        } else if (parseInt(transaction?.transactionDetails?.status) === 4) {
            statusText = "Refunded";
            statusClass = "alert-gray";
        };

        /* SET DATA */
        $("#transaction_details_body #booking_id").text(transaction?.bookingDetails?._id || "-");
        $("#transaction_details_body #transaction_id").text(transaction?._id || "-");
        $("#transaction_details_body #transaction_total_amount").text("₹" + transaction?.totalAmount || 0);
        $("#transaction_details_body #transaction_guest_name").text(transaction?.userDetails?.fullName || "-");
        $("#transaction_details_body #transaction_pay_method").text("Razorpay");
        $("#transaction_details_body #transaction_date").text(formatDate(transaction?.createdAt) || "-");
        $("#transaction_details_body #booking_total_amount").text("₹" + transaction?.bookingDetails?.totalAmount || 0);
        $("#transaction_details_body #booking_discount_amount").text("₹" + transaction?.bookingDetails?.discountAmount || 0);
        $("#transaction_details_body #booking_final_amount").text("₹" + transaction?.bookingDetails?.finalPayAmount || 0);

        $("#transaction_status")
            .text(statusText)
            .removeClass("alert-success alert-danger")
            .addClass(statusClass);

        /* OPEN MODAL */
        $("#payment_detail_modal").modal("show");
    });
});

$(document).on("click", ".transaction_delete", function () {
    const transactionId = $(this).data("transaction-id");
    if (!transactionId) {
        showToast(0, "Invalid transaction Id");
        return;
    };

    postAjaxCall("/transaction-delete", { transactionId: transactionId }, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 1) {
            filterData("/transaction-list", "transaction-list-table-data");
        };
    });
});

function fetchAllTransactionList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/transaction-list", "transaction-list-table-data");
    toggleResetButtonVisibility("#reset-transaction-filters", "#transaction-filter-section");
};