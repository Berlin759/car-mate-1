import dotenv from "dotenv";
dotenv.config();

const Constants = {
    PLATFORM_NAME: "car_mate",
    DEFAULT_COUNTRY_CODE: "IN",
    CURRENCY_CODE: "USD",
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    MAX_FILE_SIZE: 10,
    MAX_VIDEO_FILE_SIZE: 15,

    OWNER_STATUS: {
        PENDING: 1,
        ACTIVE: 2,
        INACTIVE: 3,
        SUSPENDED: 4,
    },
    MECHANIC_STATUS: {
        PENDING: 1,
        ACTIVE: 2,
        INACTIVE: 3,
        SUSPENDED: 4,
    },
    CAR_STATUS: {
        VALID: 1,
        INVALID: 2,
    },
    SERVICE_STATUS: {
        ACTIVE: 1,
        INACTIVE: 2,
    },
    GENDER_STATUS: {
        MALE: 1,
        FEMALE: 2,
        OTHER: 3,
        PREFER_ANY: 4,
    },
    MAINTENANCE_MODE: {
        DISABLED: 1,
        ENABLED: 2,
    },
    CHAT_MESSAGE_TYPE: {
        TEXT: 1,
        DOCUMENT: 2,
        LOCATION: 3,
    },
    CHAT_DOCUMENT_TYPE: {
        NONE: 0,
        PHOTO: 1,
        VIDEO: 2,
        AUDIO: 3,
        FILE: 4,
    },
    CHAT_STATUS: {
        HIDDEN: 1,
        SHOW: 2,
        DELETE: 3
    },
    INVOICE_STATUS: {
        PENDING: 1,
        PAID: 2,
        UNDER_PAID: 3,
        OVER_PAID: 4,
        EXPIRED: 5,
        CANCELLED: 6,
    },
    PAYMENT_METHOD: {
        CASH: 1,
        WALLET: 2,
        CARD: 3,
    },
    TRANSACTION_STATUS: {
        PENDING: 1,
        SUCCESS: 2,
        FAILED: 3,
        REFUND: 4,
    },
    IS_SUSPENDED_STATUS: {
        UNSUSPENDED: 0,
        SUSPENDED: 1,
    },
    EMAIL_VERIFICATION_STATUS: {
        FALSE: 1,
        TRUE: 2,
    },
    NOTIFICATION_PREFERENCES_STATUS: {
        FALSE: 1,
        TRUE: 2,
    },
    SECURITY_SETTING_STATUS: {
        FALSE: 1,
        TRUE: 2,
    },
    BOOKING_STATUS: {
        PENDING: 1,
        CONFIRMED: 2,
        CANCELLED: 3,
    },
    CHECK_IN_OUT_STATUS: {
        BOOKED: 1,
        CHECKIN: 2,
        CHECKOUT: 3,
    },
    BOOKING_PAYMENT_STATUS: {
        PENDING: 1,
        INPROGRESS: 2,
        COMPLETED: 3,
        REJECTED: 4
    },
    PREFERENCES_STATUS: {
        FALSE: 1,
        TRUE: 2,
    },
    ONLINE_STATUS: {
        FALSE: 1,
        TRUE: 2,
    },
    SHIFT_TYPE: {
        DAY: 1,
        NIGHT: 2,
    },
    PLATFORM_STATUS: {
        DISABLED: 1,
        ENABLED: 2,
    },
};

export default Constants;