/**
 * URL操作ユーティリティ
 * URL解析・操作・バリデーションに関する汎用関数
 * @version 2.0.0
 */

/**
 * URLパラメータを取得
 * @param {string} name - パラメータ名
 * @param {string} url - URL（省略時は現在のURL）
 * @returns {string|null}
 */
export function getUrlParameter(name, url = window.location.href) {
  try {
    const urlObj = new URL(url);
    return urlObj.searchParams.get(name);
  } catch (error) {
    console.warn(`Invalid URL: ${url}`, error);
    return null;
  }
}

/**
 * すべてのURLパラメータを取得
 * @param {string} url - URL（省略時は現在のURL）
 * @returns {Object}
 */
export function getAllUrlParameters(url = window.location.href) {
  try {
    const urlObj = new URL(url);
    const params = {};
    
    for (const [key, value] of urlObj.searchParams) {
      params[key] = value;
    }
    
    return params;
  } catch (error) {
    console.warn(`Invalid URL: ${url}`, error);
    return {};
  }
}

/**
 * URLパラメータを設定
 * @param {string} name - パラメータ名
 * @param {string} value - パラメータ値
 * @param {string} url - ベースURL（省略時は現在のURL）
 * @returns {string}
 */
export function setUrlParameter(name, value, url = window.location.href) {
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set(name, value);
    return urlObj.toString();
  } catch (error) {
    console.warn(`Invalid URL: ${url}`, error);
    return url;
  }
}

/**
 * URLパラメータを削除
 * @param {string} name - パラメータ名
 * @param {string} url - ベースURL（省略時は現在のURL）
 * @returns {string}
 */
export function removeUrlParameter(name, url = window.location.href) {
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.delete(name);
    return urlObj.toString();
  } catch (error) {
    console.warn(`Invalid URL: ${url}`, error);
    return url;
  }
}

/**
 * URLパラメータをオブジェクトから設定
 * @param {Object} params - パラメータオブジェクト
 * @param {string} url - ベースURL（省略時は現在のURL）
 * @returns {string}
 */
export function setUrlParameters(params, url = window.location.href) {
  try {
    const urlObj = new URL(url);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        urlObj.searchParams.set(key, value);
      } else {
        urlObj.searchParams.delete(key);
      }
    });
    
    return urlObj.toString();
  } catch (error) {
    console.warn(`Invalid URL: ${url}`, error);
    return url;
  }
}

/**
 * URLを構築
 * @param {string} baseUrl - ベースURL
 * @param {Object} params - パラメータオブジェクト
 * @returns {string}
 */
export function buildUrl(baseUrl, params = {}) {
  try {
    const urlObj = new URL(baseUrl);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        urlObj.searchParams.set(key, value);
      }
    });
    
    return urlObj.toString();
  } catch (error) {
    console.warn(`Invalid base URL: ${baseUrl}`, error);
    return baseUrl;
  }
}

/**
 * 相対URLを絶対URLに変換
 * @param {string} relativeUrl - 相対URL
 * @param {string} baseUrl - ベースURL（省略時は現在のURL）
 * @returns {string}
 */
export function toAbsoluteUrl(relativeUrl, baseUrl = window.location.href) {
  try {
    return new URL(relativeUrl, baseUrl).toString();
  } catch (error) {
    console.warn(`Cannot convert to absolute URL: ${relativeUrl}`, error);
    return relativeUrl;
  }
}

/**
 * URLのホスト名を取得
 * @param {string} url - URL
 * @returns {string}
 */
export function getHostname(url) {
  try {
    return new URL(url).hostname;
  } catch (error) {
    console.warn(`Invalid URL: ${url}`, error);
    return '';
  }
}

/**
 * URLのパス部分を取得
 * @param {string} url - URL
 * @returns {string}
 */
export function getPathname(url) {
  try {
    return new URL(url).pathname;
  } catch (error) {
    console.warn(`Invalid URL: ${url}`, error);
    return '';
  }
}

/**
 * URLのハッシュ部分を取得
 * @param {string} url - URL
 * @returns {string}
 */
export function getHash(url) {
  try {
    return new URL(url).hash;
  } catch (error) {
    console.warn(`Invalid URL: ${url}`, error);
    return '';
  }
}

/**
 * URLが有効かチェック
 * @param {string} url - URL
 * @returns {boolean}
 */
export function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * URLが外部URLかチェック
 * @param {string} url - URL
 * @param {string} currentHost - 現在のホスト（省略時は現在のホスト）
 * @returns {boolean}
 */
export function isExternalUrl(url, currentHost = window.location.hostname) {
  try {
    const urlHost = new URL(url).hostname;
    return urlHost !== currentHost;
  } catch {
    return false;
  }
}

/**
 * URLがHTTPSかチェック
 * @param {string} url - URL
 * @returns {boolean}
 */
export function isHttps(url) {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * クエリストリングをオブジェクトに変換
 * @param {string} queryString - クエリストリング
 * @returns {Object}
 */
export function parseQueryString(queryString) {
  const params = {};
  
  if (!queryString) return params;
  
  // 先頭の?を削除
  const cleanQuery = queryString.startsWith('?') ? queryString.slice(1) : queryString;
  
  if (!cleanQuery) return params;
  
  cleanQuery.split('&').forEach(param => {
    const [key, value] = param.split('=');
    if (key) {
      params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
    }
  });
  
  return params;
}

/**
 * オブジェクトをクエリストリングに変換
 * @param {Object} params - パラメータオブジェクト
 * @returns {string}
 */
export function stringifyQueryParams(params) {
  if (!params || typeof params !== 'object') return '';
  
  const parts = [];
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  });
  
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

/**
 * URLのファイル拡張子を取得
 * @param {string} url - URL
 * @returns {string}
 */
export function getFileExtension(url) {
  try {
    const pathname = new URL(url).pathname;
    const lastDotIndex = pathname.lastIndexOf('.');
    
    if (lastDotIndex === -1 || lastDotIndex === pathname.length - 1) {
      return '';
    }
    
    return pathname.slice(lastDotIndex + 1).toLowerCase();
  } catch {
    return '';
  }
}

/**
 * URLからファイル名を取得
 * @param {string} url - URL
 * @param {boolean} includeExtension - 拡張子を含むか
 * @returns {string}
 */
export function getFilename(url, includeExtension = true) {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.substring(pathname.lastIndexOf('/') + 1);
    
    if (!includeExtension) {
      const lastDotIndex = filename.lastIndexOf('.');
      return lastDotIndex !== -1 ? filename.slice(0, lastDotIndex) : filename;
    }
    
    return filename;
  } catch {
    return '';
  }
}

/**
 * URLを正規化（末尾のスラッシュ統一など）
 * @param {string} url - URL
 * @param {boolean} trailingSlash - 末尾スラッシュを追加するか
 * @returns {string}
 */
export function normalizeUrl(url, trailingSlash = false) {
  try {
    const urlObj = new URL(url);
    
    // パスの正規化
    let pathname = urlObj.pathname;
    
    if (trailingSlash && !pathname.endsWith('/') && !getFileExtension(url)) {
      pathname += '/';
    } else if (!trailingSlash && pathname.endsWith('/') && pathname !== '/') {
      pathname = pathname.slice(0, -1);
    }
    
    urlObj.pathname = pathname;
    
    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * 現在のページの種類を判定
 * @returns {string}
 */
export function getCurrentPageType() {
  const pathname = window.location.pathname;
  
  if (pathname.includes('news-detail')) {
    return 'news-detail';
  } else if (pathname.includes('news.html')) {
    return 'news-list';
  } else if (pathname.includes('admin.html')) {
    return 'admin';
  } else if (pathname.includes('admin-login.html')) {
    return 'admin-login';
  } else if (pathname.includes('index.html') || pathname === '/' || pathname === '') {
    return 'home';
  }
  
  return 'other';
}

/**
 * ベースURLを取得
 * @returns {string}
 */
export function getBaseUrl() {
  return `${window.location.protocol}//${window.location.host}`;
}

/**
 * URLからドメイン名を取得
 * @param {string} url - URL
 * @returns {string}
 */
export function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

/**
 * URLのプロトコルを取得
 * @param {string} url - URL
 * @returns {string}
 */
export function getProtocol(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol;
  } catch {
    return '';
  }
}

/**
 * URLのポート番号を取得
 * @param {string} url - URL
 * @returns {string}
 */
export function getPort(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.port;
  } catch {
    return '';
  }
}

/**
 * SNSシェア用URLを生成
 * @param {string} platform - プラットフォーム (twitter, facebook, line)
 * @param {Object} options - オプション
 * @param {string} options.url - シェアするURL
 * @param {string} options.text - シェアテキスト
 * @param {string} options.hashtags - ハッシュタグ (Twitter用)
 * @returns {string}
 */
export function generateShareUrl(platform, options = {}) {
  const { url = window.location.href, text = '', hashtags = '' } = options;
  
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  
  switch (platform.toLowerCase()) {
    case 'twitter':
      return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}${hashtags ? `&hashtags=${encodeURIComponent(hashtags)}` : ''}`;
    
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    
    case 'line':
      return `https://social-plugins.line.me/lineit/share?url=${encodedUrl}&text=${encodedText}`;
    
    default:
      console.warn('Unsupported platform:', platform);
      return '';
  }
}

/**
 * 現在のURLをクリップボードにコピー
 * @returns {Promise<boolean>}
 */
export async function copyCurrentUrl() {
  try {
    await navigator.clipboard.writeText(window.location.href);
    return true;
  } catch (error) {
    console.warn('Failed to copy URL:', error);
    return false;
  }
}

/**
 * 指定したURLを新しいタブで開く
 * @param {string} url - 開くURL
 * @param {string} [windowName] - ウィンドウ名
 * @param {string} [features] - ウィンドウの特徴
 * @returns {Window|null}
 */
export function openInNewTab(url, windowName = '_blank', features = 'noopener,noreferrer') {
  try {
    return window.open(url, windowName, features);
  } catch (error) {
    console.warn('Failed to open URL:', url, error);
    return null;
  }
} 