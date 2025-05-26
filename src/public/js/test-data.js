/**
 * テスト用サンプルデータの作成
 * 管理画面のダッシュボードをテストするため
 */

function createTestData() {
  const sampleArticles = [
    {
      id: 'article_001',
      title: '春の体験会開催のお知らせ',
      category: 'event',
      status: 'published',
      summary: '4月から新年度の体験会を開催いたします。初心者大歓迎！',
      content: '# 春の体験会開催\n\n新年度の体験会を4月に開催します。\n\n## 日程\n- 4月10日（土）\n- 4月17日（土）\n\n## 対象\n- 年長〜小学6年生\n\n詳細はお問い合わせください。',
      date: '2024-03-15',
      createdAt: '2024-03-15T10:00:00.000Z',
      updatedAt: '2024-03-15T10:00:00.000Z'
    },
    {
      id: 'article_002',
      title: '3月の練習成果報告',
      category: 'announcement',
      status: 'published',
      summary: '3月の練習での子どもたちの成長をお伝えします。',
      content: '# 3月の練習成果\n\n子どもたちの頑張りをご報告します。\n\n## ベーシックコース\n- 全員が50m走のタイムを向上\n\n## アドバンスコース\n- 技術面で大幅な向上を確認',
      date: '2024-03-20',
      createdAt: '2024-03-20T14:30:00.000Z',
      updatedAt: '2024-03-20T14:30:00.000Z'
    },
    {
      id: 'article_003',
      title: '新しいトレーニング器具導入',
      category: 'announcement',
      status: 'published',
      summary: 'より効果的なトレーニングのため、新しい器具を導入しました。',
      content: '# 新しいトレーニング器具\n\n練習の質向上のため、以下の器具を導入しました。\n\n- ハードル\n- ミニコーン\n- ラダー',
      date: '2024-03-22',
      createdAt: '2024-03-22T09:15:00.000Z',
      updatedAt: '2024-03-22T09:15:00.000Z'
    },
    {
      id: 'article_004',
      title: 'ゴールデンウィーク期間の練習について',
      category: 'important',
      status: 'published',
      summary: 'ゴールデンウィーク期間中の練習スケジュールをお知らせします。',
      content: '# GW期間の練習スケジュール\n\nゴールデンウィーク期間中の練習は以下の通りです。\n\n## 通常練習日\n- 5月3日（祝）: 通常通り\n- 5月4日（祝）: 通常通り\n\n## 休講日\n- 5月5日（祝）: お休み',
      date: '2024-04-01',
      createdAt: '2024-04-01T16:45:00.000Z',
      updatedAt: '2024-04-01T16:45:00.000Z'
    },
    {
      id: 'article_005',
      title: '春季大会参加者募集',
      category: 'event',
      status: 'draft',
      summary: '春季陸上大会への参加者を募集しています。',
      content: '# 春季大会参加募集\n\n春季陸上大会への参加者を募集します。\n\n## 大会詳細\n- 日程: 5月15日（土）\n- 場所: 市営陸上競技場\n- 対象: 小学4年生以上',
      date: '2024-04-05',
      createdAt: '2024-04-05T11:20:00.000Z',
      updatedAt: '2024-04-05T11:20:00.000Z'
    },
    {
      id: 'article_006',
      title: 'メディア出演のお知らせ',
      category: 'media',
      status: 'draft',
      summary: '地元テレビ局の取材を受けることになりました。',
      content: '# メディア出演\n\n地元テレビ局「○○TV」の取材を受けることになりました。\n\n放送予定日などは決まり次第お知らせします。',
      date: '2024-04-08',
      createdAt: '2024-04-08T13:00:00.000Z',
      updatedAt: '2024-04-08T13:00:00.000Z'
    }
  ];

  const contentData = {
    'article_001': '# 春の体験会開催\n\n新年度の体験会を4月に開催します。\n\n## 日程\n- 4月10日（土）\n- 4月17日（土）\n\n## 対象\n- 年長〜小学6年生\n\n詳細はお問い合わせください。',
    'article_002': '# 3月の練習成果\n\n子どもたちの頑張りをご報告します。\n\n## ベーシックコース\n- 全員が50m走のタイムを向上\n\n## アドバンスコース\n- 技術面で大幅な向上を確認',
    'article_003': '# 新しいトレーニング器具\n\n練習の質向上のため、以下の器具を導入しました。\n\n- ハードル\n- ミニコーン\n- ラダー',
    'article_004': '# GW期間の練習スケジュール\n\nゴールデンウィーク期間中の練習は以下の通りです。\n\n## 通常練習日\n- 5月3日（祝）: 通常通り\n- 5月4日（祝）: 通常通り\n\n## 休講日\n- 5月5日（祝）: お休み',
    'article_005': '# 春季大会参加募集\n\n春季陸上大会への参加者を募集します。\n\n## 大会詳細\n- 日程: 5月15日（土）\n- 場所: 市営陸上競技場\n- 対象: 小学4年生以上',
    'article_006': '# メディア出演\n\n地元テレビ局「○○TV」の取材を受けることになりました。\n\n放送予定日などは決まり次第お知らせします。'
  };

  // LocalStorageにデータを保存
  localStorage.setItem('rbs_articles_data', JSON.stringify(sampleArticles));
  localStorage.setItem('rbs_articles_content', JSON.stringify(contentData));

  console.log('テストデータを作成しました:');
  console.log('- 記事数:', sampleArticles.length);
  console.log('- 公開済み:', sampleArticles.filter(a => a.status === 'published').length);
  console.log('- 下書き:', sampleArticles.filter(a => a.status === 'draft').length);
  console.log('- 今月の記事:', sampleArticles.filter(a => {
    const articleMonth = new Date(a.createdAt).getMonth();
    const currentMonth = new Date().getMonth();
    return articleMonth === currentMonth;
  }).length);
}

/**
 * テストデータを削除する関数
 */
function clearTestData() {
  // 既存のテストデータのIDを定義
  const testArticleIds = [
    'article_001',
    'article_002', 
    'article_003',
    'article_004',
    'article_005',
    'article_006'
  ];

  try {
    // 現在の記事データを取得
    const existingArticles = JSON.parse(localStorage.getItem('rbs_articles_data') || '[]');
    const existingContent = JSON.parse(localStorage.getItem('rbs_articles_content') || '{}');

    // テストデータ以外の記事をフィルタリング
    const realArticles = existingArticles.filter(article => 
      !testArticleIds.includes(article.id)
    );

    // テストデータ以外のコンテンツをフィルタリング
    const realContent = {};
    Object.keys(existingContent).forEach(id => {
      if (!testArticleIds.includes(id)) {
        realContent[id] = existingContent[id];
      }
    });

    // LocalStorageを更新
    localStorage.setItem('rbs_articles_data', JSON.stringify(realArticles));
    localStorage.setItem('rbs_articles_content', JSON.stringify(realContent));

    console.log('テストデータを削除しました:');
    console.log('- 削除された記事:', existingArticles.length - realArticles.length, '件');
    console.log('- 残った記事:', realArticles.length, '件');

    // ページをリロードしてUIを更新
    if (window.location.pathname.includes('admin.html')) {
      window.location.reload();
    }

    return {
      success: true,
      deletedCount: existingArticles.length - realArticles.length,
      remainingCount: realArticles.length
    };
  } catch (error) {
    console.error('テストデータの削除に失敗:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * テストデータが存在するかチェックする関数
 */
function hasTestData() {
  const testArticleIds = [
    'article_001',
    'article_002', 
    'article_003',
    'article_004',
    'article_005',
    'article_006'
  ];

  try {
    const existingArticles = JSON.parse(localStorage.getItem('rbs_articles_data') || '[]');
    return existingArticles.some(article => testArticleIds.includes(article.id));
  } catch (error) {
    console.error('テストデータのチェックに失敗:', error);
    return false;
  }
}

/**
 * 実際の記事が作成されているかチェックする関数
 */
function hasRealArticles() {
  const testArticleIds = [
    'article_001',
    'article_002', 
    'article_003',
    'article_004',
    'article_005',
    'article_006'
  ];

  try {
    const existingArticles = JSON.parse(localStorage.getItem('rbs_articles_data') || '[]');
    return existingArticles.some(article => !testArticleIds.includes(article.id));
  } catch (error) {
    console.error('実記事のチェックに失敗:', error);
    return false;
  }
}

// グローバル関数として公開
window.clearTestData = clearTestData;
window.hasTestData = hasTestData;
window.hasRealArticles = hasRealArticles;

// ページ読み込み時にテストデータを作成（開発環境のみ、実記事がない場合のみ）
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  // 既に実際の記事がある場合はテストデータを作成しない
  if (!hasRealArticles() && !hasTestData()) {
    createTestData();
  } else if (hasRealArticles() && hasTestData()) {
    console.log('実際の記事が存在するため、テストデータを自動削除します。');
    // 実際の記事がある場合は自動的にテストデータを削除
    // clearTestData(); // 自動削除したい場合はコメントアウトを外す
  }
} 