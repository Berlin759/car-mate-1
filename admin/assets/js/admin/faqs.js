$(document).ready(function () {
    fetchFaqList();
});

function fetchFaqList(filterObj = {}) {
    setFilters({ ...filterObj });
    filterData("/faq-list", "faq-list-table-data");
    toggleResetButtonVisibility("#reset-faq-filters", "#faq-filter-section");
}

$(document).on("click", "#save_faq", function () {
    const question = $("#faq_question").val().trim();
    const answer = $("#faq_answer").val().trim();
    const category = $("#faq_category").val().trim();

    if (!question || !answer) {
        showToast(0, "Question and answer are required.");
        return;
    }

    postAjaxCall("/add-faq", {
        question: question,
        answer: answer,
        category: category,
    }, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 1) {
            $("#addFaqModal").modal("hide");
            $("#faq_question").val("");
            $("#faq_answer").val("");
            $("#faq_category").val("");
            fetchFaqList();
        }
    });
});

$(document).on("click", ".delete-faq", function () {
    const faqId = $(this).data("faq-id");
    if (!faqId) { showToast(0, "Invalid FAQ ID"); return; }
    postAjaxCall("/delete-faq", { faqId: faqId }, function (response) {
        showToast(response.flag, response.msg);
        if (response.flag === 1) { fetchFaqList(); }
    });
});
