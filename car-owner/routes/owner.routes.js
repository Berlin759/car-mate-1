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
    postUpdateOwnerProfile,
    postUpdatePreferences,
    postDeviceTokenUpdate,
    postSendEmailOTP,
    postVerifyEmail,
    postLogout,
    getHomeDetails,
    postAddCar,
    postCarList,
    postServiceList,
    postAddCreditCard,
    postCardList,
    postDeleteCard,
    postAddBooking,
    postBookingList,
    postBookingDetails,
    postUpdateBooking,
    postCancelBooking,
    postNotificationList,
    postAddRating,
    postRatingList,
    postTransactionList,
    postUpdateNotification,
    postBookingInvoice,
    postChatList,
    postChatMessagesList,
    postSendMessageToChat,
    postAddAddress,
    postAddressList,
    postUpdateAddress,
    postDeleteAddress,
    postSetDefaultAddress,
    postWalletBalance,
    postAddToWallet,
    postWalletTransactionList,
    postApplyCoupon,
    postCouponList,
    postNearbyMechanics,
    postSetDefaultCar,
    postDeleteCar,
    postUpdateCar,
    postSearchServices,
    postConfirmPayment,
    postUpdateLocation,
    postGetProviderLocation,
    postFileDispute,
} from "../controllers/owner.controller.js";

const router = express.Router();

// Auth API
router.post("/login", postLogin);
router.post("/otp-verify", postVerifyOtp);
router.post("/resend-otp", postResendOtp);

router.get("/privacy-policy", getPrivacyPolicy);
router.get("/terms-condition", getTermsCondition);
router.get("/refund", getRefund);
router.get("/faq", getFaq);

// Owner profile API
router.get("/profile-details", authMiddleware, getProfileDetails);
router.post("/update-profile", authMiddleware, postUpdateOwnerProfile);
router.post("/update-device-token", authMiddleware, postDeviceTokenUpdate);
router.post("/update-preferences", authMiddleware, postUpdatePreferences);
router.post("/update-location", authMiddleware, postUpdateLocation);

// Email Verify
router.post("/send-email-otp", authMiddleware, postSendEmailOTP);
router.post("/verify-email", authMiddleware, postVerifyEmail);

router.post("/logout", authMiddleware, postLogout);

// Home API
router.post("/home-details", authMiddleware, getHomeDetails);

// Vehicle Management
router.post("/add-car", authMiddleware, postAddCar);
router.post("/car-list", authMiddleware, postCarList);
router.post("/set-default-car", authMiddleware, postSetDefaultCar);
router.post("/update-car", authMiddleware, postUpdateCar);
router.post("/delete-car", authMiddleware, postDeleteCar);

// Service API
router.post("/service-list", authMiddleware, postServiceList);
router.post("/search-services", authMiddleware, postSearchServices);
router.post("/nearby-mechanics", authMiddleware, postNearbyMechanics);

// Card Payment API
router.post("/add-card", authMiddleware, postAddCreditCard);
router.post("/card-list", authMiddleware, postCardList);
router.post("/delete-card", authMiddleware, postDeleteCard);

// Booking API
router.post("/add-booking", authMiddleware, postAddBooking);
router.post("/booking-list", authMiddleware, postBookingList);
router.post("/booking-details", authMiddleware, postBookingDetails);
router.post("/update-booking", authMiddleware, postUpdateBooking);
router.post("/cancel-booking", authMiddleware, postCancelBooking);
router.post("/booking-invoice", authMiddleware, postBookingInvoice);

// Notification API
router.post("/notification-list", authMiddleware, postNotificationList);
router.post("/notification-update", authMiddleware, postUpdateNotification);

// Rating API
router.post("/add-rating", authMiddleware, postAddRating);
router.post("/rating-list", authMiddleware, postRatingList);

// Transaction Routes
router.post("/transaction-list", authMiddleware, postTransactionList);
router.post("/confirm-payment", authMiddleware, postConfirmPayment);

// Chat Routes
router.post("/chat-list", authMiddleware, postChatList);
router.post("/chat-messages-details", authMiddleware, postChatMessagesList);
router.post("/send-chat-message", authMiddleware, postSendMessageToChat);

// Address API
router.post("/add-address", authMiddleware, postAddAddress);
router.post("/address-list", authMiddleware, postAddressList);
router.post("/update-address", authMiddleware, postUpdateAddress);
router.post("/delete-address", authMiddleware, postDeleteAddress);
router.post("/set-default-address", authMiddleware, postSetDefaultAddress);

// Wallet API
router.post("/wallet-balance", authMiddleware, postWalletBalance);
router.post("/add-to-wallet", authMiddleware, postAddToWallet);
router.post("/wallet-transaction-list", authMiddleware, postWalletTransactionList);

// Coupon API
router.post("/apply-coupon", authMiddleware, postApplyCoupon);
router.post("/coupon-list", authMiddleware, postCouponList);

// Tracking
router.post("/get-provider-location", authMiddleware, postGetProviderLocation);

// Dispute
router.post("/file-dispute", authMiddleware, postFileDispute);

export default router;