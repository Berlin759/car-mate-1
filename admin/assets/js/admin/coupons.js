$(document).ready(function () {
    fetchCouponList();
    initCouponValidation();
});

$(document).on("hide.bs.modal", "#couponModal", function () {
    resetCouponModal();
});

$(document).on("click", "#add_new_coupon_btn", function () {
    resetCouponModal();
});

$(document).on("click", "#save_coupon", function () {
    const code = $("#coupon_code").val().trim();
    const description = $("#coupon_description").val().trim();
    const discountType = $("#coupon_discount_type").val();
    const discountValue = $("#coupon_discount_value").val().trim();
    const minOrderAmount = $("#coupon_min_order_amount").val().trim();
    const maxDiscountAmount = $("#coupon_max_discount_amount").val().trim();
    const usageLimit = $("#coupon_usage_limit").val().trim();
    const expiryDate = $("#coupon_expiry_date").val();

    let validationMessage = "";
    if (!code) {
        validationMessage = "Coupon code is required.";
    } else if (!/^[A-Z0-9]+$/i.test(code)) {
        validationMessage = "Coupon code must contain only alphanumeric characters.";
    } else if (!discountValue) {
        validationMessage = "Discount value is required.";
    } else if (isNaN(discountValue) || parseFloat(discountValue) <= 0) {
        validationMessage = "Discount value must be a positive number.";
    } else if (discountType === "percentage" && parseFloat(discountValue) > 100) {
        validationMessage = "Percentage discount value cannot be more than 100.";
    } else if (minOrderAmount && (isNaN(minOrderAmount) || parseFloat(minOrderAmount) < 0)) {
        validationMessage = "Min order amount must be a positive number.";
    } else if (maxDiscountAmount && (isNaN(maxDiscountAmount) || parseFloat(maxDiscountAmount) < 0)) {
        validationMessage = "Max discount amount must be a positive number.";
    } else if (usageLimit && (isNaN(usageLimit) || parseInt(usageLimit) < 0)) {
        validationMessage = "Usage limit must be a positive integer.";
    } else if (!expiryDate) {
        validationMessage = "Expiry date is required.";
    } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expDate = new Date(expiryDate);
        if (expDate < today) {
            validationMessage = "Expiry date cannot be in the past.";
        }
    }

    if (validationMessage !== "") {
        showToast(0, validationMessage);
        return;
    };

    const payload = {
        code: code,
        description: description,
        discountType: discountType,
        discountValue: discountValue,
        minOrderAmount: minOrderAmount,
        maxDiscountAmount: maxDiscountAmount,
        usageLimit: usageLimit,
        expiryDate: expiryDate,
    };

    postAjaxCall("/add-coupon", payload, function (response) {
        showToast(response.flag, response.msg);

        if (response.flag === 1) {
            $("#couponModal").modal("hide");
            fetchCouponList();
        };
    });
});

$(document).on("click", ".edit-coupon", function () {
    const couponId = $(this).data("coupon-id");
    if (!couponId) {
        showToast(0, "Invalid Coupon ID");
        return;
    };

    postAjaxCall("/coupon-details", { couponId: couponId }, function (response) {
        if (response.flag !== 1) {
            showToast(response.flag, response.msg);
            return;
        };

        const coupon = response.data;

        resetCouponModal();

        $("#couponModalLabel").text("Edit Coupon");
        $("#save_coupon").addClass("d-none");
        $("#update_coupon").removeClass("d-none");

        $("#coupon_id").val(coupon._id);
        $("#coupon_code").val(coupon.code);
        $("#coupon_description").val(coupon.description);
        $("#coupon_discount_type").val(coupon.discountType);
        $("#coupon_discount_value").val(coupon.discountValue);
        $("#coupon_min_order_amount").val(coupon.minOrderAmount);
        $("#coupon_max_discount_amount").val(coupon.maxDiscountAmount);
        $("#coupon_usage_limit").val(coupon.usageLimit);
        
        if (coupon.expiryDate) {
            const expDate = new Date(coupon.expiryDate);
            const yyyy = expDate.getFullYear();
            const mm = String(expDate.getMonth() + 1).padStart(2, '0');
            const dd = String(expDate.getDate()).padStart(2, '0');
            $("#coupon_expiry_date").val(`${yyyy}-${mm}-${dd}`);
        }

        $("#couponModal").modal("show");
    });
});

$(document).on("click", "#update_coupon", function () {
    const couponId = $("#coupon_id").val();
    const code = $("#coupon_code").val().trim();
    const description = $("#coupon_description").val().trim();
    const discountType = $("#coupon_discount_type").val();
    const discountValue = $("#coupon_discount_value").val().trim();
    const minOrderAmount = $("#coupon_min_order_amount").val().trim();
    const maxDiscountAmount = $("#coupon_max_discount_amount").val().trim();
    const usageLimit = $("#coupon_usage_limit").val().trim();
    const expiryDate = $("#coupon_expiry_date").val();

    let validationMessage = "";
    if (!couponId) {
        validationMessage = "Coupon ID is required.";
    } else if (!code) {
        validationMessage = "Coupon code is required.";
    } else if (!/^[A-Z0-9]+$/i.test(code)) {
        validationMessage = "Coupon code must contain only alphanumeric characters.";
    } else if (!discountValue) {
        validationMessage = "Discount value is required.";
    } else if (isNaN(discountValue) || parseFloat(discountValue) <= 0) {
        validationMessage = "Discount value must be a positive number.";
    } else if (discountType === "percentage" && parseFloat(discountValue) > 100) {
        validationMessage = "Percentage discount value cannot be more than 100.";
    } else if (minOrderAmount && (isNaN(minOrderAmount) || parseFloat(minOrderAmount) < 0)) {
        validationMessage = "Min order amount must be a positive number.";
    } else if (maxDiscountAmount && (isNaN(maxDiscountAmount) || parseFloat(maxDiscountAmount) < 0)) {
        validationMessage = "Max discount amount must be a positive number.";
    } else if (usageLimit && (isNaN(usageLimit) || parseInt(usageLimit) < 0)) {
        validationMessage = "Usage limit must be a positive integer.";
    } else if (!expiryDate) {
        validationMessage = "Expiry date is required.";
    }

    if (validationMessage !== "") {
        showToast(0, validationMessage);
        return;
    };

    const payload = {
        couponId: couponId,
        code: code,
        description: description,
        discountType: discountType,
        discountValue: discountValue,
        minOrderAmount: minOrderAmount,
        maxDiscountAmount: maxDiscountAmount,
        usageLimit: usageLimit,
        expiryDate: expiryDate,
    };

    postAjaxCall("/update-coupon", payload, function (response) {
        showToast(response.flag, response.msg);

        if (response.flag === 1) {
            $("#couponModal").modal("hide");
            fetchCouponList();
        };
    });
});

$(document).on("click", ".delete-coupon", function () {
    const couponId = $(this).data("coupon-id");
    if (!couponId) {
        showToast(0, "Invalid Coupon ID");
        return;
    };

    if (!confirm("Are you sure you want to delete this coupon?")) return;

    postAjaxCall("/delete-coupon", { couponId: couponId }, function (response) {
        showToast(response.flag, response.msg);

        if (response.flag === 1) {
            fetchCouponList();
        };
    });
});

$(document).on("change", ".coupon-status-select", function () {
    const couponId = $(this).data("coupon-id");
    const isActive = $(this).val();

    if (!couponId) {
        showToast(0, "Invalid Coupon ID");
        return;
    };

    postAjaxCall("/toggle-coupon-status", { couponId: couponId, isActive: isActive }, function (response) {
        showToast(response.flag, response.msg);

        if (response.flag === 1) {
            fetchCouponList();
        };
    });
});

function fetchCouponList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/coupon-list", "coupon-list-table-data");
};

function initCouponValidation() {
    $(document).on("input", "#coupon_code", function () {
        this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    });

    $(document).on("keypress", "#couponModal input", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            if ($("#save_coupon").hasClass("d-none")) {
                $("#update_coupon").trigger("click");
            } else {
                $("#save_coupon").trigger("click");
            }
        };
    });
};

function resetCouponModal() {
    $("#coupon_id").val("");
    $("#coupon_code").val("");
    $("#coupon_description").val("");
    $("#coupon_discount_type").val("percentage");
    $("#coupon_discount_value").val("");
    $("#coupon_min_order_amount").val("0");
    $("#coupon_max_discount_amount").val("0");
    $("#coupon_usage_limit").val("0");
    $("#coupon_expiry_date").val("");

    $("#couponModalLabel").text("Add Coupon");
    $("#save_coupon").removeClass("d-none");
    $("#update_coupon").addClass("d-none");
};
