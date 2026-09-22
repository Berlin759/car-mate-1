import PDFDocument from "pdfkit";
import fs from "fs";
import Constants from "../config/constant.js";

let FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
let FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

if (!fs.existsSync(FONT_REGULAR)) {
    FONT_REGULAR = "Helvetica";
};

if (!fs.existsSync(FONT_BOLD)) {
    FONT_BOLD = "Helvetica-Bold";
};

const COLORS = {
    primary: "#1a73e8",
    dark: "#202124",
    gray: "#5f6368",
    lightGray: "#e8eaed",
    white: "#ffffff",
    success: "#0d904f",
    danger: "#d93025",
    warning: "#f9ab00",
    pending: "#ea8600",
};

const STATUS_MAP = {
    1: { text: "Pending", color: COLORS.pending },
    2: { text: "Paid", color: COLORS.success },
    3: { text: "Failed", color: COLORS.danger },
    4: { text: "Refunded", color: COLORS.primary },
};

const CAR_FUEL_MAP = {
    1: { text: "Petrol", color: COLORS.success },
    2: { text: "Diesel", color: COLORS.success },
    3: { text: "EV", color: COLORS.success },
    4: { text: "CNG", color: COLORS.success },
};

const BOOKING_STATUS_MAP = {
    1: { text: "Pending", color: COLORS.pending },
    2: { text: "Accepted", color: COLORS.success },
    3: { text: "Rejected", color: COLORS.danger },
    4: { text: "En Route", color: COLORS.primary },
    5: { text: "Arrived", color: COLORS.dark },
    6: { text: "In Progress", color: COLORS.gray },
    7: { text: "Completed", color: COLORS.success },
    8: { text: "Paid", color: COLORS.lightGray },
    9: { text: "Closed", color: COLORS.success },
    10: { text: "Failed", color: COLORS.warning },
    11: { text: "Cancelled", color: COLORS.danger },
};

const PAYOUT_STATUS_MAP = {
    1: { text: "Pending", color: COLORS.pending },
    2: { text: "Completed", color: COLORS.success },
    3: { text: "Failed", color: COLORS.danger },
    4: { text: "Processing", color: COLORS.primary },
};

function formatDate(date) {
    if (!date) return "-";

    const d = new Date(date);
    const day = ("0" + d.getDate()).slice(-2);
    const month = ("0" + (d.getMonth() + 1)).slice(-2);
    const year = d.getFullYear();

    return `${year}-${month}-${day}`;
};

function capitalizeFirstLetter(str) {
    if (!str) return "User";

    return str.charAt(0).toUpperCase() + str.slice(1);
};

function fullDateFormat(date) {
    if (!date) return "-";

    const d = new Date(date);

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");

    const period = hours >= 12 ? "PM" : "AM";

    hours = hours % 12 || 12;
    hours = String(hours).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes} ${period}`;
};

function drawField(doc, label, value, x, y, valueColor = COLORS.dark) {
    doc.fontSize(8).fillColor(COLORS.gray).font(FONT_REGULAR).text(label, x, y);
    doc.fontSize(9).fillColor(valueColor).font(FONT_BOLD).text(String(value || "-"), x, y + 11);
};

export function generateTransactionPDF(transaction, res) {
    const doc = new PDFDocument({
        size: "A4",
        margin: 0,
        autoFirstPage: true,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="transaction-${transaction?._id || "receipt"}.pdf"`
    );

    doc.pipe(res);

    const ML = 50;
    const MR = 50;
    const TOP = 50;
    const BOTTOM = 55;

    const PAGE_WIDTH = doc.page.width;
    const PAGE_HEIGHT = doc.page.height;
    const CW = PAGE_WIDTH - ML - MR;

    let y = 85;

    const amount = (value) => {
        const number = Number(value);

        return Number.isFinite(number) ? number.toFixed(2) : "0.00";
    };

    const numberValue = (value) => {
        const number = Number(value);

        return Number.isFinite(number) ? number : 0;
    };

    const getText = (value, fallback = "-") => {
        if (value === undefined || value === null || value === "") {
            return fallback;
        };

        return String(value);
    };

    const status = STATUS_MAP[transaction?.status] || { text: "-", color: COLORS.gray, };
    const carFuelType = CAR_FUEL_MAP[transaction?.carDetails?.fuelType] || { text: "-", color: COLORS.gray, };
    const bookingStatus = BOOKING_STATUS_MAP[transaction?.bookingDetails?.status] || { text: "-", color: COLORS.gray, };
    const payoutStatus = transaction?.earningDetails ? (PAYOUT_STATUS_MAP[transaction?.earningDetails?.status] || { text: "-", color: COLORS.gray, }) : null;

    // ---------------------------------------------------------
    // Page Header
    // ---------------------------------------------------------

    function drawHeader() {
        doc.rect(0, 0, PAGE_WIDTH, 70).fill(COLORS.primary);
        doc.fontSize(18).fillColor(COLORS.white).font(FONT_BOLD).text("Transaction Receipt", ML, 18, { width: CW, align: "center", });
        doc.fontSize(9).fillColor(COLORS.white).font(FONT_REGULAR).text(`Generated on ${formatDate(new Date())}`, ML, 38, { width: CW, align: "center", });
    };

    function drawFooter() {
        const footerY = PAGE_HEIGHT - 35;
        doc.moveTo(ML, footerY).lineTo(PAGE_WIDTH - MR, footerY).strokeColor(COLORS.lightGray).lineWidth(0.5).stroke();
        doc.fontSize(7).fillColor(COLORS.gray).font(FONT_REGULAR).text(`Generated on ${formatDate(new Date())} | Car-Mate Admin`, ML, PAGE_HEIGHT - 28, { width: CW, align: "center", });
    };

    function availableHeight() {
        return PAGE_HEIGHT - BOTTOM - y;
    };

    function addPage() {
        drawFooter();

        doc.addPage();

        y = TOP;

        doc.rect(0, 0, PAGE_WIDTH, 45).fill(COLORS.primary);
        doc.fontSize(12).fillColor(COLORS.white).font(FONT_BOLD).text("Transaction Receipt", ML, 14, { width: CW, align: "center", });

        y = 65;
    };

    function ensureSpace(height = 50) {
        if (availableHeight() < height) {
            addPage();
        };
    };

    function sectionHeader(title) {
        ensureSpace(55);

        doc.fontSize(10).fillColor(COLORS.primary).font(FONT_BOLD).text(title, ML, y);

        y += 14;

        doc.moveTo(ML, y).lineTo(PAGE_WIDTH - MR, y).strokeColor(COLORS.lightGray).lineWidth(0.5).stroke();

        y += 15;
    };

    function fieldRow(label, value, options = {}) {
        const rowHeight = options.height || 34;

        ensureSpace(rowHeight);

        drawField(doc, label, getText(value), options.x || ML, y, options.color);

        y += rowHeight;
    };

    function twoColumnRow(leftLabel, leftValue, rightLabel, rightValue, options = {}) {
        const rowHeight = options.height || 34;

        ensureSpace(rowHeight);

        drawField(doc, leftLabel, getText(leftValue), ML, y, options.leftColor);

        if (rightLabel && rightValue) {
            drawField(doc, rightLabel, getText(rightValue), 320, y, options.rightColor);
        };

        y += rowHeight;
    };

    function priceRow(label, value, options = {}) {
        const rowHeight = options.height || 24;

        ensureSpace(rowHeight);

        doc.fontSize(options.labelSize || 9).font(options.labelFont || FONT_REGULAR).fillColor(options.labelColor || COLORS.gray).text(label, ML, y, { width: CW * 0.65, align: "left", });
        doc.fontSize(options.valueSize || 9).font(options.valueFont || FONT_BOLD).fillColor(options.valueColor || COLORS.dark).text(value, ML + CW * 0.65, y, { width: CW * 0.35, align: "right", });

        y += rowHeight;
    };

    function separator(marginTop = 3, marginBottom = 3, borderShow = true) {
        ensureSpace(marginTop + marginBottom + 2);

        y += marginTop;

        if (borderShow) {
            doc.moveTo(ML, y).lineTo(PAGE_WIDTH - MR, y).strokeColor(COLORS.lightGray).lineWidth(0.5).stroke();
        };

        y += marginBottom;
    };

    function drawTransactionPriceBreakdown() {
        sectionHeader("Booking Transaction Information");

        twoColumnRow(
            "Transaction Id:",
            transaction?._id,
            "TRX ID:",
            transaction?.trxId,
        );

        separator(3, 8);

        fieldRow(
            "TRX Created Date:",
            formatDate(transaction?.createdAt),
        );

        separator(3, 8);

        const booking = transaction?.bookingDetails || {};
        const serviceName = transaction?.serviceDetails?.fullName || "Service";

        priceRow(
            `${serviceName} Fee`,
            `₹${amount(booking?.totalServiceFee)}`,
        );

        priceRow(
            "Consultant Fee",
            `₹${amount(booking?.consultantFee)}`,
        );

        if (booking?.discountAmount) {
            priceRow(
                "Discount",
                `- ₹${amount(booking?.discountAmount)}`,
                {
                    valueColor: COLORS.danger,
                },
            );
        };

        const platformFeeType = parseInt(booking?.platformFeeType) === Constants.PLATFORM_FEE_TYPE.PERCENTAGE ? "%" : "₹";

        priceRow(
            `Platform Fee (${numberValue(booking?.platformFee)}${platformFeeType})`,
            `₹${amount(booking?.adminCharge)}`,
        );

        // -----------------------------------------------------
        // Quotation
        // -----------------------------------------------------

        const quotation = Array.isArray(booking?.quotation) ? booking.quotation : [];

        if (quotation.length > 0) {
            separator(4, 8);

            ensureSpace(25);

            doc.fontSize(9).fillColor(COLORS.dark).font(FONT_BOLD).text("Quotation", ML, y);

            y += 20;

            quotation.forEach((item) => {
                priceRow(
                    item?.serviceName || "Service",
                    `₹${amount(item?.price)}`,
                    {
                        labelColor: COLORS.gray,
                        valueFont: FONT_REGULAR,
                    },
                );
            });
        };

        separator(5, 8);

        priceRow(
            "Sub Total",
            `₹${amount(booking?.subTotal)}`,
            {
                labelFont: FONT_BOLD,
                labelColor: COLORS.dark,
                valueFont: FONT_BOLD,
            },
        );

        priceRow(
            `GST ${numberValue(booking?.taxPercentage)}% (Platform + Quotation)`,
            `₹${amount(booking?.taxAmount)}`,
        );

        separator(5, 8);

        const cancellationFee = numberValue(booking?.cancellationFee);

        if (cancellationFee > 0) {
            priceRow(
                `Cancellation Fee (${numberValue(booking?.cancellationPercentage)}%)`,
                `- ₹${amount(cancellationFee)}`,
                {
                    labelColor: COLORS.danger,
                    valueColor: COLORS.danger,
                },
            );

            separator(3, 8);
        };

        const totalAmount = numberValue(booking?.totalAmount) - cancellationFee;

        ensureSpace(35);

        doc.fontSize(10).font(FONT_BOLD).fillColor(COLORS.dark).text("Total Amount", ML, y);
        doc.fontSize(11).font(FONT_BOLD).fillColor(status.color || "#198754").text(`${status.text}  ₹${amount(totalAmount)}`, ML + CW * 0.55, y, { width: CW * 0.45, align: "right", });

        y += 30;
    };

    function drawBookingInformation() {
        sectionHeader("Booking Information");

        twoColumnRow(
            "Booking ID:",
            transaction?.bookingDetails?._id,
            "Invoice No:",
            transaction?.bookingDetails?.invoiceNo
        );

        twoColumnRow(
            "Booking Date:",
            formatDate(transaction?.bookingDetails?.date),
            "Booking Slot:",
            transaction?.bookingDetails?.slot,
        );

        fieldRow(
            "Booking Status:",
            bookingStatus.text,
            {
                color: bookingStatus.color,
            },
        );
    };

    function drawCancellationInformation() {
        const booking = transaction?.bookingDetails || {};

        if (!booking?.cancelReason && !booking?.cancelTime) {
            return;
        };

        sectionHeader("Cancellation Information");

        twoColumnRow(
            "Cancel Reason:",
            booking?.cancelReason,
            "Canceled Date:",
            booking?.cancelTime ? fullDateFormat(booking?.cancelTime) : "-",
        );

        if (booking?.canceledByDetails) {
            const canceledUserName =
                `${booking?.canceledByDetails?.fullName || "-"} ` +
                `(${capitalizeFirstLetter(
                    booking?.canceledByRole || "User"
                )})`;

            fieldRow(
                "Canceled By:",
                canceledUserName,
            );
        };
    };

    function drawOwnerInformation() {
        sectionHeader("Car Owner Details");

        twoColumnRow(
            "Owner Name:",
            transaction?.ownerDetails?.fullName,
            "Phone:",
            transaction?.ownerDetails?.phoneNumber,
        );
    };

    function drawMechanicInformation() {
        sectionHeader("Mechanic Details");

        twoColumnRow(
            "Mechanic Name:",
            transaction?.mechanicDetails?.fullName,
            "Phone:",
            transaction?.mechanicDetails?.phoneNumber,
        );
    };

    function drawServiceVehicleInformation() {
        sectionHeader("Service & Vehicle Details");

        twoColumnRow(
            "Service Name:",
            transaction?.serviceDetails?.fullName,
            "Car Name:",
            transaction?.carDetails?.fullName,
        );

        twoColumnRow(
            "Vehicle Number:",
            transaction?.carDetails?.vehicleNumber,
            "Fuel Type:",
            carFuelType.text,
            {
                rightColor: carFuelType.color,
            },
        );
    };

    function drawMechanicPayoutInformation() {
        if (!payoutStatus) {
            return;
        };

        const earning = transaction?.earningDetails || {};
        const serviceAmount = numberValue(earning?.serviceAmount);
        const totalAdminCharge = numberValue(earning?.totalAdminCharge);
        const adminCharge = numberValue(earning?.adminCharge);
        const adminChargeType = parseInt(earning?.adminChargeType || Constants.PLATFORM_FEE_TYPE.PERCENTAGE);
        const taxAmount = numberValue(earning?.taxAmount);
        const taxPercentage = numberValue(earning?.taxPercentage);

        const finalPayoutAmount = numberValue(earning?.finalPayoutAmount);

        let feeTypeVal = `${adminCharge}%`;

        if (adminChargeType === Constants.PLATFORM_FEE_TYPE.FIXED) {
            feeTypeVal = "Fixed ₹";
        };

        separator(15, 10, false);

        sectionHeader("Mechanic Payout Information");

        twoColumnRow(
            "Earning Id:",
            earning?._id,
            "Payout TRX ID:",
            earning?.razorpayPayoutId || "-",
        );

        separator(3, 8);

        priceRow(
            "Service Amount:",
            `₹${amount(serviceAmount)}`,
        );

        priceRow(
            `Admin Charge (${feeTypeVal}):`,
            `- ₹${amount(totalAdminCharge)}`,
            {
                valueColor: COLORS.danger,
            },
        );

        priceRow(
            `GST Charge (${taxPercentage}%):`,
            `- ₹${amount(taxAmount)}`,
            {
                valueColor: COLORS.danger,
            },
        );

        priceRow(
            "Final Payout Amount:",
            `₹${amount(finalPayoutAmount)}`,
            {
                valueColor: payoutStatus.color,
            },
        );

        priceRow(
            "Payout Status:",
            payoutStatus.text,
            {
                valueColor: payoutStatus.color,
            },
        );

        priceRow(
            "Payout Transfer Date:",
            earning?.processedAt ? formatDate(earning?.processedAt) : "-",
        );

        ensureSpace(105);

        y += 5;

        const summaryHeight = 85;

        doc.roundedRect(ML, y, CW, summaryHeight, 4).fill("#f0f4ff");
        doc.fontSize(10).fillColor(COLORS.primary).font(FONT_BOLD).text("Amount Summary", ML + 15, y + 14);

        doc.fontSize(9).fillColor(COLORS.dark).font(FONT_REGULAR).text("Total", ML + 15, y + 38);
        doc.font(FONT_BOLD).text(`₹${amount(serviceAmount)}`, ML + 15, y + 53);

        doc.font(FONT_REGULAR).text(`Admin Charge (${feeTypeVal})`, ML + 120, y + 38);
        doc.fillColor(COLORS.danger).font(FONT_BOLD).text(`- ₹${amount(totalAdminCharge)}`, ML + 120, y + 53);

        doc.fillColor(COLORS.dark).font(FONT_REGULAR).text(`GST Charge (${taxPercentage}%)`, ML + 280, y + 38);
        doc.fillColor(COLORS.danger).font(FONT_BOLD).text(`- ₹${amount(taxAmount)}`, ML + 280, y + 53);

        doc.fillColor(payoutStatus.color || COLORS.primary).font(FONT_REGULAR).text("Payout", ML + 420, y + 38);
        doc.font(FONT_BOLD).text(`₹${amount(finalPayoutAmount)}`, ML + 420, y + 53);

        y += summaryHeight + 10;
    };

    drawHeader();

    drawTransactionPriceBreakdown();

    drawBookingInformation();

    drawCancellationInformation();

    drawOwnerInformation();

    drawMechanicInformation();

    drawServiceVehicleInformation();

    drawMechanicPayoutInformation();

    drawFooter();

    doc.end();
};

function drawCell(doc, text, x, y, w, opts = {}) {
    const fontSize = opts.fontSize || 7;
    const color = opts.color || COLORS.dark;

    doc.save();
    doc.fontSize(fontSize).fillColor(color).font(opts.bold ? FONT_BOLD : FONT_REGULAR);
    doc.text(String(text || "-"), x + 2, y + 4, { width: w - 4, height: 12, ellipsis: true, lineBreak: false });
    doc.restore();
};

export function generateAllTransactionsPDF(transactionData, res) {
    const transactions = transactionData?.transactionList || [];
    const earningSummary = transactionData?.earningsSummary || { totalCompletePayout: 0, totalPendingPayouts: 0 };

    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="all-transactions-${formatDate(new Date())}.pdf"`
    );

    doc.pipe(res);

    const ML = 10;
    const MR = 10;
    const PW = doc.page.width;
    const USABLE_W = PW - ML - MR;

    // Header
    doc.rect(0, 0, PW, 60).fill(COLORS.primary);
    doc.fontSize(18).fillColor(COLORS.white).font(FONT_BOLD).text("All Transactions Report", ML, 15, { width: USABLE_W, align: "center" });
    doc.fontSize(9).fillColor(COLORS.white).font(FONT_REGULAR).text(`Generated on ${formatDate(new Date())}`, ML, 38, { width: USABLE_W, align: "center" });

    let y = 72;

    // Summary
    const totalAmount = transactions.reduce((sum, t) => sum + (t?.totalAmount || 0), 0);
    const successCount = transactions.filter((t) => t?.status === 2).length;
    const failedCount = transactions.filter((t) => t?.status === 3).length;
    const refundedCount = transactions.filter((t) => t?.status === 4).length;
    const pendingCount = transactions.filter((t) => t?.status === 1).length;
    const completePayoutAmount = earningSummary.totalCompletePayout || 0;
    const pendingPayoutAmount = earningSummary.totalPendingPayouts || 0;

    const serviceAmount = parseFloat(transactions?.earningDetails?.serviceAmount || 0).toFixed(2);

    doc.fontSize(9).fillColor(COLORS.dark).font(FONT_BOLD).text(`1. Total Transaction: ${transactions.length}`, ML, y, { width: USABLE_W, lineBreak: false });
    y += 18;
    doc.fontSize(9).fillColor(COLORS.dark).font(FONT_BOLD).text(`2. Revenue Amount: ₹${parseFloat(totalAmount || 0).toFixed(2)}`, ML, y, { width: USABLE_W, lineBreak: false });
    y += 18;
    doc.fontSize(9).fillColor(COLORS.dark).font(FONT_BOLD).text(`3. Transaction: Completed: ${successCount}  |  Pending: ${pendingCount}  |  Failed: ${failedCount}  |  Refunded: ${refundedCount}`, ML, y, { width: USABLE_W - 300, lineBreak: false });
    y += 18;
    doc.fontSize(9).fillColor(COLORS.dark).font(FONT_BOLD).text(`4. Total Complete Payout: ₹${parseFloat(completePayoutAmount || 0).toFixed(2)}`, ML, y, { width: USABLE_W - 300, lineBreak: false });
    y += 18;
    doc.fontSize(9).fillColor(COLORS.dark).font(FONT_BOLD).text(`5. Total Pending Payout: ₹${parseFloat(pendingPayoutAmount || 0).toFixed(2)}`, ML, y, { width: USABLE_W - 300, lineBreak: false });
    y += 25;

    // Column definitions — must sum to USABLE_W
    const headers = ["#", "Payment ID", "Booking ID", "Owner", "Mechanic", "Service", "Car", "Service Amount", "Admin Charge", "Payout Amount", "Payout Status", "Date"];
    const colWidths = [25, 85, 85, 80, 80, 80, 75, 60, 60, 65, 65, 75];
    const colX = [];
    let xAcc = ML;

    for (let i = 0; i < colWidths.length; i++) {
        colX.push(xAcc);
        xAcc += colWidths[i];
    };

    const ROW_H = 16;
    const HEADER_H = 18;

    function drawPageHeader(py) {
        doc.rect(ML, py, USABLE_W, HEADER_H).fill(COLORS.primary);
        let hx = ML;

        for (let i = 0; i < headers.length; i++) {
            doc.save();
            doc.fontSize(7).fillColor(COLORS.white).font(FONT_BOLD);
            doc.text(headers[i], hx + 2, py + 5, { width: colWidths[i] - 4, height: 10, lineBreak: false });
            doc.restore();

            hx += colWidths[i];
        };
    };

    drawPageHeader(y);
    y += HEADER_H;

    // Table Rows
    transactions.forEach((transaction, index) => {
        if (y + ROW_H > doc.page.height - 30) {
            doc.addPage();
            doc.rect(0, 0, PW, 60).fill(COLORS.primary);
            doc.fontSize(18).fillColor(COLORS.white).font(FONT_BOLD).text("All Transactions Report (continued)", ML, 15, { width: USABLE_W, align: "center" });
            doc.fontSize(9).fillColor(COLORS.white).font(FONT_REGULAR).text(`Page ${doc.bufferedPageRange().count + 1}`, ML, 38, { width: USABLE_W, align: "center" });
            y = 72;

            drawPageHeader(y);

            y += HEADER_H;
        };

        const bgColor = index % 2 === 0 ? COLORS.white : "#f0f4ff";
        doc.rect(ML, y, USABLE_W, ROW_H).fill(bgColor);

        // Draw cell borders
        doc.save().moveTo(ML, y).lineTo(ML + USABLE_W, y).strokeColor(COLORS.lightGray).lineWidth(0.3).stroke().restore();

        const status = STATUS_MAP[transaction?.status] || "-";
        const payoutStatus = PAYOUT_STATUS_MAP[transaction?.earningDetails?.status] || "-";

        const serviceAmount = parseFloat(transaction?.earningDetails?.serviceAmount || 0).toFixed(2);
        const totalAdminCharge = parseFloat(transaction?.earningDetails?.totalAdminCharge || 0).toFixed(2);
        const taxAmount = parseFloat(transaction?.earningDetails?.taxAmount || 0).toFixed(2);
        const finalPayoutAmount = parseFloat(transaction?.earningDetails?.finalPayoutAmount || 0).toFixed(2);

        const rowData = [
            String(index + 1),
            String(transaction?.trxId || "-").substring(0, 12),
            String(transaction?.bookingDetails?._id || "-").substring(0, 12),
            String(transaction?.ownerDetails?.fullName || "-").substring(0, 12),
            String(transaction?.mechanicDetails?.fullName || "-").substring(0, 12),
            String(transaction?.serviceDetails?.fullName || "-").substring(0, 12),
            String(transaction?.carDetails?.fullName || "-").substring(0, 12),
            `₹${serviceAmount}`,
            `₹${totalAdminCharge}`,
            `₹${taxAmount}`,
            `₹${finalPayoutAmount}`,
            payoutStatus ? payoutStatus.text : "-",
            formatDate(transaction?.createdAt),
        ];

        for (let ci = 0; ci < rowData.length; ci++) {
            if (ci === 11) {
                drawCell(doc, rowData[ci], colX[ci], y, colWidths[ci], { color: payoutStatus.color, bold: true });
            } else {
                drawCell(doc, rowData[ci], colX[ci], y, colWidths[ci]);
            };
        };

        y += ROW_H;
    });

    // Bottom border
    doc.save().moveTo(ML, y).lineTo(ML + USABLE_W, y).strokeColor(COLORS.lightGray).lineWidth(0.3).stroke().restore();

    // Footer
    doc.fontSize(10).fillColor(COLORS.gray).font(FONT_BOLD).text(
        `Car-Mate Admin | Total: ${transactions.length} transactions`,
        ML,
        doc.page.height - 30,
        { width: USABLE_W, align: "center" }
    );

    doc.end();
};