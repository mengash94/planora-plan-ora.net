import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
    try {
        const { endpoint, options, token } = await req.json();
        
        if (!endpoint) {
            return Response.json({ error: 'Endpoint is required' }, { status: 400 });
        }

        console.log('ProxyInstaback called with:', { endpoint, method: options?.method, hasToken: !!token });

        // Base URL for InstaBack API
        const baseUrl = 'https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8/api';
        
        // Build full URL
        const fullUrl = `${baseUrl}${endpoint}`;
        
        // Prepare headers
        const headers = {
            'Content-Type': 'application/json',
            'accept': 'application/json',
            ...options?.headers
        };

        // Add authorization if token provided
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        } else {
            // Try to get token from current user via Base44 SDK
            try {
                const base44 = createClientFromRequest(req);
                const user = await base44.auth.me();
                if (user) {
                    // Get InstaBack token from user data if available
                    const instabackToken = localStorage?.getItem?.('instaback_token');
                    if (instabackToken) {
                        headers['Authorization'] = `Bearer ${instabackToken}`;
                    }
                }
            } catch (authError) {
                console.warn('Failed to get auth for proxy:', authError.message);
            }
        }

        // Prepare fetch options
        const fetchOptions = {
            method: options?.method || 'GET',
            headers,
            ...(options?.body && { body: options.body })
        };

        console.log('Making request to:', fullUrl, 'with method:', fetchOptions.method);

        // Make the request
        const response = await fetch(fullUrl, fetchOptions);
        
        console.log('InstaBack response status:', response.status);

        // Handle different response types
        let result;
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');

        // Check if response has content
        if (response.status === 204 || contentLength === '0') {
            // No content response
            result = null;
        } else if (contentType && contentType.includes('application/json')) {
            // JSON response - read once and handle
            try {
                const responseText = await response.text();
                if (responseText.trim()) {
                    result = JSON.parse(responseText);
                } else {
                    result = null;
                }
            } catch (parseError) {
                console.warn('Failed to parse JSON response:', parseError);
                result = { success: true, rawResponse: await response.text() };
            }
        } else {
            // Non-JSON response
            result = await response.text();
        }

        // Handle error responses
        if (!response.ok) {
            const errorMessage = result?.error || result?.message || `HTTP ${response.status}`;
            console.error('InstaBack API error:', errorMessage);
            
            return Response.json({ 
                error: errorMessage,
                status: response.status,
                details: result
            }, { status: response.status });
        }

        // Success response
        return Response.json({ 
            data: result,
            status: response.status,
            headers: Object.fromEntries(response.headers.entries())
        });

    } catch (error) {
        console.error('Proxy error:', error);
        return Response.json({ 
            error: error.message,
            details: error.stack
        }, { status: 500 });
    }
});