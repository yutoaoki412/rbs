/**
 * HTML操作ユーティリティ
 * HTML生成・テンプレート・エラー表示に関する汎用関数
 * @version 2.0.0
 */

import { escapeHtml } from './stringUtils.js';

// stringUtilsからのescapeHtmlを再エクスポート
export { escapeHtml };

/**
 * HTMLタグをアンエスケープ
 * @param {string} html - アンエスケープするHTML
 * @returns {string}
 */
export function unescapeHtml(html) {
  if (!html) return '';
  
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

/**
 * HTMLからテキストを抽出（タグを除去）
 * @param {string} html - HTML文字列
 * @returns {string}
 */
export function stripHtml(html) {
  if (!html) return '';
  
  return html.replace(/<[^>]*>/g, '');
}

/**
 * HTMLを安全にサニタイズ
 * @param {string} html - サニタイズするHTML
 * @param {string[]} allowedTags - 許可するタグリスト
 * @returns {string}
 */
export function sanitizeHtml(html, allowedTags = ['p', 'br', 'strong', 'em', 'u']) {
  if (!html) return '';
  
  // 許可されたタグ以外を除去
  const tagPattern = new RegExp(`<(?!/?(?:${allowedTags.join('|')})\\b)[^>]*>`, 'gi');
  return html.replace(tagPattern, '');
}

/**
 * テキストを指定文字数で切り詰め
 * @param {string} text - 切り詰めるテキスト
 * @param {number} maxLength - 最大文字数
 * @param {string} suffix - 切り詰め時の接尾辞
 * @returns {string}
 */
export function truncateText(text, maxLength, suffix = '...') {
  if (!text || text.length <= maxLength) return text || '';
  
  return text.substring(0, maxLength).trim() + suffix;
}

/**
 * HTMLテンプレートを作成
 * @param {string} template - テンプレート文字列
 * @param {Object} data - 置換データ
 * @returns {string}
 */
export function renderTemplate(template, data = {}) {
  if (!template) return '';
  
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? escapeHtml(String(data[key])) : match;
  });
}

/**
 * エラーメッセージのHTMLを生成
 * @param {Object} config - エラー設定
 * @param {string} config.icon - アイコン
 * @param {string} config.title - タイトル
 * @param {string} config.message - メッセージ
 * @param {Array} config.actions - アクションボタン
 * @returns {string}
 */
export function createErrorMessage(config) {
  const { icon = '❌', title = 'エラー', message = '', actions = [] } = config;
  
  const actionsHtml = actions.map(action => {
    if (action.href) {
      return `<a href="${escapeHtml(action.href)}" class="btn ${escapeHtml(action.class || 'btn-primary')}">${escapeHtml(action.text)}</a>`;
    } else if (action.onclick) {
      return `<button onclick="${escapeHtml(action.onclick)}" class="btn ${escapeHtml(action.class || 'btn-primary')}">${escapeHtml(action.text)}</button>`;
    }
    return '';
  }).join(' ');
  
  return `
    <div class="error-container" style="text-align: center; padding: 40px; background: #f7fafc; border-radius: 8px; margin: 20px;">
      <div class="error-icon" style="font-size: 48px; margin-bottom: 16px;">${icon}</div>
      <h2 class="error-title" style="color: #2d3748; margin-bottom: 12px; font-size: 24px;">${escapeHtml(title)}</h2>
      <p class="error-message" style="color: #4a5568; margin-bottom: 24px; line-height: 1.6;">${escapeHtml(message)}</p>
      ${actionsHtml ? `<div class="error-actions" style="margin-top: 24px;">${actionsHtml}</div>` : ''}
    </div>
  `;
}

/**
 * ローディングスピナーのHTMLを生成
 * @param {Object} options - オプション
 * @param {string} options.message - メッセージ
 * @param {string} options.size - サイズ (small, medium, large)
 * @returns {string}
 */
export function createLoadingSpinner(options = {}) {
  const { message = '読み込み中...', size = 'medium' } = options;
  
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8', 
    large: 'w-12 h-12'
  };
  
  const sizeClass = sizeClasses[size] || sizeClasses.medium;
  
  return `
    <div class="loading-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px;">
      <div class="spinner ${sizeClass}" style="
        border: 3px solid #e2e8f0;
        border-top: 3px solid #4299e1;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin-bottom: 16px;
      "></div>
      <p class="loading-message" style="color: #4a5568; margin: 0;">${escapeHtml(message)}</p>
    </div>
    <style>
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    </style>
  `;
}

/**
 * 成功メッセージのHTMLを生成
 * @param {string} message - メッセージ
 * @param {Object} options - オプション
 * @returns {string}
 */
export function createSuccessMessage(message, options = {}) {
  const { icon = '✅', dismissible = true } = options;
  
  const dismissButton = dismissible ? 
    '<button type="button" class="close" onclick="this.parentElement.remove()" style="position: absolute; top: 8px; right: 12px; background: none; border: none; font-size: 18px; cursor: pointer; color: #276749;">&times;</button>' : '';
  
  return `
    <div class="success-message" style="
      position: relative;
      background-color: #f0fff4;
      border: 1px solid #9ae6b4;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 12px 0;
      color: #276749;
    ">
      ${dismissButton}
      <div style="display: flex; align-items: center;">
        <span style="margin-right: 8px; font-size: 16px;">${icon}</span>
        <span>${escapeHtml(message)}</span>
      </div>
    </div>
  `;
}

/**
 * 警告メッセージのHTMLを生成
 * @param {string} message - メッセージ
 * @param {Object} options - オプション
 * @returns {string}
 */
export function createWarningMessage(message, options = {}) {
  const { icon = '⚠️', dismissible = true } = options;
  
  const dismissButton = dismissible ? 
    '<button type="button" class="close" onclick="this.parentElement.remove()" style="position: absolute; top: 8px; right: 12px; background: none; border: none; font-size: 18px; cursor: pointer; color: #975a16;">&times;</button>' : '';
  
  return `
    <div class="warning-message" style="
      position: relative;
      background-color: #fffbeb;
      border: 1px solid #fed7aa;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 12px 0;
      color: #975a16;
    ">
      ${dismissButton}
      <div style="display: flex; align-items: center;">
        <span style="margin-right: 8px; font-size: 16px;">${icon}</span>
        <span>${escapeHtml(message)}</span>
      </div>
    </div>
  `;
}

/**
 * 情報メッセージのHTMLを生成
 * @param {string} message - メッセージ
 * @param {Object} options - オプション
 * @returns {string}
 */
export function createInfoMessage(message, options = {}) {
  const { icon = 'ℹ️', dismissible = true } = options;
  
  const dismissButton = dismissible ? 
    '<button type="button" class="close" onclick="this.parentElement.remove()" style="position: absolute; top: 8px; right: 12px; background: none; border: none; font-size: 18px; cursor: pointer; color: #2c5282;">&times;</button>' : '';
  
  return `
    <div class="info-message" style="
      position: relative;
      background-color: #ebf8ff;
      border: 1px solid #90cdf4;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 12px 0;
      color: #2c5282;
    ">
      ${dismissButton}
      <div style="display: flex; align-items: center;">
        <span style="margin-right: 8px; font-size: 16px;">${icon}</span>
        <span>${escapeHtml(message)}</span>
      </div>
    </div>
  `;
}

/**
 * カードのHTMLを生成
 * @param {Object} config - カード設定
 * @param {string} config.title - タイトル
 * @param {string} config.content - 内容
 * @param {string} config.footer - フッター
 * @param {string} config.className - クラス名
 * @returns {string}
 */
export function createCard(config) {
  const { title = '', content = '', footer = '', className = '' } = config;
  
  return `
    <div class="card ${escapeHtml(className)}" style="
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    ">
      ${title ? `
        <div class="card-header" style="
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
          background: #f7fafc;
        ">
          <h3 class="card-title" style="margin: 0; font-size: 18px; font-weight: 600; color: #2d3748;">
            ${escapeHtml(title)}
          </h3>
        </div>
      ` : ''}
      <div class="card-body" style="padding: 20px;">
        ${content}
      </div>
      ${footer ? `
        <div class="card-footer" style="
          padding: 16px 20px;
          border-top: 1px solid #e2e8f0;
          background: #f7fafc;
        ">
          ${footer}
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * ボタンのHTMLを生成
 * @param {Object} config - ボタン設定
 * @param {string} config.text - ボタンテキスト
 * @param {string} config.type - ボタンタイプ
 * @param {string} config.variant - バリアント
 * @param {string} config.href - リンク先
 * @param {string} config.onclick - クリックイベント
 * @param {boolean} config.disabled - 無効フラグ
 * @returns {string}
 */
export function createButton(config) {
  const { 
    text = '', 
    type = 'button', 
    variant = 'primary', 
    href = '', 
    onclick = '', 
    disabled = false,
    className = ''
  } = config;
  
  const baseStyles = `
    display: inline-block;
    padding: 8px 16px;
    border-radius: 6px;
    text-decoration: none;
    border: none;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
  `;
  
  const variants = {
    primary: 'background: #4299e1; color: white;',
    secondary: 'background: #718096; color: white;',
    success: 'background: #38a169; color: white;',
    danger: 'background: #e53e3e; color: white;',
    warning: 'background: #d69e2e; color: white;',
    outline: 'background: transparent; color: #4299e1; border: 1px solid #4299e1;'
  };
  
  const variantStyle = variants[variant] || variants.primary;
  const disabledStyle = disabled ? 'opacity: 0.5; cursor: not-allowed;' : '';
  
  if (href && !disabled) {
    return `
      <a href="${escapeHtml(href)}" 
         class="btn btn-${variant} ${escapeHtml(className)}"
         style="${baseStyles} ${variantStyle}">
        ${escapeHtml(text)}
      </a>
    `;
  } else {
    return `
      <button type="${escapeHtml(type)}"
              class="btn btn-${variant} ${escapeHtml(className)}"
              style="${baseStyles} ${variantStyle} ${disabledStyle}"
              ${onclick ? `onclick="${escapeHtml(onclick)}"` : ''}
              ${disabled ? 'disabled' : ''}>
        ${escapeHtml(text)}
      </button>
    `;
  }
}

/**
 * バッジのHTMLを生成
 * @param {string} text - バッジテキスト
 * @param {string} variant - バリアント
 * @returns {string}
 */
export function createBadge(text, variant = 'primary') {
  const variants = {
    primary: 'background: #4299e1; color: white;',
    secondary: 'background: #718096; color: white;',
    success: 'background: #38a169; color: white;',
    danger: 'background: #e53e3e; color: white;',
    warning: 'background: #d69e2e; color: white;',
    info: 'background: #3182ce; color: white;'
  };
  
  const variantStyle = variants[variant] || variants.primary;
  
  return `
    <span class="badge badge-${variant}" style="
      display: inline-block;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      ${variantStyle}
    ">
      ${escapeHtml(text)}
    </span>
  `;
}

/**
 * 空の状態を表すHTMLを生成
 * @param {Object} config - 設定
 * @param {string} config.icon - アイコン
 * @param {string} config.title - タイトル
 * @param {string} config.message - メッセージ
 * @param {Object} config.action - アクションボタン
 * @returns {string}
 */
export function createEmptyState(config) {
  const { 
    icon = '📄', 
    title = 'データがありません', 
    message = '', 
    action = null 
  } = config;
  
  const actionHtml = action ? createButton(action) : '';
  
  return `
    <div class="empty-state" style="
      text-align: center;
      padding: 60px 20px;
      color: #718096;
    ">
      <div class="empty-icon" style="font-size: 64px; margin-bottom: 20px;">
        ${icon}
      </div>
      <h3 class="empty-title" style="
        margin: 0 0 12px 0;
        font-size: 20px;
        font-weight: 600;
        color: #4a5568;
      ">
        ${escapeHtml(title)}
      </h3>
      ${message ? `
        <p class="empty-message" style="
          margin: 0 0 24px 0;
          line-height: 1.6;
        ">
          ${escapeHtml(message)}
        </p>
      ` : ''}
      ${actionHtml ? `<div class="empty-action">${actionHtml}</div>` : ''}
    </div>
  `;
}

/**
 * プログレスバーのHTMLを生成
 * @param {number} progress - 進捗（0-100）
 * @param {Object} options - オプション
 * @returns {string}
 */
export function createProgressBar(progress, options = {}) {
  const { 
    showLabel = true, 
    variant = 'primary', 
    height = '8px',
    className = ''
  } = options;
  
  const clampedProgress = Math.max(0, Math.min(100, progress));
  
  const variants = {
    primary: '#4299e1',
    success: '#38a169',
    warning: '#d69e2e',
    danger: '#e53e3e'
  };
  
  const color = variants[variant] || variants.primary;
  
  return `
    <div class="progress-container ${escapeHtml(className)}" style="width: 100%;">
      ${showLabel ? `
        <div class="progress-label" style="
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-size: 14px;
          color: #4a5568;
        ">
          <span>進捗</span>
          <span>${clampedProgress}%</span>
        </div>
      ` : ''}
      <div class="progress-track" style="
        width: 100%;
        height: ${height};
        background-color: #e2e8f0;
        border-radius: 4px;
        overflow: hidden;
      ">
        <div class="progress-bar" style="
          width: ${clampedProgress}%;
          height: 100%;
          background-color: ${color};
          transition: width 0.3s ease;
        "></div>
      </div>
    </div>
  `;
}

/**
 * アラートダイアログのHTMLを生成
 * @param {Object} config - 設定
 * @returns {string}
 */
export function createAlert(config) {
  const { 
    title = '', 
    message = '', 
    type = 'info', 
    actions = [],
    dismissible = true 
  } = config;
  
  const typeConfig = {
    success: { icon: '✅', bgColor: '#f0fff4', borderColor: '#9ae6b4', textColor: '#276749' },
    error: { icon: '❌', bgColor: '#fed7d7', borderColor: '#feb2b2', textColor: '#742a2a' },
    warning: { icon: '⚠️', bgColor: '#fffbeb', borderColor: '#fed7aa', textColor: '#975a16' },
    info: { icon: 'ℹ️', bgColor: '#ebf8ff', borderColor: '#90cdf4', textColor: '#2c5282' }
  };
  
  const config_type = typeConfig[type] || typeConfig.info;
  
  const dismissButton = dismissible ? 
    `<button type="button" class="alert-close" onclick="this.closest('.alert').remove()" style="
      position: absolute;
      top: 12px;
      right: 12px;
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: ${config_type.textColor};
      opacity: 0.7;
    ">&times;</button>` : '';
  
  const actionsHtml = actions.length > 0 ? 
    `<div class="alert-actions" style="margin-top: 16px;">
      ${actions.map(action => createButton(action)).join(' ')}
    </div>` : '';
  
  return `
    <div class="alert alert-${type}" style="
      position: relative;
      background-color: ${config_type.bgColor};
      border: 1px solid ${config_type.borderColor};
      border-radius: 8px;
      padding: 16px 20px;
      margin: 16px 0;
      color: ${config_type.textColor};
    ">
      ${dismissButton}
      <div style="display: flex; align-items: flex-start;">
        <span style="margin-right: 12px; font-size: 20px; flex-shrink: 0;">
          ${config_type.icon}
        </span>
        <div style="flex: 1;">
          ${title ? `
            <h4 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
              ${escapeHtml(title)}
            </h4>
          ` : ''}
          ${message ? `
            <p style="margin: 0; line-height: 1.6;">
              ${escapeHtml(message)}
            </p>
          ` : ''}
          ${actionsHtml}
        </div>
      </div>
    </div>
  `;
} 