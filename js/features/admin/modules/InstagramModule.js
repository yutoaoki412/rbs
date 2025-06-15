/**
 * Instagram管理モジュール - シンプル版
 * @version 1.0.0
 */

import { BaseModule } from './BaseModule.js';

/**
 * Instagram管理モジュール
 */
export class InstagramModule extends BaseModule {
  constructor() {
    super('Instagram');
    
    this.config = {
      autoRefresh: true,
      refreshInterval: 30000, // 30秒
      maxPosts: 10
    };
  }

  /**
   * セットアップ
   */
  async setup() {
    await this._initializeServices();
    this._bindEvents();
    this._setupAutoRefresh();
  }

  /**
   * サービス初期化
   */
  async _initializeServices() {
    try {
      const { getInstagramSupabaseService } = await import('../../../shared/services/InstagramSupabaseService.js');
      
      this.instagramService = getInstagramSupabaseService();
      await this.instagramService.init();
      
    } catch (error) {
      this.handleError(error, 'サービス初期化');
    }
  }

  /**
   * イベントバインド
   */
  _bindEvents() {
    const instagramSection = document.getElementById('instagram');
    if (!instagramSection) return;

    // 更新ボタン
    const refreshBtn = instagramSection.querySelector('[data-action="refresh"]');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshPosts());
    }

    // 投稿埋め込み
    const embedBtn = instagramSection.querySelector('[data-action="embed"]');
    if (embedBtn) {
      embedBtn.addEventListener('click', () => this.embedSelectedPost());
    }
  }

  /**
   * 自動更新設定
   */
  _setupAutoRefresh() {
    if (!this.config.autoRefresh) return;

    setInterval(() => {
      this.refreshPosts(true); // サイレント更新
    }, this.config.refreshInterval);
  }

  /**
   * 投稿一覧更新
   */
  async refreshPosts(silent = false) {
    try {
      if (!silent) this.setState({ loading: true });
      
      const posts = await this.instagramService.getLatestPosts(this.config.maxPosts);
      this._displayPosts(posts);
      
      if (!silent) this.notify('投稿一覧を更新しました', 'success');
      
    } catch (error) {
      this.handleError(error, '投稿一覧更新');
      if (!silent) this.notify('更新に失敗しました', 'error');
    } finally {
      if (!silent) this.setState({ loading: false });
    }
  }

  /**
   * 選択した投稿を埋め込み
   */
  async embedSelectedPost() {
    try {
      const selectedPost = this._getSelectedPost();
      if (!selectedPost) {
        this.notify('投稿を選択してください', 'warning');
        return;
      }

      const result = await this.instagramService.embedPost(selectedPost);
      
      if (result.success) {
        this.notify('投稿を埋め込みました', 'success');
        this.emit('instagram:embedded', { post: selectedPost });
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      this.handleError(error, '投稿埋め込み');
      this.notify('埋め込みに失敗しました', 'error');
    }
  }

  /**
   * 投稿一覧表示
   */
  _displayPosts(posts) {
    const container = document.querySelector('#instagram-posts');
    if (!container) return;

    container.innerHTML = posts.map(post => `
      <div class="instagram-post" data-post-id="${post.id}">
        <div class="post-image">
          <img src="${post.thumbnail}" alt="Instagram投稿" loading="lazy">
        </div>
        <div class="post-info">
          <p class="post-caption">${this._truncateText(post.caption, 100)}</p>
          <div class="post-meta">
            <span class="post-date">${new Date(post.timestamp).toLocaleDateString('ja-JP')}</span>
            <span class="post-likes">❤️ ${post.like_count}</span>
          </div>
          <button class="select-post-btn" onclick="adminCore.getModule('instagram').then(m => m.selectPost('${post.id}'))">
            選択
          </button>
        </div>
      </div>
    `).join('');
  }

  /**
   * 投稿選択
   */
  selectPost(postId) {
    // 既存の選択を解除
    document.querySelectorAll('.instagram-post').forEach(el => {
      el.classList.remove('selected');
    });

    // 新しい選択を適用
    const postElement = document.querySelector(`[data-post-id="${postId}"]`);
    if (postElement) {
      postElement.classList.add('selected');
      this.setState({ selectedPost: postId });
    }
  }

  /**
   * 選択された投稿取得
   */
  _getSelectedPost() {
    const selectedElement = document.querySelector('.instagram-post.selected');
    if (!selectedElement) return null;

    return selectedElement.dataset.postId;
  }

  /**
   * テキスト切り詰め
   */
  _truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}

/**
 * InstagramModuleインスタンス取得
 */
export function getInstagramModule() {
  return new InstagramModule();
} 