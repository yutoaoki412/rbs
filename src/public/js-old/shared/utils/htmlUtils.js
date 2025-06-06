/**
 * HTML操作ユーティリティ
 * HTML生成・テンプレート・エラー表示に関する汎用関数
 * @version 2.0.0 - インラインCSS統合リファクタリング版
 */

import { escapeHtml } from './stringUtils.js';

// stringUtilsからのescapeHtmlを再エクスポート
export { escapeHtml };

/**
 * DOM要素を作成
 * @param {string} tagName - タグ名
 * @param {Object} attributes - 属性
 * @param {string|HTMLElement} content - 内容
 * @returns {HTMLElement}
 */
export function createElement(tagName, attributes = {}, content = '') {
  const element = document.createElement(tagName);
  
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else {
      element.setAttribute(key, value);
    }
  });
  
  if (typeof content === 'string') {
    element.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    element.appendChild(content);
  }
  
  return element;
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
 * エラー状態のHTMLを生成
 * @param {string} title - エラータイトル
 * @param {string} message - エラーメッセージ  
 * @param {string} icon - アイコン（絵文字）
 * @param {Array} actions - アクションボタン配列
 * @returns {string}
 */
export function createErrorHtml(title = 'エラー', message = 'エラーが発生しました', icon = '⚠️', actions = []) {
  // アクションボタンのHTML生成
  const actionsHtml = actions.length > 0 ? 
    actions.map(action => `<button class="btn btn-${action.type || 'primary'}" onclick="${action.onclick}">${escapeHtml(action.text)}</button>`).join('') : '';

  return `
<div class="error-container">
  <div class="error-icon">${icon}</div>
  <h2 class="error-title">${escapeHtml(title)}</h2>
  <p class="error-message">${escapeHtml(message)}</p>
  ${actionsHtml ? `<div class="error-actions">${actionsHtml}</div>` : ''}
</div>
  `;
}

/**
 * ローディング状態のHTMLを生成
 * @param {string} message - ローディングメッセージ
 * @param {string} size - スピナーサイズ ('sm', 'md', 'lg')
 * @returns {string}
 */
export function createLoadingHtml(message = '読み込み中...', size = 'md') {
  const sizeClass = `spinner-${size}`;
  
  return `
<div class="loading-container">
  <div class="spinner ${sizeClass}"></div>
  ${message ? `<p class="loading-message">${escapeHtml(message)}</p>` : ''}
</div>
  `;
}

/**
 * 成功メッセージのHTMLを生成
 * @param {string} message - 成功メッセージ
 * @param {string} title - タイトル（オプション）
 * @param {boolean} dismissible - 閉じるボタンを表示するか
 * @returns {string}
 */
export function createSuccessHtml(message, title = '', dismissible = true) {
  const icon = '✅';
  const closeButton = dismissible ? 
    '<button type="button" class="notification-close" onclick="this.parentElement.remove()">&times;</button>' : '';

  return `
<div class="notification-message notification-success">
  ${closeButton}
  <div class="notification-content">
    <span class="notification-icon">${icon}</span>
    <div>
      ${title ? `<strong>${escapeHtml(title)}</strong><br>` : ''}
      ${escapeHtml(message)}
    </div>
  </div>
</div>
  `;
}

/**
 * 警告メッセージのHTMLを生成
 * @param {string} message - 警告メッセージ
 * @param {string} title - タイトル（オプション）
 * @param {boolean} dismissible - 閉じるボタンを表示するか
 * @returns {string}
 */
export function createWarningHtml(message, title = '', dismissible = true) {
  const icon = '⚠️';
  const closeButton = dismissible ? 
    '<button type="button" class="notification-close" onclick="this.parentElement.remove()">&times;</button>' : '';

  return `
<div class="notification-message notification-warning">
  ${closeButton}
  <div class="notification-content">
    <span class="notification-icon">${icon}</span>
    <div>
      ${title ? `<strong>${escapeHtml(title)}</strong><br>` : ''}
      ${escapeHtml(message)}
    </div>
  </div>
</div>
  `;
}

/**
 * 情報メッセージのHTMLを生成
 * @param {string} message - 情報メッセージ
 * @param {string} title - タイトル（オプション）
 * @param {boolean} dismissible - 閉じるボタンを表示するか
 * @returns {string}
 */
export function createInfoHtml(message, title = '', dismissible = true) {
  const icon = 'ℹ️';
  const closeButton = dismissible ? 
    '<button type="button" class="notification-close" onclick="this.parentElement.remove()">&times;</button>' : '';

  return `
<div class="notification-message notification-info">
  ${closeButton}
  <div class="notification-content">
    <span class="notification-icon">${icon}</span>
    <div>
      ${title ? `<strong>${escapeHtml(title)}</strong><br>` : ''}
      ${escapeHtml(message)}
    </div>
  </div>
</div>
  `;
}

/**
 * カードコンポーネントのHTMLを生成
 * @param {string} title - カードタイトル
 * @param {string} content - カード内容
 * @param {string} footer - カードフッター（オプション）
 * @param {string} className - 追加CSSクラス
 * @returns {string}
 */
export function createCardHtml(title = '', content = '', footer = '', className = '') {
  return `
<div class="card-default ${escapeHtml(className)}">
  ${title ? `
    <div class="card-header-default">
      <h3 class="card-title">
        ${escapeHtml(title)}
      </h3>
    </div>
  ` : ''}
  <div class="card-body">
    ${content}
  </div>
  ${footer ? `
    <div class="card-footer-default">
      ${footer}
    </div>
  ` : ''}
</div>
  `;
}

/**
 * ボタンのHTMLを生成
 * @param {string} text - ボタンテキスト
 * @param {string} variant - ボタンの種類
 * @param {Object} attributes - 追加属性
 * @returns {string}
 */
export function createButtonHtml(text, variant = 'primary', attributes = {}) {
  const baseStyles = 'display: inline-block; padding: 8px 16px; border-radius: 6px; text-decoration: none; border: none; cursor: pointer; font-weight: 500; transition: all 0.2s ease;';
  
  const variantStyles = {
    primary: 'background: #4299e1; color: white;',
    secondary: 'background: #718096; color: white;',
    success: 'background: #48bb78; color: white;',
    warning: 'background: #ed8936; color: white;',
    danger: 'background: #f56565; color: white;',
    outline: 'background: transparent; color: #4299e1; border: 1px solid #4299e1;'
  };
  
  const variantStyle = variantStyles[variant] || variantStyles.primary;
  const disabledStyle = attributes.disabled ? 'opacity: 0.6; cursor: not-allowed;' : '';
  
  // 属性を文字列に変換
  const attrsStr = Object.entries(attributes)
    .filter(([key]) => key !== 'disabled')
    .map(([key, value]) => `${key}="${escapeHtml(value)}"`)
    .join(' ');

  const element = attributes.href ? 'a' : 'button';
  
  if (attributes.disabled) {
    return `<${element} ${attrsStr} class="${variantClass} ${disabledClass}" disabled>${escapeHtml(text)}</${element}>`;
  } else {
    return `<${element} ${attrsStr} class="${variantClass}">${escapeHtml(text)}</${element}>`;
  }
}

/**
 * バッジのHTMLを生成
 * @param {string} text - バッジテキスト
 * @param {string} variant - バッジの種類
 * @returns {string}
 */
export function createBadgeHtml(text, variant = 'primary') {
  return `
<span class="badge badge-${variant}">
  ${escapeHtml(text)}
</span>
  `;
}

/**
 * 空状態のHTMLを生成
 * @param {string} title - タイトル
 * @param {string} message - メッセージ
 * @param {string} icon - アイコン
 * @param {string} actionHtml - アクションボタンのHTML
 * @returns {string}
 */
export function createEmptyStateHtml(title = '項目がありません', message = '', icon = '📝', actionHtml = '') {
  return `
<div class="empty-state">
  <div class="empty-icon">
    ${icon}
  </div>
  <h3 class="empty-title">
    ${escapeHtml(title)}
  </h3>
  ${message ? `
    <p class="empty-message">
      ${escapeHtml(message)}
    </p>
  ` : ''}
  ${actionHtml}
</div>
  `;
}

/**
 * プログレスバーのHTMLを生成
 * @param {number} value - 現在値
 * @param {number} max - 最大値
 * @param {string} label - ラベル
 * @param {string} className - 追加CSSクラス
 * @returns {string}
 */
export function createProgressHtml(value = 0, max = 100, label = '', className = '') {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  return `
<div class="progress-container ${escapeHtml(className)}">
  ${label ? `
    <div class="progress-label">
      <span>${escapeHtml(label)}</span>
      <span>${value}/${max}</span>
    </div>
  ` : ''}
  <div class="progress-track">
    <div class="progress-bar" data-progress="${percentage}"></div>
  </div>
</div>
  `;
}

/**
 * アラートのHTMLを生成
 * @param {string} message - メッセージ
 * @param {string} type - アラートタイプ
 * @param {string} title - タイトル（オプション）
 * @param {boolean} dismissible - 閉じるボタンを表示するか
 * @param {string} actions - アクションボタンのHTML
 * @returns {string}
 */
export function createAlertHtml(message, type = 'info', title = '', dismissible = true, actions = '') {
  const icons = {
    success: '✅',
    warning: '⚠️',
    error: '❌',
    info: 'ℹ️'
  };
  
  const icon = icons[type] || icons.info;
  const closeButton = dismissible ? 
    `<button type="button" class="alert-close" onclick="this.closest('.alert').remove()">&times;</button>` : '';
  
  const actionSection = actions ? 
    `<div class="alert-actions">${actions}</div>` : '';

  return `
<div class="alert alert-${type}">
  ${closeButton}
  <div class="alert-content">
    <span class="alert-icon">
      ${icon}
    </span>
    <div class="alert-body">
      ${title ? `
        <h4 class="alert-title">
          ${escapeHtml(title)}
        </h4>
      ` : ''}
      <p class="alert-message">
        ${escapeHtml(message)}
      </p>
    </div>
  </div>
  ${actionSection}
</div>
  `;
}

/**
 * テーブルのHTMLを生成
 * @param {Array} headers - ヘッダー配列
 * @param {Array} rows - 行データ配列
 * @param {string} className - 追加CSSクラス
 * @returns {string}
 */
export function createTableHtml(headers = [], rows = [], className = '') {
  const headerHtml = headers.length > 0 ? 
    `<thead><tr>${headers.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead>` : '';
  
  const rowsHtml = rows.length > 0 ?
    `<tbody>${rows.map(row => 
      `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
    ).join('')}</tbody>` : '';
  
  return `
<table class="table ${escapeHtml(className)}">
  ${headerHtml}
  ${rowsHtml}
</table>
  `;
}

/**
 * リストのHTMLを生成
 * @param {Array} items - アイテム配列
 * @param {boolean} ordered - 順序付きリストかどうか
 * @param {string} className - 追加CSSクラス
 * @returns {string}
 */
export function createListHtml(items = [], ordered = false, className = '') {
  const tag = ordered ? 'ol' : 'ul';
  const itemsHtml = items.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  
  return `<${tag} class="${escapeHtml(className)}">${itemsHtml}</${tag}>`;
}

/**
 * モーダルのHTMLを生成
 * @param {string} title - モーダルタイトル
 * @param {string} content - モーダル内容
 * @param {string} footer - モーダルフッター
 * @param {string} className - 追加CSSクラス
 * @returns {string}
 */
export function createModalHtml(title = '', content = '', footer = '', className = '') {
  return `
<div class="modal ${escapeHtml(className)}">
  <div class="modal-content">
    ${title ? `
      <div class="modal-header">
        <h2 class="modal-title">${escapeHtml(title)}</h2>
      </div>
    ` : ''}
    <div class="modal-body">
      ${content}
    </div>
    ${footer ? `
      <div class="modal-footer">
        ${footer}
      </div>
    ` : ''}
  </div>
</div>
  `;
}

/**
 * フォームフィールドのHTMLを生成
 * @param {string} type - インプットタイプ
 * @param {string} name - フィールド名
 * @param {string} label - ラベル
 * @param {Object} attributes - 追加属性
 * @returns {string}
 */
export function createFormFieldHtml(type = 'text', name = '', label = '', attributes = {}) {
  const id = attributes.id || `field-${name}`;
  const required = attributes.required ? 'required' : '';
  const placeholder = attributes.placeholder ? `placeholder="${escapeHtml(attributes.placeholder)}"` : '';
  const value = attributes.value ? `value="${escapeHtml(attributes.value)}"` : '';
  
  return `
<div class="form-field">
  ${label ? `<label for="${id}" class="form-label">${escapeHtml(label)}</label>` : ''}
  <input type="${type}" id="${id}" name="${name}" ${placeholder} ${value} ${required} class="form-input">
</div>
  `;
}

/**
 * 初期化エラー専用HTMLを生成（main.js用）
 * @param {Error} error - エラーオブジェクト
 * @returns {string}
 */
export function createAppInitErrorHtml(error) {
  return `
<div class="app-init-error-container">
  <h3 class="app-init-error-title">⚠️ アプリケーション初期化エラー</h3>
  <p class="app-init-error-text">
    アプリケーションの初期化中にエラーが発生しました。<br>
    ページの再読み込みまたは管理者にお問い合わせください。
  </p>
  
  <details class="app-init-error-details">
    <summary>詳細情報</summary>
    <pre>${error.message}

${error.stack || 'スタックトレースが利用できません'}</pre>
  </details>
  
  <div class="app-init-error-actions">
    <button onclick="location.reload()" class="app-init-error-btn app-init-error-btn-primary">ページを再読み込み</button>
    <button onclick="console.error('アプリケーション初期化エラー:', '${error.message}'); console.error('${error.stack}')" class="app-init-error-btn app-init-error-btn-secondary">コンソールに詳細出力</button>
  </div>
</div>
  `;
} 