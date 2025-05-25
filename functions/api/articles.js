// functions/api/articles.js

const ARTICLES_METADATA_KEY = 'articles_metadata';
const ARTICLE_CONTENT_PREFIX = 'article_content_';

/**
 * Generates a slug from a title.
 * @param {string} title
 * @returns {string}
 */
function slugify(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove non-alphanumeric characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-'); // Replace multiple hyphens with a single hyphen
}

/**
 * Handles GET requests to /api/articles or /api/articles/:id
 */
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(segment => segment); // e.g. ['', 'api', 'articles', '123'] -> ['api', 'articles', '123']
  const articleId = pathSegments.length > 2 ? pathSegments[2] : null;

  try {
    const articlesMetadataString = await env.RBS_KV.get(ARTICLES_METADATA_KEY);
    const articlesMetadata = articlesMetadataString ? JSON.parse(articlesMetadataString) : [];

    if (articleId) {
      const articleMeta = articlesMetadata.find(article => article.id === articleId);

      if (articleMeta) {
        const articleContent = await env.RBS_KV.get(`${ARTICLE_CONTENT_PREFIX}${articleId}`);
        // content might be null if it was never created or deleted due to an error.
        // We return the metadata and let the client decide how to handle missing content.
        return new Response(JSON.stringify({ ...articleMeta, content: articleContent || '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        return new Response(JSON.stringify({ error: 'Article not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else {
      // Return all articles (metadata only)
      return new Response(JSON.stringify(articlesMetadata), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error(`Error in onRequestGet (id: ${articleId}):`, error.message, error.stack);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handles POST requests to /api/articles
 */
export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();

    if (!body.title || !body.content || !body.date || !body.category || !body.categoryName || !body.excerpt) {
      return new Response(JSON.stringify({ error: 'Missing required fields: title, content, date, category, categoryName, excerpt are required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const articlesMetadataString = await env.RBS_KV.get(ARTICLES_METADATA_KEY);
    const articlesMetadata = articlesMetadataString ? JSON.parse(articlesMetadataString) : [];

    // Generate a new unique ID - using timestamp + random element for basic uniqueness
    const newId = Date.now().toString() + Math.random().toString(36).substring(2, 7);

    const slugifiedTitle = slugify(body.title);
    const fileName = `${body.date.substring(0,10)}-${slugifiedTitle}.md`; // Assuming date is YYYY-MM-DD...

    const newArticleMetadata = {
      id: newId,
      title: body.title,
      date: body.date,
      category: body.category,
      categoryName: body.categoryName,
      excerpt: body.excerpt,
      file: fileName,
      featured: body.featured || false,
      status: body.status || 'draft', // Default status to 'draft'
    };

    // Store the article content
    await env.RBS_KV.put(`${ARTICLE_CONTENT_PREFIX}${newId}`, body.content);

    // Add new metadata and save
    articlesMetadata.push(newArticleMetadata);
    await env.RBS_KV.put(ARTICLES_METADATA_KEY, JSON.stringify(articlesMetadata));

    // Return the newly created article (metadata + content)
    return new Response(JSON.stringify({ ...newArticleMetadata, content: body.content }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in onRequestPost:', error.message, error.stack);
    if (error instanceof SyntaxError) { // Handle cases where request.json() fails
        return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handles PUT requests to /api/articles/:id
 */
export async function onRequestPut(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(segment => segment);
  const articleId = pathSegments.length > 2 ? pathSegments[2] : null;

  if (!articleId) {
    return new Response(JSON.stringify({ error: 'Article ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();

    // For PUT, all fields are optional in the body, but at least one should be present.
    // However, the core fields (title, content, etc.) are expected if they are being updated.
    // We will update what's provided.

    const articlesMetadataString = await env.RBS_KV.get(ARTICLES_METADATA_KEY);
    let articlesMetadata = articlesMetadataString ? JSON.parse(articlesMetadataString) : [];

    const articleIndex = articlesMetadata.findIndex(article => article.id === articleId);

    if (articleIndex === -1) {
      return new Response(JSON.stringify({ error: 'Article not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the existing article metadata
    const existingArticleMeta = articlesMetadata[articleIndex];
    let articleContent = await env.RBS_KV.get(`${ARTICLE_CONTENT_PREFIX}${articleId}`);

    // Update content if provided
    if (body.content !== undefined) {
      articleContent = body.content; // Update local variable
      await env.RBS_KV.put(`${ARTICLE_CONTENT_PREFIX}${articleId}`, body.content);
    }

    // Update metadata fields if provided
    const updatedTitle = body.title !== undefined ? body.title : existingArticleMeta.title;
    const updatedDate = body.date !== undefined ? body.date : existingArticleMeta.date;

    const updatedArticleMetadata = {
      ...existingArticleMeta,
      title: updatedTitle,
      date: updatedDate,
      category: body.category !== undefined ? body.category : existingArticleMeta.category,
      categoryName: body.categoryName !== undefined ? body.categoryName : existingArticleMeta.categoryName,
      excerpt: body.excerpt !== undefined ? body.excerpt : existingArticleMeta.excerpt,
      featured: body.featured !== undefined ? body.featured : existingArticleMeta.featured,
      status: body.status !== undefined ? body.status : existingArticleMeta.status,
      // Update file name if title or date changed
      file: (body.title !== undefined || body.date !== undefined)
            ? `${(updatedDate || '').substring(0,10)}-${slugify(updatedTitle)}.md`
            : existingArticleMeta.file,
    };

    articlesMetadata[articleIndex] = updatedArticleMetadata;
    await env.RBS_KV.put(ARTICLES_METADATA_KEY, JSON.stringify(articlesMetadata));

    return new Response(JSON.stringify({ ...updatedArticleMetadata, content: articleContent }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`Error in onRequestPut (id: ${articleId}):`, error.message, error.stack);
    if (error instanceof SyntaxError) {
        return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Handles DELETE requests to /api/articles/:id
 */
export async function onRequestDelete(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(segment => segment);
  const articleId = pathSegments.length > 2 ? pathSegments[2] : null;

  if (!articleId) {
    return new Response(JSON.stringify({ error: 'Article ID is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const articlesMetadataString = await env.RBS_KV.get(ARTICLES_METADATA_KEY);
    let articlesMetadata = articlesMetadataString ? JSON.parse(articlesMetadataString) : [];

    const articleIndex = articlesMetadata.findIndex(article => article.id === articleId);

    if (articleIndex === -1) {
      // If metadata doesn't exist, the article is considered not found.
      // We can still attempt to delete content if it orphaned, but the primary response is 404.
      await env.RBS_KV.delete(`${ARTICLE_CONTENT_PREFIX}${articleId}`); // Attempt to clean up orphaned content
      return new Response(JSON.stringify({ error: 'Article not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete the article content
    await env.RBS_KV.delete(`${ARTICLE_CONTENT_PREFIX}${articleId}`);

    // Remove the article metadata from the array
    articlesMetadata.splice(articleIndex, 1);

    // Save the updated metadata array
    await env.RBS_KV.put(ARTICLES_METADATA_KEY, JSON.stringify(articlesMetadata));

    return new Response(null, { // Or JSON.stringify({ message: 'Article deleted successfully' }) with status 200
      status: 204, // No Content is typical for successful DELETE
    });

  } catch (error) {
    console.error(`Error in onRequestDelete (id: ${articleId}):`, error.message, error.stack);
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Alias for Cloudflare Pages
export const onRequest = async (context) => {
  switch (context.request.method) {
    case 'GET':
      return onRequestGet(context);
    case 'POST':
      return onRequestPost(context);
    case 'PUT':
      return onRequestPut(context);
    case 'DELETE':
      return onRequestDelete(context);
    default:
      return new Response('Method Not Allowed', { status: 405 });
  }
};
