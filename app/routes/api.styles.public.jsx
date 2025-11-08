import { json } from '@remix-run/node';
import { getSalesPopStyles } from '../stylesRepository.server';

/**
 * GET /api/styles/public?shop=myshop.myshopify.com
 * Public endpoint to fetch styles configuration for storefront
 * Note: This endpoint should be protected with app proxy or shop parameter validation
 */
export async function loader({ request }) {
  try {
    const url = new URL(request.url);
    const shop = url.searchParams.get('shop');

    if (!shop) {
      return json({ 
        error: 'Shop parameter is required',
        success: false 
      }, { status: 400 });
    }

    // Validate shop domain format (basic validation)
    if (!shop.includes('.myshopify.com')) {
      return json({ 
        error: 'Invalid shop domain',
        success: false 
      }, { status: 400 });
    }

    const styles = await getSalesPopStyles(shop);
    return json({ 
      styles: styles || {},
      success: true 
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  } catch (error) {
    console.error('Error loading public styles:', error);
    return json({ 
      error: 'Failed to load styles',
      success: false 
    }, { status: 500 });
  }
}
