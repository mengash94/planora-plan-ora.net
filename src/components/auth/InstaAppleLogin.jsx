const handleAppleLogin = async () => {
    toast.info('מתחיל תהליך התחברות...');
    setIsLoading(true);

    // פונקציה לפענוח JWT
    const decodeJWT = (token) => {
      try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        // הפיענוח של החלק האמצעי (payload)
        const payload = parts[1];
        const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
        return JSON.parse(decoded);
      } catch (e) {
        return null;
      }
    };

    try {
      if (!isNative) {
        showDebugAlert('Error', 'Not native device');
        throw new Error('Not native device');
      }

      showDebugAlert('Step 1', 'Getting plugin...');
      const plugin = await waitForSocialLogin();
      
      if (!plugin) {
        showDebugAlert('Error', 'Plugin not found');
        throw new Error('Plugin not found');
      }
      
      showDebugAlert('Step 2', 'Plugin ready, calling Apple login...');
      
      const loginPromise = plugin.login({
        provider: 'apple',
        options: { scopes: ['email', 'name'] }
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Apple login timeout - 60s')), 60000)
      );
      
      showDebugAlert('Step 3', 'Waiting for Apple response...');
      
      const loginResult = await Promise.race([loginPromise, timeoutPromise]);

      showDebugAlert('Step 4 - Response', loginResult);

      // שליפת ה-idToken
      const idToken = loginResult?.result?.idToken;
      
      if (!idToken) {
        showDebugAlert('Error', 'No idToken in response');
        throw new Error('No idToken received from Apple');
      }

      // פענוח ה-JWT לקבלת ה-User ID
      const decodedToken = decodeJWT(idToken);
      
      showDebugAlert('Step 4.5 - Decoded JWT', decodedToken);

      // ה-sub הוא ה-User ID של אפל
      const appleUserId = decodedToken?.sub;
      const email = decodedToken?.email;

      if (!appleUserId) {
        showDebugAlert('Error', 'No sub (user ID) in decoded token');
        throw new Error('No User ID in Apple token');
      }

      showDebugAlert('Step 5', 'Got user ID: ' + appleUserId + '\nEmail: ' + (email || 'none'));

      // אימייל - מה-token או placeholder
      const userEmail = email || `apple_${appleUserId}@planora.placeholder.com`;

      const staticSecurePassword = `Apple_${appleUserId}_SecureLogin!`;

      showDebugAlert('Step 6', 'Calling Instaback...\nEmail: ' + userEmail);

      const user = await loginOrRegisterToInstaback(userEmail, null, staticSecurePassword);

      if (!user?.id) {
        showDebugAlert('Error', 'Backend returned no ID');
        throw new Error('Backend login returned no ID');
      }

      showDebugAlert('Step 7', 'SUCCESS! User ID: ' + user.id);

      if (typeof window !== 'undefined') {
        localStorage.setItem('instaback_user', JSON.stringify(user));
      }

      try {
        const { loginOneSignalExternalId } = await import('@/components/onesignalService');
        await loginOneSignalExternalId(user.id);
      } catch (e) {
        console.warn('Push failed', e);
      }

      toast.success('התחברת בהצלחה!');
      setTimeout(() => { window.location.href = '/'; }, 500);

    } catch (error) {
      showDebugAlert('CRITICAL ERROR', error);
      
      const errMsg = error?.message || 'Unknown error';
      if (!errMsg.includes('cancel')) {
        toast.error('שגיאה: ' + errMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };