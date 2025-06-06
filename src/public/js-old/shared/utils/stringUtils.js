/**
 * 文字列処理ユーティリティ
 * 文字列の変換・フォーマット・検証に関する汎用関数
 * @version 2.0.0
 */

/**
 * 文字列をケバブケースに変換
 * @param {string} str - 変換する文字列
 * @returns {string}
 */
export function kebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

/**
 * 文字列をキャメルケースに変換
 * @param {string} str - 変換する文字列
 * @returns {string}
 */
export function camelCase(str) {
  return str
    .replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * 文字列をパスカルケースに変換
 * @param {string} str - 変換する文字列
 * @returns {string}
 */
export function pascalCase(str) {
  return camelCase(str.charAt(0).toUpperCase() + str.slice(1));
}

/**
 * 文字列をスネークケースに変換
 * @param {string} str - 変換する文字列
 * @returns {string}
 */
export function snakeCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * 文字列を切り詰め
 * @param {string} str - 切り詰める文字列
 * @param {number} length - 最大文字数
 * @param {string} suffix - 末尾に追加する文字列
 * @returns {string}
 */
export function truncate(str, length = 100, suffix = '...') {
  if (!str || str.length <= length) return str || '';
  return str.slice(0, length) + suffix;
}

/**
 * HTMLエスケープ
 * @param {string} str - エスケープする文字列
 * @returns {string}
 */
export function escapeHtml(str) {
  if (!str) return '';
  
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * HTMLアンエスケープ
 * @param {string} str - アンエスケープする文字列
 * @returns {string}
 */
export function unescapeHtml(str) {
  if (!str) return '';
  
  const div = document.createElement('div');
  div.innerHTML = str;
  return div.textContent || div.innerText || '';
}

/**
 * 文字列の先頭と末尾の空白を削除
 * @param {string} str - トリムする文字列
 * @returns {string}
 */
export function trim(str) {
  return str ? str.trim() : '';
}

/**
 * 文字列の先頭の空白を削除
 * @param {string} str - トリムする文字列
 * @returns {string}
 */
export function trimStart(str) {
  return str ? str.replace(/^\s+/, '') : '';
}

/**
 * 文字列の末尾の空白を削除
 * @param {string} str - トリムする文字列
 * @returns {string}
 */
export function trimEnd(str) {
  return str ? str.replace(/\s+$/, '') : '';
}

/**
 * 文字列を指定文字でパディング（左）
 * @param {string} str - パディングする文字列
 * @param {number} length - 目標の文字数
 * @param {string} padString - パディング文字
 * @returns {string}
 */
export function padStart(str, length, padString = ' ') {
  return str ? str.padStart(length, padString) : '';
}

/**
 * 文字列を指定文字でパディング（右）
 * @param {string} str - パディングする文字列
 * @param {number} length - 目標の文字数
 * @param {string} padString - パディング文字
 * @returns {string}
 */
export function padEnd(str, length, padString = ' ') {
  return str ? str.padEnd(length, padString) : '';
}

/**
 * 文字列の最初の文字を大文字にする
 * @param {string} str - 変換する文字列
 * @returns {string}
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * 各単語の最初の文字を大文字にする
 * @param {string} str - 変換する文字列
 * @returns {string}
 */
export function titleCase(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => 
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

/**
 * 文字列が空または空白のみかチェック
 * @param {string} str - チェックする文字列
 * @returns {boolean}
 */
export function isEmpty(str) {
  return !str || str.trim().length === 0;
}

/**
 * 文字列が指定文字列で始まるかチェック
 * @param {string} str - チェックする文字列
 * @param {string} searchString - 検索文字列
 * @returns {boolean}
 */
export function startsWith(str, searchString) {
  return str ? str.startsWith(searchString) : false;
}

/**
 * 文字列が指定文字列で終わるかチェック
 * @param {string} str - チェックする文字列
 * @param {string} searchString - 検索文字列
 * @returns {boolean}
 */
export function endsWith(str, searchString) {
  return str ? str.endsWith(searchString) : false;
}

/**
 * 文字列に指定文字列が含まれるかチェック
 * @param {string} str - チェックする文字列
 * @param {string} searchString - 検索文字列
 * @param {boolean} caseSensitive - 大文字小文字を区別するか
 * @returns {boolean}
 */
export function contains(str, searchString, caseSensitive = true) {
  if (!str || !searchString) return false;
  
  if (caseSensitive) {
    return str.includes(searchString);
  } else {
    return str.toLowerCase().includes(searchString.toLowerCase());
  }
}

/**
 * ランダムな文字列を生成
 * @param {number} length - 文字列の長さ
 * @param {string} chars - 使用する文字セット
 * @returns {string}
 */
export function randomString(length = 8, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789') {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 文字列をファイル名として安全にする
 * @param {string} str - 変換する文字列
 * @returns {string}
 */
export function sanitizeFilename(str) {
  if (!str) return '';
  
  return str
    .replace(/[<>:"/\\|?*]/g, '') // 無効な文字を削除
    .replace(/\s+/g, '_') // スペースをアンダースコアに
    .trim();
}

/**
 * プレースホルダーを値で置換
 * @param {string} template - テンプレート文字列
 * @param {Object} values - 置換値
 * @returns {string}
 */
export function template(template, values = {}) {
  if (!template) return '';
  
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return values.hasOwnProperty(key) ? values[key] : match;
  });
}

/**
 * 複数行の文字列をHTMLの段落に変換
 * @param {string} text - 変換する文字列
 * @returns {string}
 */
export function textToParagraphs(text) {
  if (!text) return '';
  
  return text
    .split('\n\n')
    .filter(paragraph => paragraph.trim())
    .map(paragraph => `<p>${escapeHtml(paragraph.trim())}</p>`)
    .join('');
}

/**
 * URLからファイル名を抽出
 * @param {string} url - URL
 * @returns {string}
 */
export function getFilenameFromUrl(url) {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    return pathname.substring(pathname.lastIndexOf('/') + 1);
  } catch {
    return '';
  }
}

/**
 * バイト数を人間が読みやすい形式に変換
 * @param {number} bytes - バイト数
 * @param {number} decimals - 小数点以下桁数
 * @returns {string}
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 日付を指定形式でフォーマット
 * @param {Date|string|number} date - 日付
 * @param {string} format - フォーマット（'YYYY-MM-DD', 'YYYY/MM/DD', 'MM/DD/YYYY' など）
 * @returns {string}
 */
export function formatDate(date, format = 'YYYY-MM-DD') {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  
  return format
    .replace(/YYYY/g, year)
    .replace(/MM/g, month)
    .replace(/DD/g, day)
    .replace(/HH/g, hours)
    .replace(/mm/g, minutes)
    .replace(/ss/g, seconds);
}

// レガシーサポート（後方互換性）
export const Str = {
  kebabCase,
  camelCase,
  truncate,
  escapeHtml,
  unescapeHtml,
  formatDate
}; 