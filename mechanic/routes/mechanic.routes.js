import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
    postLogin,
    postVerifyOtp,
    postResendOtp,
} from "../controllers/auth.controller.js";
import {
    getPrivacyPolicy,
    getTermsCondition,
    getRefund,
    getFaq,
    getProfileDetails,
    postUpdateMechanicProfile,
    postUpdatePreferences,
    postDeviceTokenUpdate,
    postSendEmailOTP,
    postVerifyEmail,
    postLogout,
    getHomeDetails,
    postAddService,
    postServiceList,
    postBookingList,
    postBookingDetails,
    postBookingUpdateStatus,
    postNotificationList,
    postTransactionList,
    postUpdateNotification,
    postChatList,
    postChatMessagesList,
    postSendMessageToChat,
    postSubmitKYC,
    postKYCStatus,
    postToggleAvailability,
    postUpdateWorkingHours,
    postAvailabilityStatus,
    postWalletBalance,
    postRequestWithdrawal,
    postWithdrawalHistory,
    postPerformanceMetrics,
    postReviewsReceived,
    postDashboard,
    postIncomingRequests,
    postUpdateServiceRadius,
    postUpdateHolidays,
    postUpdateLocation,
    postBookingNavigationData,
} from "../controllers/mechanic.controller.js";

const router = express.Router();

// Auth API
router.post("/login", postLogin);
router.post("/otp-verify", postVerifyOtp);
router.post("/resend-otp", postResendOtp);

router.get("/privacy-policy", getPrivacyPolicy);
router.get("/terms-condition", getTermsCondition);
router.get("/refund", getRefund);
router.get("/faq", getFaq);

// Mechanic profile API
router.get("/profile-details", authMiddleware, getProfileDetails);
router.post("/update-profile", authMiddleware, postUpdateMechanicProfile);
router.post("/update-device-token", authMiddleware, postDeviceTokenUpdate);
router.post("/update-preferences", authMiddleware, postUpdatePreferences);

// Email Verify
router.post("/send-email-otp", authMiddleware, postSendEmailOTP);
router.post("/verify-email", authMiddleware, postVerifyEmail);

router.post("/logout", authMiddleware, postLogout);

// Home API
router.post("/home-details", authMiddleware, getHomeDetails);

// Service API
router.post("/add-service", authMiddleware, postAddService);
router.post("/service-list", authMiddleware, postServiceList);

// Booking API
router.post("/booking-list", authMiddleware, postBookingList);
router.post("/booking-details", authMiddleware, postBookingDetails);
router.post("/booking-update-status", authMiddleware, postBookingUpdateStatus);

// Notification API
router.post("/notification-list", authMiddleware, postNotificationList);
router.post("/notification-update", authMiddleware, postUpdateNotification);

// Transaction Routes
router.post("/transaction-list", authMiddleware, postTransactionList);

// Chat Routes
router.post("/chat-list", authMiddleware, postChatList);
router.post("/chat-messages-details", authMiddleware, postChatMessagesList);
router.post("/send-chat-message", authMiddleware, postSendMessageToChat);

// KYC API
router.post("/submit-kyc", authMiddleware, postSubmitKYC);
router.post("/kyc-status", authMiddleware, postKYCStatus);

// Availability API
router.post("/toggle-availability", authMiddleware, postToggleAvailability);
router.post("/update-working-hours", authMiddleware, postUpdateWorkingHours);
router.post("/availability-status", authMiddleware, postAvailabilityStatus);

// Wallet & Earnings API
router.post("/wallet-balance", authMiddleware, postWalletBalance);
router.post("/request-withdrawal", authMiddleware, postRequestWithdrawal);
router.post("/withdrawal-history", authMiddleware, postWithdrawalHistory);

// Performance API
router.post("/performance-metrics", authMiddleware, postPerformanceMetrics);
router.post("/reviews-received", authMiddleware, postReviewsReceived);

// Dashboard API
router.post("/dashboard", authMiddleware, postDashboard);
router.post("/incoming-requests", authMiddleware, postIncomingRequests);

// Availability API (service radius, holidays, location)
router.post("/update-service-radius", authMiddleware, postUpdateServiceRadius);
router.post("/update-holidays", authMiddleware, postUpdateHolidays);
router.post("/update-location", authMiddleware, postUpdateLocation);

// Navigation API
router.post("/booking-navigation-data", authMiddleware, postBookingNavigationData);

export default router;