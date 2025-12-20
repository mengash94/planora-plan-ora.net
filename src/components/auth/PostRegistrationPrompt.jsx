const handleAppleLogin = async () => {
    toast.info('מתחיל תהליך התחברות...');
    setIsLoading(true);

    try {
      if (!isNative) {
        throw new Error('Not native device');
      }

      const plugin = await waitForSocialLogin();
      
      if (!plugin) {
        throw new Error('Plugin not found');
      }
      
      const loginResult = await plugin.login({
        provider: 'apple',
        options: { scopes: ['email', 'name'] }
      });

      showDebugAlert('Apple Response', loginResult);

      // המיקום הנכון: result.profile.user
      const profile = loginResult?.result?.profile;
      const appleUserId = profile?.user;
      const email = profile?.email;
      const givenName = profile?.givenName;
      const familyName = profile?.familyName;

      showDebugAlert('Extracted Data', { appleUserId, email, givenName, familyName });

      if (!appleUserId) {
        throw new Error('No User ID from Apple');
      }

      const fullName = givenName ? `${givenName} ${familyName || ''}`.trim() : null;
      const userEmail = email || `apple_${appleUserId}@planora.placeholder.com`;
      const staticSecurePassword = `Apple_${appleUserId}_SecureLogin!`;

      showDebugAlert('Calling Backend', { userEmail, fullName });

      const user = await loginOrRegisterToInstaback(userEmail, fullName, staticSecurePassword);

      if (!user?.id) {
        throw new Error('Backend login returned no ID');
      }

      showDebugAlert('SUCCESS!', 'User ID: ' + user.id);

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
      showDebugAlert('ERROR', error);
      
      const errMsg = error?.message || 'Unknown error';
      if (!errMsg.includes('cancel')) {
        toast.error('שגיאה: ' + errMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };