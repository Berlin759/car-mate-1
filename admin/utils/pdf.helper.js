import PDFDocument from "pdfkit";
import fs from "fs";

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
    2: { text: "Completed", color: COLORS.success },
    3: { text: "Failed", color: COLORS.danger },
    4: { text: "Refunded", color: COLORS.warning },
};

const PAYOUT_STATUS_MAP = {
    1: { text: "Pending", color: COLORS.pending },
    2: { text: "Completed", color: COLORS.success },
    3: { text: "Failed", color: COLORS.danger },
};

function formatDate(date) {
    if (!date) return "-";

    const d = new Date(date);
    const day = ("0" + d.getDate()).slice(-2);
    const month = ("0" + (d.getMonth() + 1)).slice(-2);
    const year = d.getFullYear();

    return `${year}-${month}-${day}`;
};

function drawField(doc, label, value, x, y, valueColor = COLORS.dark) {
    doc.fontSize(8).fillColor(COLORS.gray).font(FONT_REGULAR).text(label, x, y);
    doc.fontSize(9).fillColor(valueColor).font(FONT_BOLD).text(String(value || "-"), x, y + 11);
};

export function generateTransactionPDF(transaction, res) {
    const doc = new PDFDocument({ size: "A4", margin: 0 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
        "Content-Disposition",
        `attachment; filename="transaction-${transaction?._id || "receipt"}.pdf"`
    );

    doc.pipe(res);

    const ML = 50;
    const MR = 50;
    const CW = doc.page.width - ML - MR;
    const status = STATUS_MAP[transaction?.status] || STATUS_MAP[1];
    const payoutStatus = PAYOUT_STATUS_MAP[transaction?.earningDetails?.status] || PAYOUT_STATUS_MAP[1];

    const serviceAmount = parseFloat(transaction?.earningDetails?.serviceAmount || 0).toFixed(2);
    const adminCharge = parseFloat(transaction?.earningDetails?.adminCharge || 0).toFixed(2);
    const adminPercentageCharge = parseFloat(transaction?.earningDetails?.adminPercentageCharge || 0);
    const finalPayoutAmount = parseFloat(transaction?.earningDetails?.finalPayoutAmount || 0).toFixed(2);

    // Header background
    doc.rect(0, 0, doc.page.width, 70).fill(COLORS.primary);
    doc.fontSize(18).fillColor(COLORS.white).font(FONT_BOLD).text("Transaction Receipt", ML, 18, { width: CW, align: "center" });
    doc.fontSize(9).fillColor(COLORS.white).font(FONT_REGULAR).text(`Generated on ${formatDate(new Date())}`, ML, 38, { width: CW, align: "center" });

    let y = 85;

    // Helper: draw a section with title and content callback
    function section(title, drawFn) {
        doc.fontSize(10).fillColor(COLORS.primary).font(FONT_BOLD).text(title, ML, y);
        y += 14;
        doc.moveTo(ML, y).lineTo(doc.page.width - MR, y).strokeColor(COLORS.lightGray).lineWidth(0.5).stroke();
        y += 8;
        drawFn();
        y += 6;
    };

    // Transaction Info
    section("Transaction Information", () => {
        drawField(doc, "TRX ID:", transaction?.trxId, ML, y);
        drawField(doc, "Invoice ID:", transaction?.invoiceId, 320, y);
        y += 38;

        drawField(doc, "Service Amount:", `₹${serviceAmount}`, ML, y);
        drawField(doc, `Admin Charge (${adminPercentageCharge}%):`, `₹${adminCharge}`, 320, y);
        y += 38;

        drawField(doc, "Total Payout Amount:", `₹${finalPayoutAmount}`, ML, y);
        drawField(doc, "Payout Status:", payoutStatus.text, 320, y, payoutStatus.color);
        y += 38;

        drawField(doc, "TRX Created Date:", formatDate(transaction?.createdAt), ML, y);
        drawField(doc, "Payout Transfer Date:", formatDate(transaction?.earningDetails?.processedAt), 320, y);
        y += 38;
    });

    // Booking Info
    section("Booking Information", () => {
        drawField(doc, "Booking ID:", transaction?.bookingDetails?._id, ML, y);
        drawField(doc, "Invoice No:", transaction?.bookingDetails?.invoiceNo, 320, y);
        y += 38;

        drawField(doc, "Booking Date:", formatDate(transaction?.bookingDetails?.date), ML, y);
        drawField(doc, "Booking Slot:", transaction?.bookingDetails?.slot || "-", 320, y);
        y += 38;
    });

    // Car Owner
    section("Car Owner Details", () => {
        drawField(doc, "Owner Name:", transaction?.ownerDetails?.fullName, ML, y);
        drawField(doc, "Phone:", transaction?.ownerDetails?.phoneNumber, 320, y);
        y += 38;
    });

    // Mechanic
    section("Mechanic Details", () => {
        drawField(doc, "Mechanic Name:", transaction?.mechanicDetails?.fullName, ML, y);
        drawField(doc, "Phone:", transaction?.mechanicDetails?.phoneNumber, 320, y);
        y += 38;
    });

    // Service & Vehicle
    section("Service & Vehicle Details", () => {
        drawField(doc, "Service Name:", transaction?.serviceDetails?.fullName, ML, y);
        drawField(doc, "Car Name:", transaction?.carDetails?.fullName, 320, y);
        y += 38;

        drawField(doc, "Vehicle Number:", transaction?.carDetails?.vehicleNumber, ML, y);
        y += 38;
    });

    // Amount Summary Box
    y += 4;
    doc.roundedRect(ML, y, CW, 85, 4).fill("#f0f4ff");
    doc.fontSize(11).fillColor(COLORS.primary).font(FONT_BOLD).text("Amount Summary", ML + 15, y + 20);
    y += 20;
    doc.fontSize(10).fillColor(COLORS.dark).font(FONT_REGULAR).text(`Total: ₹${serviceAmount}`, ML + 15, y + 28);
    doc.text(`Admin Charge (${adminPercentageCharge}): ₹${adminCharge}`, ML + 180, y + 28);
    doc.fontSize(11).fillColor(payoutStatus.color).font(FONT_BOLD).text(`Payout: ₹${(finalPayoutAmount)}`, ML + 360, y + 28);

    // Footer line
    doc.moveTo(ML, doc.page.height - 35).lineTo(doc.page.width - MR, doc.page.height - 35).strokeColor(COLORS.lightGray).lineWidth(0.5).stroke();
    doc.fontSize(7).fillColor(COLORS.gray).font(FONT_REGULAR).text(
        `Generated on ${formatDate(new Date())} | Car-Mate Admin`,
        ML,
        doc.page.height - 28,
        { width: CW, align: "center" },
    );

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

    const serviceAmount = parseFloat(transaction?.earningDetails?.serviceAmount || 0).toFixed(2);

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

        const status = STATUS_MAP[transaction?.status] || STATUS_MAP[1];
        const payoutStatus = PAYOUT_STATUS_MAP[transaction?.earningDetails?.status] || PAYOUT_STATUS_MAP[1];

        const serviceAmount = parseFloat(transaction?.earningDetails?.serviceAmount || 0).toFixed(2);
        const adminCharge = parseFloat(transaction?.earningDetails?.adminCharge || 0).toFixed(2);
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
            `₹${adminCharge}`,
            `₹${finalPayoutAmount}`,
            payoutStatus.text,
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