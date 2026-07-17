$(document).ready(function () {
    // Image preview on file select
    $(document).on("change", "input[type='file']", function () {
        const file = this.files[0];
        const previewId = "#" + $(this).attr("id") + "-preview";

        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                $(previewId).html('<img src="' + e.target.result + '" class="img-fluid rounded" style="max-height: 100px;">');
            };
            reader.readAsDataURL(file);
        } else {
            $(previewId).html("");
        }
    });

    // Submit KYC Form
    $(document).on("submit", "#kyc-submit-form", function (e) {
        e.preventDefault();

        const mechanicId = $("#mechanic-id").val();
        const aadhaarFront = $("#aadhaarFront")[0].files[0];
        const aadhaarBack = $("#aadhaarBack")[0].files[0];

        if (!mechanicId) {
            showToast(0, "Invalid mechanic Id");
            return;
        };

        if (!aadhaarFront) {
            showToast(0, "Please upload Aadhaar front image.");
            return;
        };

        if (!aadhaarBack) {
            showToast(0, "Please upload Aadhaar back image.");
            return;
        };

        const formData = new FormData();
        formData.append("mechanicId", mechanicId);

        if (aadhaarFront) formData.append("aadhaarFront", aadhaarFront);
        if (aadhaarBack) formData.append("aadhaarBack", aadhaarBack);

        const panCard = $("#panCard")[0].files[0];
        if (panCard) formData.append("panCard", panCard);

        const drivingLicense = $("#drivingLicense")[0].files[0];
        if (drivingLicense) formData.append("drivingLicense", drivingLicense);

        const selfie = $("#selfie")[0].files[0];
        if (selfie) formData.append("selfie", selfie);

        formData.append("bankAccountHolderName", $("#bankAccountHolderName").val() || "");
        formData.append("bankName", $("#bankName").val() || "");
        formData.append("bankAccountNumber", $("#bankAccountNumber").val() || "");
        formData.append("bankIfscCode", $("#bankIfscCode").val() || "");

        $("#submit-kyc-btn").prop("disabled", true).text("Submitting...");

        postFileCall("/kyc/submit", formData, function (response) {
            showToast(response.flag, response.msg);

            if (response.flag === 1) {
                setTimeout(function () {
                    window.location.href = "/mechanic/" + mechanicId;
                }, 1000);
            } else if (response.flag === 8) {
                window.location.reload();
            } else {
                $("#submit-kyc-btn").prop("disabled", false).text("Submit KYC");
            };
        });

        // $.ajax({
        //     url: "/kyc/submit",
        //     type: "POST",
        //     data: formData,
        //     processData: false,
        //     contentType: false,
        //     success: function (response) {
        //         showToast(response.flag, response.msg);
        //         if (response.flag === 1) {
        //             setTimeout(function () {
        //                 window.location.href = "/mechanic/" + mechanicId;
        //             }, 1000);
        //         } else if (response.flag === 8) {
        //             window.location.reload();
        //         } else {
        //             $("#submit-kyc-btn").prop("disabled", false).text("Submit KYC");
        //         }
        //     },
        //     error: function () {
        //         showToast(0, "Something went wrong. Please try again.");
        //         $("#submit-kyc-btn").prop("disabled", false).text("Submit KYC");
        //     }
        // });
    });
});
