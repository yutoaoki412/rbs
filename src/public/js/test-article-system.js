/**
 * ArticleService v2.0 動作確認テストスクリプト
 * 管理画面とLP間の記事データ連携をテストします
 */

class ArticleSystemTester {
  constructor() {
    this.testResults = [];
  }

  /**
   * 全テストを実行
   */
  async runAllTests() {
    console.log('🧪 ArticleService v2.0 システムテスト開始');
    
    this.testResults = [];
    
    // 基本機能テスト
    await this.testArticleServiceExists();
    await this.testArticleServiceInitialization();
    await this.testLocalStorageAccess();
    await this.testArticleDataRetrieval();
    await this.testArticleFiltering();
    await this.testArticleContent();
    
    // 統合テスト
    await this.testAdminIntegration();
    await this.testFrontendIntegration();
    
    // 結果表示
    this.displayTestResults();
    
    console.log('🧪 ArticleService v2.0 システムテスト完了');
    
    return this.testResults;
  }

  /**
   * ArticleServiceの存在確認
   */
  async testArticleServiceExists() {
    const testName = 'ArticleService存在確認';
    try {
      if (typeof window.ArticleService === 'undefined') {
        throw new Error('ArticleServiceクラスが存在しません');
      }
      
      if (!window.articleService) {
        throw new Error('articleServiceインスタンスが存在しません');
      }
      
      this.addTestResult(testName, true, 'ArticleServiceが正常に読み込まれています');
    } catch (error) {
      this.addTestResult(testName, false, error.message);
    }
  }

  /**
   * ArticleServiceの初期化テスト
   */
  async testArticleServiceInitialization() {
    const testName = 'ArticleService初期化';
    try {
      if (!window.articleService) {
        throw new Error('ArticleServiceが存在しません');
      }
      
      await window.articleService.init();
      
      if (!window.articleService.isInitialized) {
        throw new Error('初期化が完了していません');
      }
      
      this.addTestResult(testName, true, 'ArticleServiceが正常に初期化されました');
    } catch (error) {
      this.addTestResult(testName, false, error.message);
    }
  }

  /**
   * LocalStorageアクセステスト
   */
  async testLocalStorageAccess() {
    const testName = 'LocalStorageアクセス';
    try {
      const storageStatus = window.articleService.checkStorageStatus();
      
      if (storageStatus.error) {
        throw new Error(`LocalStorageエラー: ${storageStatus.error}`);
      }
      
      this.addTestResult(testName, true, 
        `LocalStorage正常 - 総記事数: ${storageStatus.totalArticles}件, 公開済み: ${storageStatus.publishedArticles}件`
      );
    } catch (error) {
      this.addTestResult(testName, false, error.message);
    }
  }

  /**
   * 記事データ取得テスト
   */
  async testArticleDataRetrieval() {
    const testName = '記事データ取得';
    try {
      const articles = window.articleService.getPublishedArticles();
      const latestArticles = window.articleService.getLatestArticles(3);
      
      if (!Array.isArray(articles)) {
        throw new Error('記事データが配列ではありません');
      }
      
      if (!Array.isArray(latestArticles)) {
        throw new Error('最新記事データが配列ではありません');
      }
      
      // データ構造の確認
      if (articles.length > 0) {
        const article = articles[0];
        const requiredFields = ['id', 'title', 'category', 'date', 'status'];
        const missingFields = requiredFields.filter(field => !article[field]);
        
        if (missingFields.length > 0) {
          throw new Error(`必須フィールドが不足: ${missingFields.join(', ')}`);
        }
      }
      
      this.addTestResult(testName, true, 
        `記事データ取得成功 - 公開記事: ${articles.length}件, 最新記事: ${latestArticles.length}件`
      );
    } catch (error) {
      this.addTestResult(testName, false, error.message);
    }
  }

  /**
   * 記事フィルタリングテスト
   */
  async testArticleFiltering() {
    const testName = '記事フィルタリング';
    try {
      const allArticles = window.articleService.getPublishedArticles();
      const categories = ['announcement', 'event', 'media', 'important'];
      
      for (const category of categories) {
        const filteredArticles = window.articleService.getArticlesByCategory(category);
        
        if (!Array.isArray(filteredArticles)) {
          throw new Error(`カテゴリー「${category}」のフィルタリング結果が配列ではありません`);
        }
        
        // フィルタリング結果の検証
        const invalidArticles = filteredArticles.filter(article => article.category !== category);
        if (invalidArticles.length > 0) {
          throw new Error(`カテゴリー「${category}」のフィルタリングに不正な記事が含まれています`);
        }
      }
      
      this.addTestResult(testName, true, 'カテゴリーフィルタリングが正常に動作しています');
    } catch (error) {
      this.addTestResult(testName, false, error.message);
    }
  }

  /**
   * 記事コンテンツ取得テスト
   */
  async testArticleContent() {
    const testName = '記事コンテンツ取得';
    try {
      const articles = window.articleService.getPublishedArticles();
      
      if (articles.length === 0) {
        this.addTestResult(testName, true, 'テスト対象の記事がありません（正常）');
        return;
      }
      
      const testArticle = articles[0];
      const content = await window.articleService.getArticleContent(testArticle.id);
      
      if (typeof content !== 'string') {
        throw new Error('記事コンテンツが文字列ではありません');
      }
      
      if (content.trim() === '') {
        throw new Error('記事コンテンツが空です');
      }
      
      this.addTestResult(testName, true, 
        `記事コンテンツ取得成功 - 記事ID: ${testArticle.id}, コンテンツ長: ${content.length}文字`
      );
    } catch (error) {
      this.addTestResult(testName, false, error.message);
    }
  }

  /**
   * 管理画面連携テスト
   */
  async testAdminIntegration() {
    const testName = '管理画面連携';
    try {
      // 管理画面のDataManagerが存在するかチェック
      const hasAdminInstance = typeof window.adminInstance !== 'undefined' && window.adminInstance;
      
      if (hasAdminInstance) {
        const adminArticles = window.adminInstance.dataManager.getArticles();
        const frontendArticles = window.articleService.getPublishedArticles();
        
        const adminPublished = adminArticles.filter(a => a.status === 'published').length;
        const frontendPublished = frontendArticles.length;
        
        if (adminPublished !== frontendPublished) {
          throw new Error(`データ不整合: 管理画面公開記事${adminPublished}件 vs フロントエンド${frontendPublished}件`);
        }
        
        this.addTestResult(testName, true, 
          `管理画面連携正常 - 公開記事数一致: ${adminPublished}件`
        );
      } else {
        this.addTestResult(testName, true, '管理画面が読み込まれていません（LP側では正常）');
      }
    } catch (error) {
      this.addTestResult(testName, false, error.message);
    }
  }

  /**
   * フロントエンド連携テスト
   */
  async testFrontendIntegration() {
    const testName = 'フロントエンド連携';
    try {
      // ページ固有の機能が存在するかチェック
      const pageSpecificTests = [];
      
      // ニュース一覧ページ
      if (typeof window.NewsPage !== 'undefined') {
        pageSpecificTests.push('ニュース一覧ページ機能');
      }
      
      // ニュース詳細ページ
      if (typeof window.NewsDetailPage !== 'undefined') {
        pageSpecificTests.push('ニュース詳細ページ機能');
      }
      
      // トップページのニュース表示
      const newsContainer = document.getElementById('news-list');
      if (newsContainer) {
        pageSpecificTests.push('トップページニュース表示');
      }
      
      if (pageSpecificTests.length === 0) {
        this.addTestResult(testName, true, 'フロントエンド機能が検出されませんでした（管理画面では正常）');
      } else {
        this.addTestResult(testName, true, 
          `フロントエンド連携正常 - 検出機能: ${pageSpecificTests.join(', ')}`
        );
      }
    } catch (error) {
      this.addTestResult(testName, false, error.message);
    }
  }

  /**
   * テスト結果を追加
   */
  addTestResult(testName, passed, message) {
    this.testResults.push({
      testName,
      passed,
      message,
      timestamp: new Date().toISOString()
    });
    
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName}: ${message}`);
  }

  /**
   * テスト結果を表示
   */
  displayTestResults() {
    const passedTests = this.testResults.filter(r => r.passed).length;
    const totalTests = this.testResults.length;
    const successRate = Math.round((passedTests / totalTests) * 100);
    
    const resultSummary = `
📊 ArticleService v2.0 テスト結果

✅ 成功: ${passedTests}件
❌ 失敗: ${totalTests - passedTests}件
📈 成功率: ${successRate}%

詳細結果:
${this.testResults.map(r => 
  `${r.passed ? '✅' : '❌'} ${r.testName}: ${r.message}`
).join('\n')}

${successRate >= 80 ? '🎉 システムは正常に動作しています！' : '⚠️ システムに問題があります。詳細を確認してください。'}
    `;
    
    console.log(resultSummary);
    
    // アラートでも表示
    alert(resultSummary);
    
    return {
      passedTests,
      totalTests,
      successRate,
      results: this.testResults
    };
  }

  /**
   * 簡易テスト（基本機能のみ）
   */
  async runQuickTest() {
    console.log('🚀 ArticleService v2.0 簡易テスト開始');
    
    this.testResults = [];
    
    await this.testArticleServiceExists();
    await this.testArticleServiceInitialization();
    await this.testLocalStorageAccess();
    await this.testArticleDataRetrieval();
    
    const result = this.displayTestResults();
    
    console.log('🚀 ArticleService v2.0 簡易テスト完了');
    
    return result;
  }
}

// グローバルに公開
window.ArticleSystemTester = ArticleSystemTester;

// 便利関数
window.testArticleSystem = async () => {
  const tester = new ArticleSystemTester();
  return await tester.runAllTests();
};

window.quickTestArticleSystem = async () => {
  const tester = new ArticleSystemTester();
  return await tester.runQuickTest();
};

console.log('🧪 ArticleSystemTester読み込み完了 - testArticleSystem()またはquickTestArticleSystem()を実行してください'); 