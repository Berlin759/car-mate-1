import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import { log1, errorResponse, successResponse } from "../lib/general.js";

const __dirname = path.resolve();

const COLORS = {
    primary: "#FF6F3C",
    dark: "#333333",
    gray: "#888888",
    lightGray: "#eeeeee",
    white: "#ffffff",
    red: "#d93025",
};

function formatDate(date) {
    if (!date) return "-";

    const d = new Date(date);
    const day = ("0" + d.getDate()).slice(-2);

    const month = ("0" + (d.getMonth() + 1)).slice(-2);
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
};

export const generateInvoicePDF = async (booking) => {
    return new Promise((resolve, reject) => {
        try {
            let FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
            let FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf";

            if (!fs.existsSync(FONT_REGULAR)) {
                FONT_REGULAR = "Helvetica";
            };

            if (!fs.existsSync(FONT_BOLD)) {
                FONT_BOLD = "Helvetica-Bold";
            };

            log1(["generateInvoicePDF FONT_REGULAR ----->", FONT_REGULAR]);
            log1(["generateInvoicePDF FONT_BOLD ----->", FONT_BOLD]);

            const doc = new PDFDocument({ size: "A4", margin: 0 });

            const folder = "upload_invoice";
            const rootDir = path.join(__dirname, "..");
            const invoiceDir = path.join(rootDir, "uploads", folder);

            if (!fs.existsSync(invoiceDir)) {
                fs.mkdirSync(invoiceDir, { recursive: true });
            };

            const fileName = `invoice-${booking.invoiceNo || booking._id}-${Date.now()}.pdf`;
            const filePath = path.join(invoiceDir, fileName);

            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            const ML = 20;
            const MR = 20;
            const CW = doc.page.width - ML - MR;

            doc.rect(0, 0, doc.page.width, 70).fill(COLORS.primary);
            doc.font(FONT_BOLD).fontSize(22).fillColor(COLORS.white).text("CAR-MATE", ML, 18, { width: CW, align: "left" });
            doc.font(FONT_BOLD).fontSize(20).fillColor(COLORS.white).text("INVOICE", ML, 18, { width: CW, align: "right" });

            // INVOICE BASIC INFORMATION
            let y = 85;

            doc.font(FONT_REGULAR).fontSize(10).fillColor(COLORS.dark);
            doc.text(`Invoice No: ${booking.invoiceNo || "N/A"}`, ML, y);
            doc.text(`Date: ${formatDate(booking.date)}, Slot: (${booking.slot || ""})`, ML, y + 15);

            doc.text(`Mechanic: ${booking.mechanicDetails?.fullName || "N/A"}`, 350, y);
            doc.text(`Contact: ${booking.mechanicDetails?.phoneNumber || "N/A"}`, 350, y + 15);

            y += 45;
            doc.moveTo(ML, y).lineTo(doc.page.width - MR, y).strokeColor(COLORS.lightGray).lineWidth(1).stroke();
            y += 15;

            doc.font(FONT_BOLD).fontSize(10).fillColor(COLORS.dark).text("Billed To:", ML, y);
            doc.font(FONT_REGULAR).fontSize(10);
            doc.text(`Customer Name: ${booking.ownerDetails?.fullName || "N/A"}`, ML, y + 14);
            doc.text(`Phone: ${booking.ownerDetails?.phoneNumber || "N/A"}`, ML, y + 28);
            doc.text(`Address: ${booking.address || "N/A"}`, ML, y + 42);

            y += 65;
            doc.moveTo(ML, y).lineTo(doc.page.width - MR, y).strokeColor(COLORS.lightGray).lineWidth(1).stroke();
            y += 15;

            doc.font(FONT_BOLD).fontSize(10).fillColor(COLORS.dark).text("Service & Vehicle Details:", ML, y);
            doc.font(FONT_REGULAR).fontSize(10);
            doc.text(`Service Name: ${booking?.serviceDetails?.categoryName || "N/A"}`, ML, y + 14);
            doc.text(`Car Name: ${booking?.carDetails?.fullName || "N/A"}`, ML, y + 28);
            doc.text(`Vehicle Number: ${booking?.carDetails?.vehicleNumber || "N/A"}`, ML, y + 42);

            y += 65;
            doc.moveTo(ML, y).lineTo(doc.page.width - MR, y).strokeColor(COLORS.lightGray).lineWidth(1).stroke();
            y += 15;

            doc.fontSize(10).fillColor(COLORS.white).rect(ML, y, CW, 20).fill(COLORS.primary);
            doc.font(FONT_BOLD).fontSize(9).fillColor(COLORS.white);
            doc.text("Description", ML + 8, y + 6, { width: CW - 130, lineBreak: false });
            doc.text("Amount", ML + CW - 80, y + 6, { width: 72, align: "right", lineBreak: false });

            y += 25;

            const drawRow = (label, amount, isDiscount = false) => {
                const rowBg = y % 2 === 0 ? "#fafafa" : COLORS.white;
                doc.rect(ML, y, CW, 22).fill(rowBg);
                doc.font(FONT_REGULAR).fontSize(9).fillColor(isDiscount ? COLORS.red : COLORS.dark);
                doc.text(label, ML + 8, y + 6, { width: CW - 130, lineBreak: false });

                const formattedAmount = parseFloat(amount || 0).toFixed(2);

                doc.text(`${isDiscount ? "-" : ""}₹${formattedAmount}`, ML + CW - 80, y + 6, { width: 72, align: "right", lineBreak: false });
                y += 22;
            };

            drawRow("Earning Amount", parseFloat(booking?.earningDetails?.earningAmount || 0).toFixed(2));
            drawRow("Consultant Fee", parseFloat(booking?.consultantFee || 0).toFixed(2));

            y += 5;
            doc.moveTo(ML, y).lineTo(doc.page.width - MR, y).strokeColor(COLORS.lightGray).lineWidth(1).stroke();
            y += 15;

            const drawSummaryRow = (label, amount, isBold = false, minusVal = false) => {
                doc.font(isBold ? FONT_BOLD : FONT_REGULAR).fontSize(10).fillColor(COLORS.dark);
                doc.text(label, ML + CW - 200, y, { width: 120, lineBreak: false });

                const formattedAmount = parseFloat(amount || 0).toFixed(2);

                doc.text(`${minusVal ? '-' : ''} ₹${formattedAmount}`, ML + CW - 90, y, { width: 82, align: "right", lineBreak: false });
                y += 18;
            };

            const serviceAmount = parseFloat(booking?.earningDetails?.serviceAmount || 0).toFixed(2);
            const adminCharge = parseFloat(booking?.earningDetails?.adminCharge || 0).toFixed(2);
            const finalPayoutAmount = parseFloat(booking?.earningDetails?.finalPayoutAmount || 0).toFixed(2);

            drawSummaryRow("Service Amount:", serviceAmount, true);
            drawSummaryRow("Admin Charge:", adminCharge, true, true);

            y += 5;
            doc.moveTo(ML, y).lineTo(doc.page.width - MR, y).strokeColor(COLORS.primary).lineWidth(2).stroke();
            y += 10;

            doc.font(FONT_BOLD).fontSize(12).fillColor(COLORS.primary);
            doc.text("Total Amount:", ML + CW - 200, y, { width: 120, lineBreak: false });
            doc.text(`₹${finalPayoutAmount}`, ML + CW - 90, y, { width: 82, align: "right", lineBreak: false });

            // y += 50;
            doc.font(FONT_REGULAR).fontSize(9).fillColor(COLORS.gray).text(
                "Thank you for choosing Car-Mate!",
                ML,
                doc.page.height - 94,
                { width: CW, align: "center" },
            );

            doc.text(
                "If you have any questions, contact support@carmate.com.",
                ML,
                doc.page.height - 80,
                { width: CW, align: "center" },
            );

            doc.font(FONT_REGULAR).fontSize(7).fillColor(COLORS.gray).text(
                `Generated on ${formatDate(new Date())}`,
                ML,
                doc.page.height - 30,
                { width: CW, align: "center" },
            );

            doc.end();

            stream.on("finish", () => {
                resolve({ fileName, filePath, folder });
            });

            stream.on("error", (err) => {
                reject(err);
            });
        } catch (error) {
            reject(error);
        };
    });
};
