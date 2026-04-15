import axios from "axios";

export const UIErrorMessages = {
  emailRequired: "Email is required.",
  passwordRequired: "Password is required.",
  validEmail: "Please enter a valid email address.",
  sessionExpired: "Your session has expired. Please log in again.",
  unauthorized: "You do not have permission to perform this action.",
  serverError: "Something went wrong on our end. Please try again later.",
  networkError: "No internet connection. Please check your network and try again.",
  bookingRequiredFields: "Please fill in all required fields.",
  complaintRequiredFields: "Please fill in all required fields before submitting.",
  complaintCategoryRequired: "Please select a complaint category.",
  complaintDescriptionRequired: "Please describe your issue before submitting.",
  announcementTitleRequired: "Announcement title is required.",
  announcementMessageRequired: "Announcement message is required.",
  otpRequired: "Please enter the OTP sent to your email.",
  chatEmptyMessage: "Message cannot be empty.",
  chatSendFailed: "Message failed to send. Please check your connection and try again.",
  paymentInitFailed: "Unable to initiate payment. Please try again.",
  paymentVerifyFailed:
    "Payment verification failed. Please contact support if the amount was deducted.",
  ratingRequired: "Please select a star rating between 1 and 5.",
  reviewTextRequired: "Please write a review before submitting.",
};

function flattenValue(val: unknown): string | null {
  if (typeof val === "string" && val.trim()) return val;
  if (Array.isArray(val) && val.length > 0) {
    return flattenValue(val[0]);
  }
  return null;
}

export function extractApiError(err: unknown, fallback = UIErrorMessages.serverError): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return UIErrorMessages.networkError;
    }

    const status = err.response.status;
    if (status === 401) return UIErrorMessages.sessionExpired;
    if (status === 403) return UIErrorMessages.unauthorized;
    if (status >= 500) return UIErrorMessages.serverError;

    const data = err.response.data;
    if (typeof data === "string" && data.trim()) return data;

    if (data && typeof data === "object") {
      const record = data as Record<string, unknown>;
      const direct = flattenValue(record.error) || flattenValue(record.message) || flattenValue(record.detail);
      if (direct) return direct;

      for (const value of Object.values(record)) {
        const candidate = flattenValue(value);
        if (candidate) return candidate;
      }
    }

    return fallback;
  }

  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }

  return fallback;
}
