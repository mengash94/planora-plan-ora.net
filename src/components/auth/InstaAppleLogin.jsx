const handleAppleLogin = async () => {
  toast.info('מתחיל תהליך התחברות...');
  setIsLoading(true);

  try {
    if (!isNative) throw new Error('Not native device');

    alert('🍎 Step 1: Getting plugin...');
    const plugin = await waitForSocialLogin();
    
    if (!plugin) {
      throw new Error('Plugin not found');
    }
    
    alert('🍎 Step 2: Plugin ready, calling Apple login...');
    
    // קריאה לאפל עם timeout
    const loginPromise = plugin.login({
      provider: 'apple',
      options: { scopes: ['email', 'name'] }
    });
    
    // Timeout של 60 שניות
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Apple login timeout - 60s')), 60000)
    );
    
    alert('🍎 Step 3: Waiting for Apple response...');
    
    const loginResult = await Promise.race([loginPromise, timeoutPromise]);

    // אם הגענו לכאן - אפל החזיר תשובה!
    alert('🍎 Step 4: Apple responded!\n' + JSON.stringify(loginResult, null, 2));

    const appleUserId = loginResult.result?.user || loginResult.result?.userIdentifier;
    
    if (!appleUserId) {
      throw new Error('No User ID received from Apple');
    }

    alert('🍎 Step 5: Got user ID: ' + appleUserId);

    let email = loginResult.result?.email;
    let fullName = null;
    
    if (loginResult.result?.givenName) {
      fullName = `${loginResult.result.givenName} ${loginResult.result.familyName || ''}`;
    }

    if (!email) {
      email = `apple_${appleUserId}@planora.placeholder.com`;
    }

    const staticSecurePassword = `Apple_${appleUserId}_SecureLogin!`;

    alert('🍎 Step 6: Calling Instaback...\nEmail: ' + email);

    const user = await loginOrRegisterToInstaback(email, fullName, staticSecurePassword);

    if (!user?.id) throw new Error('Backend login returned no ID');

    alert('🍎 Step 7: SUCCESS! User ID: ' + user.id);

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
    // שגיאה עם כל הפרטים
    const errorDetails = {};
    if (error && typeof error === 'object') {
      Object.getOwnPropertyNames(error).forEach(key => {
        errorDetails[key] = error[key];
      });
    }
    alert('🍎 ERROR:\n' + JSON.stringify(errorDetails, null, 2));
    
    const errMsg = error?.message || 'Unknown error';
    if (!errMsg.includes('cancel')) {
      toast.error('שגיאה: ' + errMsg);
    }
  } finally {
    setIsLoading(false);
  }
};