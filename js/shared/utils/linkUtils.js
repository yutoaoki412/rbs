/**
 * リンクパス修正ユーティリティ
 * HTMLファイル内のリンクパスを環境に応じて動的に修正
 * @version 1.0.0
 */

import { PathHelper } from '../constants/paths.js';

/**
 * ページ内の管理画面リンクを修正
 */
export function fixAdminLinks() {
  // 管理画面へのリンクを検索
  const adminLinks = document.querySelectorAll('a[href*="admin.html"], a[href*="pages/admin.html"]');
  
  adminLinks.forEach(link => {
    const href = link.getAttribute('href');
    
    // 既に正しいパスの場合はスキップ
    if (href && !href.includes('src/public')) {
      // 統一されたパス取得を使用
      const correctPath = PathHelper.getSafeRedirectPath('admin');
      link.setAttribute('href', correctPath);
      console.log(`🔗 管理画面リンク修正: ${href} → ${correctPath}`);
    }
  });
  
  // 管理画面ログインへのリンクを検索
  const adminLoginLinks = document.querySelectorAll('a[href*="admin-login.html"], a[href*="pages/admin-login.html"]');
  
  adminLoginLinks.forEach(link => {
    const href = link.getAttribute('href');
    
    // 既に正しいパスの場合はスキップ
    if (href && !href.includes('src/public')) {
      // 統一されたパス取得を使用
      const correctPath = PathHelper.getSafeRedirectPath('admin-login');
      link.setAttribute('href', correctPath);
      console.log(`🔗 管理画面ログインリンク修正: ${href} → ${correctPath}`);
    }
  });
}

/**
 * ページ内の相対リンクを修正
 */
export function fixRelativeLinks() {
  const links = document.querySelectorAll('a[href]');
  
  links.forEach(link => {
    const href = link.getAttribute('href');
    
    // 外部リンクや絶対パス、アンカーリンクはスキップ
    if (!href || 
        href.startsWith('http') || 
        href.startsWith('//') || 
        href.startsWith('#') || 
        href.startsWith('mailto:') || 
        href.startsWith('tel:')) {
      return;
    }
    
    // 相対パスの調整
    if (href.includes('.html') && !href.includes('src/public')) {
      const currentPath = window.location.pathname;
      
      // 現在のページがsrc/public/構造の場合の調整
      if (currentPath.includes('/src/public/')) {
        // pagesディレクトリ内のファイルへのリンクの場合
        if (href.includes('pages/') && !href.startsWith('pages/')) {
          // 既に適切な相対パス
          return;
        } else if (!href.includes('pages/') && (href.includes('.html'))) {
          // pages/を追加する必要がある場合
          const newHref = `pages/${href}`;
          link.setAttribute('href', newHref);
          console.log(`🔗 相対リンク修正: ${href} → ${newHref}`);
        }
      }
    }
  });
}

/**
 * ページ読み込み時にリンクを自動修正
 */
export function autoFixLinks() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      fixAdminLinks();
      fixRelativeLinks();
    });
  } else {
    fixAdminLinks();
    fixRelativeLinks();
  }
}

/**
 * 動的に追加された要素のリンクを修正
 * @param {HTMLElement} container - 修正対象のコンテナ要素
 */
export function fixLinksInContainer(container) {
  if (!container) return;
  
  // コンテナ内の管理画面リンクを修正
  const adminLinks = container.querySelectorAll('a[href*="admin.html"], a[href*="pages/admin.html"]');
  adminLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.includes('src/public')) {
      const correctPath = PathHelper.getSafeRedirectPath('admin');
      link.setAttribute('href', correctPath);
    }
  });
  
  // コンテナ内の管理画面ログインリンクを修正
  const adminLoginLinks = container.querySelectorAll('a[href*="admin-login.html"], a[href*="pages/admin-login.html"]');
  adminLoginLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.includes('src/public')) {
      const correctPath = PathHelper.getSafeRedirectPath('admin-login');
      link.setAttribute('href', correctPath);
    }
  });
}

export default {
  fixAdminLinks,
  fixRelativeLinks,
  autoFixLinks,
  fixLinksInContainer
}; 