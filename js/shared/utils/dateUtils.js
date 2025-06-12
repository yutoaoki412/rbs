/**
 * 日付操作ユーティリティ
 * 日付のフォーマット・比較・計算に関する汎用関数
 * @version 2.0.0
 */

/**
 * 日付をフォーマット
 * @param {Date|string|number} date - 日付
 * @param {string} format - フォーマット文字列
 * @returns {string}
 */
export function formatDate(date, format = 'YYYY/MM/DD') {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  const second = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second);
}

/**
 * 相対時間を取得
 * @param {Date|string|number} date - 日付
 * @returns {string}
 */
export function getRelativeTime(date) {
  if (!date) return '';
  
  const now = new Date();
  const target = new Date(date);
  
  if (isNaN(target.getTime())) return '';
  
  const diff = now - target;
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return '今';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分前`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}時間前`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}日前`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}ヶ月前`;
  return `${Math.floor(seconds / 31536000)}年前`;
}

/**
 * 日付が今日かチェック
 * @param {Date|string|number} date - 日付
 * @returns {boolean}
 */
export function isToday(date) {
  if (!date) return false;
  
  const today = new Date();
  const target = new Date(date);
  
  if (isNaN(target.getTime())) return false;
  
  return today.toDateString() === target.toDateString();
}

/**
 * 日付が昨日かチェック
 * @param {Date|string|number} date - 日付
 * @returns {boolean}
 */
export function isYesterday(date) {
  if (!date) return false;
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const target = new Date(date);
  
  if (isNaN(target.getTime())) return false;
  
  return yesterday.toDateString() === target.toDateString();
}

/**
 * 日付が明日かチェック
 * @param {Date|string|number} date - 日付
 * @returns {boolean}
 */
export function isTomorrow(date) {
  if (!date) return false;
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const target = new Date(date);
  
  if (isNaN(target.getTime())) return false;
  
  return tomorrow.toDateString() === target.toDateString();
}

/**
 * 日付が今週かチェック
 * @param {Date|string|number} date - 日付
 * @returns {boolean}
 */
export function isThisWeek(date) {
  if (!date) return false;
  
  const now = new Date();
  const target = new Date(date);
  
  if (isNaN(target.getTime())) return false;
  
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return target >= startOfWeek && target <= endOfWeek;
}

/**
 * 日付が今月かチェック
 * @param {Date|string|number} date - 日付
 * @returns {boolean}
 */
export function isThisMonth(date) {
  if (!date) return false;
  
  const now = new Date();
  const target = new Date(date);
  
  if (isNaN(target.getTime())) return false;
  
  return now.getFullYear() === target.getFullYear() &&
         now.getMonth() === target.getMonth();
}

/**
 * 日付が今年かチェック
 * @param {Date|string|number} date - 日付
 * @returns {boolean}
 */
export function isThisYear(date) {
  if (!date) return false;
  
  const now = new Date();
  const target = new Date(date);
  
  if (isNaN(target.getTime())) return false;
  
  return now.getFullYear() === target.getFullYear();
}

/**
 * 日付の差分を取得（日数）
 * @param {Date|string|number} date1 - 日付1
 * @param {Date|string|number} date2 - 日付2
 * @returns {number}
 */
export function getDaysDifference(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * 日付の差分を取得（時間）
 * @param {Date|string|number} date1 - 日付1
 * @param {Date|string|number} date2 - 日付2
 * @returns {number}
 */
export function getHoursDifference(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 0;
  
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60));
}

/**
 * 日付に日数を追加
 * @param {Date|string|number} date - ベース日付
 * @param {number} days - 追加日数
 * @returns {Date}
 */
export function addDays(date, days) {
  const result = new Date(date);
  if (isNaN(result.getTime())) return new Date();
  
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * 日付に時間を追加
 * @param {Date|string|number} date - ベース日付
 * @param {number} hours - 追加時間
 * @returns {Date}
 */
export function addHours(date, hours) {
  const result = new Date(date);
  if (isNaN(result.getTime())) return new Date();
  
  result.setHours(result.getHours() + hours);
  return result;
}

/**
 * 日付に分を追加
 * @param {Date|string|number} date - ベース日付
 * @param {number} minutes - 追加分数
 * @returns {Date}
 */
export function addMinutes(date, minutes) {
  const result = new Date(date);
  if (isNaN(result.getTime())) return new Date();
  
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

/**
 * 月の開始日を取得
 * @param {Date|string|number} date - 基準日付
 * @returns {Date}
 */
export function getStartOfMonth(date) {
  const result = new Date(date);
  if (isNaN(result.getTime())) return new Date();
  
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * 月の終了日を取得
 * @param {Date|string|number} date - 基準日付
 * @returns {Date}
 */
export function getEndOfMonth(date) {
  const result = new Date(date);
  if (isNaN(result.getTime())) return new Date();
  
  result.setMonth(result.getMonth() + 1, 0);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * 週の開始日を取得（日曜日を週の開始とする）
 * @param {Date|string|number} date - 基準日付
 * @returns {Date}
 */
export function getStartOfWeek(date) {
  const result = new Date(date);
  if (isNaN(result.getTime())) return new Date();
  
  const day = result.getDay();
  result.setDate(result.getDate() - day);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * 週の終了日を取得（土曜日を週の終了とする）
 * @param {Date|string|number} date - 基準日付
 * @returns {Date}
 */
export function getEndOfWeek(date) {
  const result = new Date(date);
  if (isNaN(result.getTime())) return new Date();
  
  const day = result.getDay();
  result.setDate(result.getDate() + (6 - day));
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * 日付が有効かチェック
 * @param {Date|string|number} date - 日付
 * @returns {boolean}
 */
export function isValidDate(date) {
  const d = new Date(date);
  return !isNaN(d.getTime());
}

/**
 * ISO文字列から日付を作成
 * @param {string} isoString - ISO文字列
 * @returns {Date|null}
 */
export function fromISO(isoString) {
  if (!isoString) return null;
  
  const date = new Date(isoString);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * 日付をISO文字列に変換
 * @param {Date|string|number} date - 日付
 * @returns {string}
 */
export function toISO(date) {
  const d = new Date(date);
  return isNaN(d.getTime()) ? '' : d.toISOString();
}

/**
 * 日本時間での日付文字列を取得
 * @param {Date|string|number} date - 日付
 * @param {Object} options - オプション
 * @returns {string}
 */
export function toJapaneseFormat(date, options = {}) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const {
    showYear = true,
    showTime = false,
    showSeconds = false
  } = options;
  
  let result = '';
  
  if (showYear) {
    result += `${d.getFullYear()}年`;
  }
  
  result += `${d.getMonth() + 1}月${d.getDate()}日`;
  
  if (showTime) {
    result += ` ${d.getHours()}時${d.getMinutes()}分`;
    
    if (showSeconds) {
      result += `${d.getSeconds()}秒`;
    }
  }
  
  return result;
}

/**
 * 曜日を取得
 * @param {Date|string|number} date - 日付
 * @param {boolean} short - 短縮形かどうか
 * @returns {string}
 */
export function getDayOfWeek(date, short = false) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const days = short ? 
    ['日', '月', '火', '水', '木', '金', '土'] :
    ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
  
  return days[d.getDay()];
}

/**
 * 年齢を計算
 * @param {Date|string|number} birthDate - 生年月日
 * @param {Date|string|number} currentDate - 基準日（省略時は今日）
 * @returns {number}
 */
export function calculateAge(birthDate, currentDate = new Date()) {
  const birth = new Date(birthDate);
  const current = new Date(currentDate);
  
  if (isNaN(birth.getTime()) || isNaN(current.getTime())) return 0;
  
  let age = current.getFullYear() - birth.getFullYear();
  const monthDiff = current.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && current.getDate() < birth.getDate())) {
    age--;
  }
  
  return Math.max(0, age);
}

// レガシーサポート（後方互換性）
export const DateUtils = {
  format: formatDate,
  relative: getRelativeTime,
  isToday
}; 