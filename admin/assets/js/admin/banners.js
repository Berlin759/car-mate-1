$(document).ready(function () {
    fetchBannerList();
    initBannerValidation();
});

$(document).on("show.bs.modal", "#addBannerModal", function () {
    $("#banner_title").val("");
    $("#banner_description").val("");
    $("#banner_link").val("");
    $("#banner_sort_order").val(1);
    $("#banner_title_counter").text("0/50");
    $("#banner_desc_counter").text("0/200");
});

function initBannerValidation() {
    $(document).on("input", "#banner_title", function () {
        this.value = this.value.replace(/[^a-zA-Z\s]/g, "");
        const titleNoSpace = this.value.replace(/\s/g, "");
        $("#banner_title_counter").text(`${titleNoSpace.length}/50`);
        if (titleNoSpace.length > 50) {
            this.value = this.value.slice(0, this.value.length - (titleNoSpace.length - 50));
            $("#banner_title_counter").text(`50/50`);
        };
    });

    $(document).on("input", "#banner_description", function () {
        const descNoSpace = this.value.replace(/\s/g, "");
        $("#banner_desc_counter").text(`${descNoSpace.length}/200`);
        if (descNoSpace.length > 200) {
            let trimmed = this.value;
            while (trimmed.replace(/\s/g, "").length > 200) {
                trimmed = trimmed.slice(0, -1);
            };
            this.value = trimmed;
            $("#banner_desc_counter").text(`200/200`);
        };
    });

    $(document).on("keypress", "#banner_sort_order", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            $("#save_banner").trigger("click");
        };
    });

    $(document).on("keypress", "#addBannerModal input, #addBannerModal textarea", function (e) {
        if (e.key === "Enter") {
            e.preventDefault();
            $("#save_banner").trigger("click");
        };
    });
};

$(document).on("click", "#save_banner", function () {
    const title = $("#banner_title").val().trim();
    const description = $("#banner_description").val().trim();
    const link = $("#banner_link").val().trim();
    const sortOrder = $("#banner_sort_order").val();

    const titleNoSpace = title.replace(/\s/g, "");
    const descNoSpace = description.replace(/\s/g, "");

    let validationMessage = "";
    if (!title) {
        validationMessage = "Title is required.";
    } else if (titleNoSpace.length > 50) {
        validationMessage = "Title must not exceed 50 characters (excluding spaces).";
    } else if (description && descNoSpace.length > 200) {
        validationMessage = "Description must not exceed 200 characters (excluding spaces).";
    } else if (link) {
        try {
            const url = new URL(link);
            if (!["http:", "https:"].includes(url.protocol)) {
                validationMessage = "Please enter a valid URL starting with http:// or https://.";
            };
        } catch (e) {
            validationMessage = "Please enter a valid URL (e.g., https://example.com).";
        };
    };

    if (sortOrder !== "" && sortOrder !== undefined) {
        const sortNum = parseInt(sortOrder);
        if (isNaN(sortNum) || sortNum < 1) {
            validationMessage = "Sort Order must be greater than 0.";
        };
    };

    if (validationMessage !== "") {
        showToast(0, validationMessage);
        return;
    }

    postAjaxCall("/add-banner", {
        title: title,
        description: description,
        link: link,
        sortOrder: parseInt(sortOrder || 0),
    }, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 1) {
            $("#addBannerModal").modal("hide");
            $("#banner_title").val("");
            $("#banner_description").val("");
            $("#banner_link").val("");
            $("#banner_sort_order").val(1);
            $("#banner_title_counter").text("0/50");
            $("#banner_desc_counter").text("0/200");
            fetchBannerList();
        }
    });
});

$(document).on("click", ".delete-banner", function () {
    const bannerId = $(this).data("banner-id");
    if (!bannerId) { showToast(0, "Invalid banner ID"); return; }
    postAjaxCall("/delete-banner", { bannerId: bannerId }, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 1) { fetchBannerList(); }
    });
});

function fetchBannerList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/banner-list", "banner-list-table-data");
    toggleResetButtonVisibility("#reset-banner-filters", "#banner-filter-section");
};
