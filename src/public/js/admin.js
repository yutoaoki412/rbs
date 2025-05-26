/**
 * RBS陸上教室 管理画面システム v2.0
 * メインエントリーポイント
 */

import { AdminCore } from './admin/core/AdminCore.js';

// グローバル変数として管理画面インスタンスを保持
let adminInstance = null;

/**
 * 管理画面の初期化
 */
async function initializeAdmin() {
  try {
    console.log('RBS陸上教室 管理画面システム v2.0 を起動中...');
    
    // 既存のインスタンスがある場合は破棄
    if (adminInstance) {
      adminInstance.destroy();
    }
    
    // 新しいインスタンスを作成
    adminInstance = new AdminCore();
    
    // 初期化
    await adminInstance.init();
    
    // グローバル関数のセットアップ
    setupGlobalFunctions();
    
    console.log('管理画面システムの起動が完了しました');
    
  } catch (error) {
    console.error('管理画面システムの起動に失敗:', error);
    
    // エラー発生時のフォールバック
    showFallbackError(error);
  }
}

/**
 * グローバル関数のセットアップ
 * HTMLから呼び出される関数をグローバルスコープに設定
 */
function setupGlobalFunctions() {
  // タブ切り替え
  window.switchToTab = (tabName) => {
    if (adminInstance && adminInstance.uiManager) {
      adminInstance.uiManager.switchTab(tabName);
    }
  };
  
  // ログアウト
  window.logout = () => {
    if (adminInstance) {
      adminInstance.logout();
    }
  };

  // テストデータ管理
  window.clearTestDataWithConfirm = () => {
    if (typeof clearTestData === 'function') {
      if (confirm('テストデータを削除しますか？\n\n削除されるもの:\n- 春の体験会開催のお知らせ\n- 3月の練習成果報告\n- 新しいトレーニング器具導入\n- ゴールデンウィーク期間の練習について\n- 春季大会参加者募集\n- メディア出演のお知らせ\n\n実際に作成した記事は削除されません。')) {
        const result = clearTestData();
        if (result.success) {
          if (adminInstance && adminInstance.uiManager) {
            adminInstance.uiManager.showNotification('success', `テストデータを削除しました（${result.deletedCount}件）`);
          }
        } else {
          if (adminInstance && adminInstance.uiManager) {
            adminInstance.uiManager.showNotification('error', 'テストデータの削除に失敗しました');
          }
        }
      }
    } else {
      console.error('clearTestData関数が見つかりません');
    }
  };

  window.createTestDataManually = () => {
    if (typeof createTestData === 'function') {
      if (confirm('テストデータを作成しますか？\n\n既存のテストデータがある場合は置き換えられます。')) {
        createTestData();
        if (adminInstance && adminInstance.uiManager) {
          adminInstance.uiManager.showNotification('success', 'テストデータを作成しました');
        }
        // ページをリロードしてUIを更新
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } else {
      console.error('createTestData関数が見つかりません');
    }
  };
  
  // ニュース関連
  window.saveNews = async () => {
    if (adminInstance && adminInstance.dataManager) {
      try {
        const formData = getNewsFormData();
        await adminInstance.dataManager.saveArticle(formData, false);
        adminInstance.uiManager.showNotification('success', '記事を保存しました');
        adminInstance.uiManager.clearFormChanges('news-form');
      } catch (error) {
        adminInstance.uiManager.showNotification('error', '保存に失敗しました');
      }
    }
  };
  
  window.publishNews = async () => {
    if (adminInstance && adminInstance.dataManager) {
      try {
        const formData = getNewsFormData();
        await adminInstance.dataManager.saveArticle(formData, true);
        adminInstance.uiManager.showNotification('success', '記事を公開しました');
        adminInstance.uiManager.clearFormChanges('news-form');
      } catch (error) {
        adminInstance.uiManager.showNotification('error', '公開に失敗しました');
      }
    }
  };
  
  window.editNews = (id) => {
    if (adminInstance && adminInstance.dataManager) {
      const article = adminInstance.dataManager.getArticles().find(a => a.id === id);
      if (article) {
        populateNewsForm(article);
      }
    }
  };
  
  window.deleteNews = async (id) => {
    if (adminInstance && adminInstance.dataManager) {
      if (confirm('この記事を削除しますか？')) {
        try {
          await adminInstance.dataManager.deleteArticle(id);
          adminInstance.uiManager.showNotification('success', '記事を削除しました');
        } catch (error) {
          adminInstance.uiManager.showNotification('error', '削除に失敗しました');
        }
      }
    }
  };
  
  window.clearNewsEditor = () => {
    clearNewsForm();
  };
  
  window.previewNews = (articleId = null) => {
    if (adminInstance && adminInstance.uiManager) {
      let articleData;
      
      if (articleId) {
        // 指定されたIDの記事をプレビュー
        articleData = adminInstance.dataManager.getArticles().find(a => a.id === articleId);
        if (!articleData) {
          adminInstance.uiManager.showNotification('error', '記事が見つかりません');
          return;
        }
      } else {
        // フォームの内容をプレビュー
        articleData = getNewsFormData();
      }
      
      const previewContent = generatePreviewContent(articleData);
      adminInstance.uiManager.showModal('記事プレビュー', previewContent);
    }
  };
  
  // レッスン状況関連
  window.updateLessonStatus = async () => {
    if (adminInstance && adminInstance.dataManager) {
      try {
        const statusData = getLessonStatusFormData();
        await adminInstance.dataManager.updateLessonStatus(statusData);
        adminInstance.uiManager.showNotification('success', 'レッスン状況を更新しました');
      } catch (error) {
        adminInstance.uiManager.showNotification('error', '更新に失敗しました');
      }
    }
  };
  
  window.previewLessonStatus = () => {
    if (adminInstance && adminInstance.uiManager) {
      const statusData = getLessonStatusFormData();
      const previewContent = generateLessonStatusPreview(statusData);
      adminInstance.uiManager.showModal('レッスン状況プレビュー', previewContent);
    }
  };
  
  // Instagram関連
  window.addInstagramLink = async () => {
    if (adminInstance && adminInstance.dataManager) {
      try {
        const postData = getInstagramFormData();
        await adminInstance.dataManager.saveInstagramPost(postData);
        adminInstance.uiManager.showNotification('success', 'Instagram投稿を追加しました');
        clearInstagramForm();
      } catch (error) {
        adminInstance.uiManager.showNotification('error', '追加に失敗しました');
      }
    }
  };
  
  window.clearInstagramForm = () => {
    clearInstagramForm();
  };
  
  // モーダル関連
  window.closeModal = () => {
    if (adminInstance && adminInstance.uiManager) {
      adminInstance.uiManager.closeModal();
    }
  };
  
  // フィルター関連
  window.filterNewsList = () => {
    // フィルター機能の実装
  };
  
  window.filterInstagramList = () => {
    // フィルター機能の実装
  };
  
  // ユーティリティ
  window.insertMarkdown = (before, after) => {
    insertMarkdownToEditor(before, after);
  };
  
  // モバイルメニュー
  window.toggleMobileMenu = () => {
    document.body.classList.toggle('mobile-menu-open');
  };

  // データエクスポート
  window.exportData = () => {
    if (adminInstance && adminInstance.dataManager) {
      adminInstance.dataManager.exportData();
    }
  };
}

/**
 * フォームデータ取得関数
 */
function getNewsFormData() {
  return {
    id: document.getElementById('news-id')?.value || null,
    title: document.getElementById('news-title')?.value || '',
    category: document.getElementById('news-category')?.value || 'announcement',
    date: document.getElementById('news-date')?.value || new Date().toISOString().slice(0, 10),
    summary: document.getElementById('news-summary')?.value || '',
    content: document.getElementById('news-content')?.value || '',
    featured: document.getElementById('news-featured')?.checked || false
  };
}

function getLessonStatusFormData() {
  const courses = ['キッズ', 'ジュニア'];
  const lessonTypes = ['体験会', '通常レッスン'];
  const statusData = {};
  
  courses.forEach(course => {
    statusData[course] = {};
    lessonTypes.forEach(lessonType => {
      const statusInput = document.querySelector(`input[name="${course}-${lessonType}"]:checked`);
      const noteTextarea = document.getElementById(`${course}-${lessonType}-note`);
      
      statusData[course][lessonType] = {
        status: statusInput?.value || 'TBD',
        note: noteTextarea?.value || ''
      };
    });
  });
  
  return statusData;
}

function getInstagramFormData() {
  return {
    url: document.getElementById('instagram-url')?.value || '',
    category: document.getElementById('instagram-category')?.value || 'other',
    description: document.getElementById('instagram-description')?.value || ''
  };
}

/**
 * フォーム操作関数
 */
function populateNewsForm(article) {
  if (document.getElementById('news-id')) document.getElementById('news-id').value = article.id || '';
  if (document.getElementById('news-title')) document.getElementById('news-title').value = article.title || '';
  if (document.getElementById('news-category')) document.getElementById('news-category').value = article.category || 'announcement';
  if (document.getElementById('news-date')) document.getElementById('news-date').value = article.date || '';
  if (document.getElementById('news-summary')) document.getElementById('news-summary').value = article.summary || '';
  if (document.getElementById('news-content')) document.getElementById('news-content').value = article.content || '';
  if (document.getElementById('news-featured')) document.getElementById('news-featured').checked = article.featured || false;
  
  // エディタのタイトルを更新
  const editorTitle = document.getElementById('editor-title');
  if (editorTitle) {
    editorTitle.textContent = '記事編集';
  }
}

function clearNewsForm() {
  if (document.getElementById('news-id')) document.getElementById('news-id').value = '';
  if (document.getElementById('news-title')) document.getElementById('news-title').value = '';
  if (document.getElementById('news-category')) document.getElementById('news-category').value = 'announcement';
  if (document.getElementById('news-date')) document.getElementById('news-date').value = new Date().toISOString().slice(0, 10);
  if (document.getElementById('news-summary')) document.getElementById('news-summary').value = '';
  if (document.getElementById('news-content')) document.getElementById('news-content').value = '';
  if (document.getElementById('news-featured')) document.getElementById('news-featured').checked = false;
  
  // エディタのタイトルを更新
  const editorTitle = document.getElementById('editor-title');
  if (editorTitle) {
    editorTitle.textContent = '新規記事作成';
  }
}

function clearInstagramForm() {
  if (document.getElementById('instagram-url')) document.getElementById('instagram-url').value = '';
  if (document.getElementById('instagram-category')) document.getElementById('instagram-category').value = 'other';
  if (document.getElementById('instagram-description')) document.getElementById('instagram-description').value = '';
}

/**
 * プレビュー生成関数
 */
function generatePreviewContent(article) {
  return `
    <div class="preview-content">
      <h2>${escapeHtml(article.title)}</h2>
      <div class="preview-meta">
        <span class="preview-category">${getCategoryLabel(article.category)}</span>
        <span class="preview-date">${article.date}</span>
      </div>
      ${article.summary ? `<p class="preview-summary">${escapeHtml(article.summary)}</p>` : ''}
      <div class="preview-content-body">
        ${article.content ? markdownToHtml(article.content) : '<p>内容がありません</p>'}
      </div>
    </div>
  `;
}

function generateLessonStatusPreview(statusData) {
  const courses = ['キッズ', 'ジュニア'];
  const lessonTypes = ['体験会', '通常レッスン'];
  
  let html = '<div class="lesson-status-preview">';
  
  courses.forEach(course => {
    html += `<h3>${course}コース</h3>`;
    lessonTypes.forEach(lessonType => {
      const lesson = statusData[course]?.[lessonType];
      if (lesson) {
        const statusLabel = getStatusLabel(lesson.status);
        html += `
          <div class="lesson-item">
            <strong>${lessonType}:</strong> 
            <span class="status status-${lesson.status}">${statusLabel}</span>
            ${lesson.note ? `<p class="note">${escapeHtml(lesson.note)}</p>` : ''}
          </div>
        `;
      }
    });
  });
  
  html += '</div>';
  return html;
}

/**
 * ユーティリティ関数
 */
function insertMarkdownToEditor(before, after = '') {
  const textarea = document.getElementById('news-content');
  if (!textarea) return;
  
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);
  
  const replacement = before + selectedText + after;
  textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
  
  // カーソル位置を調整
  const newPosition = start + before.length + selectedText.length;
  textarea.setSelectionRange(newPosition, newPosition);
  textarea.focus();
}

function markdownToHtml(markdown) {
  // 簡易的なMarkdown変換
  return markdown
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getCategoryLabel(category) {
  const labels = {
    announcement: 'お知らせ',
    event: '体験会',
    media: 'メディア',
    important: '重要'
  };
  return labels[category] || category;
}

function getStatusLabel(status) {
  const labels = {
    実施: '実施',
    中止: '中止',
    TBD: '未定'
  };
  return labels[status] || status;
}

/**
 * フォールバックエラー表示
 */
function showFallbackError(error) {
  const errorHTML = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #fff;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      text-align: center;
      z-index: 9999;
    ">
      <h2 style="color: #e53e3e; margin-bottom: 1rem;">
        管理画面の起動に失敗しました
      </h2>
      <p style="margin-bottom: 1rem;">
        システムエラーが発生しました。<br>
        ページを再読み込みしてください。
      </p>
      <button onclick="window.location.reload()" style="
        background: #4299e1;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
      ">
        再読み込み
      </button>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', errorHTML);
}

/**
 * DOMContentLoaded イベントで初期化
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAdmin);
} else {
  initializeAdmin();
}

// モジュールとして公開
export { adminInstance, initializeAdmin }; 