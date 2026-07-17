$(document).ready(function () {
    fetchAllReviewList();
});

$(document).on("click", ".review-rating-filter", function () {
    const rating = $(this).data('rating');
    const ratingText = $(this).data('rating-text');

    $("#clear-rating-filter").removeClass("d-none");
    $("#rating-filter-btn .filter-data").text(ratingText).addClass("active");
    $("#rating-filter-btn .hr-line-sm").addClass("active");

    fetchAllReviewList({ rating: rating });
});

$(document).on("click", "#clear-rating-filter", function () {
    $("#clear-rating-filter").addClass("d-none");
    $("#rating-filter-btn .filter-data").text("").removeClass("active");
    $("#rating-filter-btn .hr-line-sm").removeClass("active");

    fetchAllReviewList({ rating: "" });
});

$(document).on("click", "#reset-review-filters", function () {
    $("#reset-review-filters").addClass("d-none");
    $("#rating-filter-btn .filter-data").removeClass("active").text('');
    $("#rating-filter-btn .hr-line-sm").removeClass("active");

    $("#clear-rating-filter").addClass("d-none");

    fetchAllReviewList({ rating: "" });
});

$(document).on("click", ".view-review-details", function () {
    const reviewId = $(this).data("review-id");
    if (!reviewId) {
        showToast(0, "Invalid review Id");
        return;
    };

    /* RESET OLD DATA */
    $("#reviews-modal #review_owner_name").text("-");
    $("#reviews-modal #review_mechanic_name").text("-");
    $("#reviews-modal #review_service_name").text("-");
    $("#reviews-modal #review_rating").empty();
    $("#reviews-modal #review_description").text("-");
    $("#reviews-modal #review_date").text("-");

    postAjaxCall("/review-details", { reviewId: reviewId }, function (response) {
        if (response.flag !== 1) {
            showToast(response.flag, response.msg);
            return;
        };

        const review = response.data;

        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= (review?.rating || 0)) {
                starsHtml += '<i class="fa-solid fa-star text-warning"></i>';
            } else {
                starsHtml += '<i class="fa-regular fa-star text-warning"></i>';
            }
        }

        $("#reviews-modal #review_owner_name").text(review?.ownerDetails?.fullName || "-");
        $("#reviews-modal #review_mechanic_name").text(review?.mechanicDetails?.fullName || "-");
        $("#reviews-modal #review_service_name").text(review?.serviceDetails?.fullName || "-");
        $("#reviews-modal #review_rating").html(starsHtml);
        $("#reviews-modal #review_description").text(review?.description || "-");
        $("#reviews-modal #review_date").text(formatDate(review?.createdAt) || "-");

        $("#reviews-modal").modal("show");
    });
});

function fetchAllReviewList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/review-list", "review-list-table-data");
    toggleResetButtonVisibility("#reset-review-filters", "#review-filter-section");
};
