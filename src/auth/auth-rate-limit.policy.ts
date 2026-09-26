export const LOGIN_IP_RATE_LIMIT = {
    limit: 20,
    windowSeconds: 5 * 60,
};

export const LOGIN_ACCOUNT_FAILURE_LIMIT = {
    limit: 5,
    windowSeconds: 15 * 60,
};

export const FORGOT_PASSWORD_IP_RATE_LIMIT = {
    limit: 5,
    windowSecond: 15 * 60
}

export const FORGOT_PASSWORD_ACCOUNT_RATE_LIMIT = {
    limit: 3,
    windowSecond: 60 * 60
}

export const VERIFY_EMAIL_IP_RATE_LIMIT = {
    limit: 3,
    windowSecond: 15 * 60
};