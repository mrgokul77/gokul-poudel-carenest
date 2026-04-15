class ErrorMessages:
    EMAIL_REQUIRED = "Email is required."
    PASSWORD_REQUIRED = "Password is required."
    VALID_EMAIL_REQUIRED = "Please enter a valid email address."
    EMAIL_NOT_REGISTERED = "No account found with this email address."
    WRONG_PASSWORD = "Incorrect password. Please try again."
    ACCOUNT_NOT_VERIFIED = "Your account is not verified. Please check your email for the OTP."

    FULL_NAME_REQUIRED = "Full name is required."
    PASSWORD_MIN_LENGTH = "Password must be at least 8 characters."
    PASSWORD_MISMATCH = "Passwords do not match."
    EMAIL_ALREADY_REGISTERED = "An account with this email already exists."
    INVALID_PHONE = "Please enter a valid 10-digit phone number."

    OTP_REQUIRED = "Please enter the OTP sent to your email."
    OTP_INCORRECT = "The OTP you entered is incorrect. Please try again."
    OTP_EXPIRED = "Your OTP has expired. Please request a new one."

    FIELD_REQUIRED = "This field is required."
    PROFILE_PHOTO_INVALID_TYPE = "Only JPG and PNG files are allowed."
    PROFILE_PHOTO_TOO_LARGE = "File size must not exceed 2MB."

    COMPLETE_PROFILE_BEFORE_UPLOAD = "Please complete your profile before uploading documents."
    DOCUMENT_INVALID_TYPE = "Only JPG, PNG, and PDF files are accepted."
    DOCUMENT_TOO_LARGE = "File size must not exceed 5MB."
    FILE_REQUIRED = "Please select a file to upload."

    BOOKING_REQUIRED_FIELDS = "Please fill in all required fields."
    BOOKING_INVALID_PHONE = "Phone number must be exactly 10 digits."
    CAREGIVER_NOT_AVAILABLE = "This caregiver is not available for the selected date and time. Please choose a different slot."
    DUPLICATE_BOOKING = "You already have a pending request with this caregiver."
    BOOKING_EXPIRED = "This booking has expired and can no longer be updated."

    PAYMENT_INIT_FAILED = "Unable to initiate payment. Please try again."
    PAYMENT_VERIFY_FAILED = "Payment verification failed. Please contact support if the amount was deducted."
    PAYMENT_ALREADY_PAID = "This booking has already been paid."

    REVIEW_RATING_REQUIRED = "Please select a star rating between 1 and 5."
    REVIEW_TEXT_REQUIRED = "Please write a review before submitting."
    REVIEW_PAYMENT_REQUIRED = "You can only submit a review after payment is completed."

    COMPLAINT_REQUIRED_FIELDS = "Please fill in all required fields before submitting."
    COMPLAINT_CATEGORY_REQUIRED = "Please select a complaint category."
    COMPLAINT_DESCRIPTION_REQUIRED = "Please describe your issue before submitting."

    CHAT_EMPTY_MESSAGE = "Message cannot be empty."
    CHAT_SEND_FAILED = "Message failed to send. Please check your connection and try again."

    ANNOUNCEMENT_TITLE_REQUIRED = "Announcement title is required."
    ANNOUNCEMENT_MESSAGE_REQUIRED = "Announcement message is required."

    NETWORK_ERROR = "No internet connection. Please check your network and try again."
    SERVER_ERROR = "Something went wrong on our end. Please try again later."
    UNAUTHORIZED = "You do not have permission to perform this action."
    SESSION_EXPIRED = "Your session has expired. Please log in again."
