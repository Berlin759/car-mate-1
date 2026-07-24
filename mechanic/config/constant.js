import dotenv from "dotenv";
dotenv.config();

const Constants = {
    PLATFORM_NAME: "car_mate_mechanic_app",
    DEFAULT_COUNTRY_CODE: "IN",
    CURRENCY_CODE: "USD",
    OTP_LENGTH: 6,
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 10,
    OTP_EXPIRATION_TIME: 1000 * 60 * 10,
    OTP_RESEND_TIME: 1000 * 60 * 2,
    MAX_FILE_SIZE: 10,
    MAX_VIDEO_FILE_SIZE: 15,
    SEND_MAIL: false,

    SOCKET_EVENTS: {
        JOIN_CHAT_ROOM: "join_room",
        MESSAGE_EVENT: "new_message",
        USER_ONLINE: "user_online",
        USER_STATUS_CHANGE: "user_status_change",
        owner_STATUS_CHANGE: "owner_status_change",
        mechanic_STATUS_CHANGE: "mechanic_status_change",
        IS_READ_MESSAGE: "is_read_message",
        IN_OUT_DETAILS_PAGE: "in_out_details_page",
        CHANGE_BOOKING_STATUS: "change_booking_status",
    },
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
    TRANSACTION_STATUS: {
        PENDING: 1,
        SUCCESS: 2,
        FAILED: 3,
        REFUND: 4,
    },
    OTP_TYPE: {
        NEW_REGISTER_OTP: 1,
        FORGOT_PASSWORD: 2,
        CHANGE_PASSWORD: 3,
        LOGIN: 4,
        VERIFY_NUMBER: 5,
    },
    OTP_CHANNEL: {
        SMS: "sms",
        WHATSAPP: "whatsapp",
    },
    IS_SUSPENDED_STATUS: {
        UNSUSPENDED: 1,
        SUSPENDED: 2,
    },
    EMAIL_VERIFICATION_STATUS: {
        FALSE: 1,
        TRUE: 2,
    },
    NOTIFICATION_PREFERENCES_STATUS: {
        FALSE: 1,
        TRUE: 2,
    },
    NOTIFICATION_TYPE: {
        DEFAULT: 1,
        BOOKING: 2,
        TRANSACTION: 3,
        CHAT: 4,
    },
    SECURITY_SETTING_STATUS: {
        FALSE: 1,
        TRUE: 2,
    },
    BOOKING_STATUS: {
        PENDING: 1,
        CANCELLED: 2,
        PROVIDER_ACCEPTED: 3,
        PROVIDER_EN_ROUTE: 4,
        ARRIVED: 5,
        SERVICE_STARTED: 6,
        SERVICE_COMPLETED: 7,
        PAYMENT_COMPLETED: 8,
        CLOSED: 9,
        FAILED: 10,
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
    REMOVE_PROFILE_IMAGE: {
        FALSE: 1,
        TRUE: 2,
    },
    SHIFT_TYPE: {
        DAY: 1,
        NIGHT: 2,
    },
    KYC_STATUS: {
        PENDING: 1,
        APPROVED: 2,
        REJECTED: 3,
    },
    WITHDRAWAL_STATUS: {
        PENDING: 1,
        APPROVED: 2,
        REJECTED: 3,
    },
    EARNING_STATUS: {
        PENDING: 1,
        SUCCESS: 2,
        FAILED: 3,
    },
};

export default Constants;