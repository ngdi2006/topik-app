export function sanitizeNextPath(value: string | null | undefined, fallback = '/dashboard') {
    if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback
    return value
}

export function getVietnameseAuthError(message: string) {
    const normalized = message.toLowerCase()

    if (normalized.includes('invalid login credentials')) return 'Email hoặc mật khẩu chưa chính xác.'
    if (normalized.includes('email not confirmed')) return 'Email chưa được xác nhận. Vui lòng kiểm tra hộp thư.'
    if (normalized.includes('user already registered')) return 'Email này đã được đăng ký. Hãy đăng nhập hoặc lấy lại mật khẩu.'
    if (normalized.includes('password should be at least')) return 'Mật khẩu cần có ít nhất 6 ký tự.'
    if (normalized.includes('rate limit') || normalized.includes('too many requests')) return 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.'
    if (normalized.includes('expired') || normalized.includes('invalid')) return 'Liên kết xác thực không hợp lệ hoặc đã hết hạn.'

    return 'Không thể hoàn tất yêu cầu. Vui lòng thử lại.'
}
