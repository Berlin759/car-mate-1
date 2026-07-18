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

    // Strip non-alpha from account holder name
    $(document).on("input", "#bankAccountHolderName", function () {
        this.value = this.value.replace(/[^a-zA-Z\s]/g, "");
    });

    // Strip non-numeric from account number
    $(document).on("input", "#bankAccountNumber", function () {
        this.value = this.value.replace(/[^0-9]/g, "").slice(0, 20);
    });

    // Auto-uppercase IFSC code and strip invalid chars
    $(document).on("input", "#bankIfscCode", function () {
        this.value = this.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 11);
    });

    // Submit KYC Form
    $(document).on("submit", "#kyc-submit-form", function (e) {
        e.preventDefault();

        const mechanicId = $("#mechanic-id").val();
        const aadhaarFront = $("#aadhaarFront")[0].files[0];
        const aadhaarBack = $("#aadhaarBack")[0].files[0];
        const bankAccountHolderName = $("#bankAccountHolderName").val().trim();
        const bankIfscCode = $("#bankIfscCode").val().trim().toUpperCase();
        const bankAccountNumber = $("#bankAccountNumber").val().trim();

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

        if (bankAccountHolderName) {
            const nameRegex = /^[a-zA-Z\s]+$/;
            if (!nameRegex.test(bankAccountHolderName)) {
                showToast(0, "Account Holder Name must contain only alphabetic characters and spaces.");
                return;
            };
            if (bankAccountHolderName.length < 2 || bankAccountHolderName.length > 100) {
                showToast(0, "Account Holder Name must be between 2 and 100 characters.");
                return;
            };
        };

        if (bankIfscCode) {
            const ifscRegex = /^[A-Z]{4}[0-9]{6}$/;
            if (!ifscRegex.test(bankIfscCode)) {
                showToast(0, "Please enter a valid IFSC code (e.g., SBIN0001234).");
                return;
            };
        };

        if (bankAccountNumber) {
            const accNoRegex = /^[0-9]+$/;
            if (!accNoRegex.test(bankAccountNumber)) {
                showToast(0, "Account Number must contain only digits.");
                return;
            };
            if (bankAccountNumber.length < 6 || bankAccountNumber.length > 20) {
                showToast(0, "Account Number must be between 6 and 20 digits.");
                return;
            };
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

        formData.append("bankAccountHolderName", bankAccountHolderName);
        formData.append("bankName", $("#bankName").val() || "");
        formData.append("bankAccountNumber", $("#bankAccountNumber").val() || "");
        formData.append("bankIfscCode", bankIfscCode);

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
    });
});
