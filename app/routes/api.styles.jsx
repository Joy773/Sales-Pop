import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import { 
  saveSalesPopStyles, 
  getSalesPopStyles
} from '../stylesRepository.server';

/**
 * GET /api/styles - Load styles configuration for the current shop
 */
export async function loader({ request }) {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;
    
    // Normalize shop domain to match how it's saved
    const normalizedShop = shop.trim().toLowerCase();

    const styles = await getSalesPopStyles(normalizedShop);
    
    if (!styles) {
      console.error(`[Styles API] ✗ No styles found for ${shop}`);
    }
    
    return json({ styles: styles || {}, success: true });
  } catch (error) {
    console.error('Error loading styles:', error);
    return json({ 
      error: 'Failed to load styles',
      success: false 
    }, { status: 500 });
  }
}

/**
 * POST /api/styles - Save styles configuration for the current shop
 */
export async function action({ request }) {
  try {
    // Authenticate request
    let session;
    let shop;
    try {
      const authResult = await authenticate.admin(request);
      session = authResult.session;
      shop = session.shop;
    } catch (authError) {
      console.error(`[Styles API] ✗ Authentication failed:`, authError);
      console.error(`[Styles API] Auth error details:`, {
        name: authError.name,
        message: authError.message,
        stack: authError.stack?.substring(0, 300)
      });
      return json({ 
        error: 'Authentication failed',
        success: false,
        details: authError.message
      }, { status: 401 });
    }
    
    // Normalize shop domain to lowercase for consistency
    const normalizedShop = shop.trim().toLowerCase();

    // Read request body - handle both JSON and form data
    let body;
    let styles;
    
    try {
      const contentType = request.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        body = await request.json();
        
        // Handle both direct styles object and stringified styles
        if (body.styles) {
          if (typeof body.styles === 'string') {
            try {
              styles = JSON.parse(body.styles);
            } catch (parseErr) {
              console.error(`[Styles API] Failed to parse stringified styles:`, parseErr);
              styles = body.styles;
            }
          } else {
            styles = body.styles;
          }
        } else {
          styles = body; // If styles is at root level
        }
      } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
        const formData = await request.formData();
        const stylesStr = formData.get('styles');
        if (stylesStr) {
          try {
            styles = typeof stylesStr === 'string' ? JSON.parse(stylesStr) : stylesStr;
          } catch (parseErr) {
            console.error(`[Styles API] ✗ Failed to parse styles string:`, parseErr);
            throw new Error(`Failed to parse styles: ${parseErr.message}`);
          }
        } else {
          console.error(`[Styles API] FormData received but no 'styles' field found. Available fields: ${Array.from(formData.keys()).join(', ')}`);
        }
      } else {
        // Try JSON as fallback
        body = await request.json();
        styles = body.styles || body;
      }
    } catch (parseError) {
      console.error(`[Styles API] ✗ Failed to parse request body:`, parseError);
      return json({ 
        error: 'Invalid request body',
        success: false,
        details: parseError.message
      }, { status: 400 });
    }
    if (!styles) {
      console.error(`[Styles API] No styles data provided for ${shop}. Body content: ${JSON.stringify(body).substring(0, 500)}`);
      return json({ 
        error: 'Styles data is required',
        success: false,
        details: 'The request body must contain a "styles" property'
      }, { status: 400 });
    }
    
    if (typeof styles !== 'object' || Array.isArray(styles)) {
      console.error(`[Styles API] Styles is not a valid object:`, typeof styles, Array.isArray(styles));
      return json({ 
        error: 'Styles must be an object',
        success: false,
        details: `Received ${typeof styles} instead of object`
      }, { status: 400 });
    }
    
    if (Object.keys(styles).length === 0) {
      console.error(`[Styles API] Styles object is empty for ${shop}`);
      return json({ 
        error: 'Styles object is empty',
        success: false,
        details: 'Please configure at least one style setting before saving'
      }, { status: 400 });
    }
    // Validate styles object can be serialized (no circular references, functions, etc.)
    let serializedStyles;
    try {
      serializedStyles = JSON.stringify(styles);
      
      // Parse back to ensure it's valid JSON
      JSON.parse(serializedStyles);
    } catch (jsonError) {
      console.error(`[Styles API] Styles object is not serializable:`, jsonError.message);
      return json({ 
        error: 'Invalid styles data: contains non-serializable values (functions, circular references, etc.)',
        success: false,
        details: jsonError.message
      }, { status: 400 });
    }

    // Save to MongoDB
    try {
      const result = await saveSalesPopStyles(normalizedShop, styles);
      
      if (result) {
      } else {
        console.error(`[Styles API] ⚠️ Save function returned null/undefined`);
      }
      
      return json({ 
        success: true,
        message: 'Styles saved successfully',
        saved: !!result,
        documentId: result?._id?.toString() || null
      });
    } catch (dbError) {
      console.error(`[Styles API] ✗ MongoDB error for ${shop}:`, dbError);
      console.error(`[Styles API] Error type: ${dbError.constructor.name}`);
      console.error(`[Styles API] MongoDB error details:`, {
        name: dbError.name,
        message: dbError.message,
        code: dbError.code,
        codeName: dbError.codeName,
        stack: dbError.stack?.substring(0, 500)
      });
      
      // Return specific error messages
      const errorMessage = dbError.message || 'Unknown database error';
      
      return json({ 
        error: errorMessage,
        success: false,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      }, { status: 500 });
    }
  } catch (error) {
    console.error('[Styles API] Error saving styles:', error);
    console.error('[Styles API] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.substring(0, 500)
    });
    
    return json({ 
      error: error.message || 'Failed to save styles',
      success: false,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}

