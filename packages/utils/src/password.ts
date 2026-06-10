// 预编译正则表达式以提高性能
const DIGIT_REGEX = /\d/
const SPECIAL_CHAR_REGEX = /[!@#$%^&*(),.?":{}|<>]/
const UPPERCASE_REGEX = /[A-Z]/

/**
 * 计算密码强度
 * @param password - 要检查的密码字符串
 * @returns 0-4 的数值，0 最弱，4 最强
 */
export function getPasswordStrength(password: string): number {
  if (!password) {
    return 0
  }

  let strength = 0

  // 长度检查
  if (password.length >= 4) {
    strength += 1
  }
  if (password.length >= 8) {
    strength += 1
  }

  // 包含数字
  if (DIGIT_REGEX.test(password)) {
    strength += 1
  }

  // 包含特殊字符或大小写混合
  if (SPECIAL_CHAR_REGEX.test(password) || UPPERCASE_REGEX.test(password)) {
    strength += 1
  }

  return Math.min(strength, 4)
}
