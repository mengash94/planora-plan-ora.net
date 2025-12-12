import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Camera, Loader2, User, Mail, Phone, Save } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import {
    updateUser,
    deleteFileFromInstaback,
    getCurrentUserFromServer,
    resolveInstabackFileUrl,
    getToken
} from '@/components/instabackService';
import { compressImage } from '@/components/utils/imageCompressor';

export default function ProfileDetails({ user: initialUser, onUpdate }) {
  const [localUser, setLocalUser] = useState(initialUser || {});
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const { toast } = useToast();

  // Load fresh user data from server on mount - ONLY ONCE
  useEffect(() => {
    const loadUserData = async () => {
      if (!initialUser?.id) return;
      
      setIsLoadingUser(true);
      try {
        console.log('[ProfileDetails] Loading user data from server...');
        const freshUser = await getCurrentUserFromServer();
        if (freshUser) {
          console.log('[ProfileDetails] Loaded fresh user data:', JSON.stringify(freshUser));
          console.log('[ProfileDetails] Setting localUser state with firstName:', freshUser.firstName);
          setLocalUser(freshUser);
        }
      } catch (error) {
        console.error('[ProfileDetails] Failed to load user data:', error);
      } finally {
        setIsLoadingUser(false);
      }
    };

    loadUserData();
  }, [initialUser?.id]); // Only re-run if user ID changes

  // Debug: log localUser state changes
  useEffect(() => {
    console.log('[ProfileDetails] localUser state updated:', {
      firstName: localUser?.firstName,
      lastName: localUser?.lastName,
      email: localUser?.email,
      phone: localUser?.phone,
      avatar_url: localUser?.avatar_url
    });
  }, [localUser]);

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('[ProfileDetails] Starting avatar upload process...');

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'קובץ לא תקין',
        description: 'אנא בחר קובץ תמונה תקני',
        variant: 'destructive'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'קובץ גדול מדי',
        description: 'גודל הקובץ חייב להיות עד 5MB',
        variant: 'destructive'
      });
      return;
    }

    setIsUploading(true);
    
    try {
      toast({
        title: 'מכין את התמונה... 🖼️',
        description: 'דוחס ומעלה את התמונה',
        duration: 2000
      });

      // Delete old avatar if exists
      if (localUser?.avatar_url) {
        try {
          console.log('[ProfileDetails] Deleting old avatar:', localUser.avatar_url);
          await deleteFileFromInstaback(localUser.avatar_url);
          console.log('[ProfileDetails] Old avatar deleted');
        } catch (deleteError) {
          console.warn('[ProfileDetails] Failed to delete old avatar:', deleteError);
        }
      }

      // Compress image
      console.log('[ProfileDetails] Compressing image...');
      const compressedFile = await compressImage(file, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.85
      });

      // ✅ Upload directly to user_profiles folder
      console.log('[ProfileDetails] Uploading to InstaBack (user_profiles folder)...');
      
      const currentToken = getToken();
      const PROJECT_ROOT_URL = 'https://instaback.ai/project/f78de3ce-0cab-4ccb-8442-0c5749792fe8';
      const folderName = 'user_profiles';

      // Create folder if needed
      try {
        await fetch(`${PROJECT_ROOT_URL}/assets/folder`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': currentToken ? `Bearer ${currentToken}` : '',
            'accept': 'application/json'
          },
          body: JSON.stringify({ folderName })
        });
      } catch (folderError) {
        console.log('[ProfileDetails] Folder already exists or created');
      }

      // Upload file
      const formData = new FormData();
      formData.append('file', compressedFile);

      const uploadUrl = `${PROJECT_ROOT_URL}/assets/upload?folder=${encodeURIComponent(folderName)}`;
      console.log(`[ProfileDetails] Upload URL: ${uploadUrl}`);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': currentToken ? `Bearer ${currentToken}` : '',
          'accept': 'application/json'
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error(`[ProfileDetails] Upload failed:`, errorText);
        throw new Error(`Upload failed: HTTP ${response.status}`);
      }

      const uploadResult = await response.json();
      console.log('[ProfileDetails] Raw upload result:', uploadResult);

      // Get the URL from response
      let fileUrl = uploadResult.data?.url || uploadResult.url || uploadResult.file_url;
      console.log('[ProfileDetails] Raw fileUrl from server:', fileUrl);

      // Resolve the file URL
      const resolvedFileUrl = resolveInstabackFileUrl(fileUrl);
      if (!resolvedFileUrl) {
        throw new Error('Failed to resolve InstaBack file URL after upload.');
      }

      const newAvatarUrl = resolvedFileUrl;
      console.log('[ProfileDetails] Upload successful, new URL:', newAvatarUrl);

      // Update user profile in database
      console.log('[ProfileDetails] Updating user in InstaBack database...');
      const updateResult = await updateUser(localUser.id, { avatar_url: newAvatarUrl });
      console.log('[ProfileDetails] InstaBack update result:', updateResult);

      // Create updated user object
      const updatedUser = { ...localUser, avatar_url: newAvatarUrl };
      console.log('[ProfileDetails] Updated user object:', updatedUser);
      
      // Update local state
      setLocalUser(updatedUser);
      
      // Update AuthProvider state
      if (onUpdate) {
        console.log('[ProfileDetails] Calling onUpdate to update AuthProvider');
        onUpdate(updatedUser);
      }

      // Update localStorage directly
      if (typeof window !== 'undefined') {
        console.log('[ProfileDetails] Updating localStorage');
        localStorage.setItem('instaback_user', JSON.stringify(updatedUser));
        console.log('[ProfileDetails] localStorage updated, verifying...');
        const stored = localStorage.getItem('instaback_user');
        console.log('[ProfileDetails] Stored user in localStorage:', stored);
      }

      toast({
        title: 'תמונת הפרופיל עודכנה! ✅',
        description: 'התמונה שלך הועלתה בהצלחה',
        duration: 3000
      });

    } catch (error) {
      console.error('[ProfileDetails] Avatar upload failed:', error);
      toast({
        title: 'שגיאה בהעלאת התמונה',
        description: error.message || 'אירעה שגיאה בהעלאת תמונת הפרופיל',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleSave = async () => {
    if (!localUser?.id) return;

    setIsSaving(true);
    try {
      const updates = {
        firstName: localUser.firstName?.trim() || '',
        phone: localUser.phone || ''
      };

      console.log('[ProfileDetails] Saving updates:', updates);
      
      await updateUser(localUser.id, updates);

      const updatedUser = { ...localUser, ...updates };
      setLocalUser(updatedUser);

      // Update parent component (AuthProvider)
      if (onUpdate) {
        onUpdate(updatedUser);
      }

      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('instaback_user', JSON.stringify(updatedUser));
      }

      toast({
        title: 'הפרטים נשמרו! ✅',
        description: 'הפרטים האישיים שלך עודכנו בהצלחה',
        duration: 3000
      });
    } catch (error) {
      console.error('[ProfileDetails] Failed to save user details:', error);
      toast({
        title: 'שגיאה בשמירה',
        description: error.message || 'אירעה שגיאה בעדכון הפרטים',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Build display values from InstaBack fields
  const displayName = `${localUser?.firstName || ''} ${localUser?.lastName || ''}`.trim();
  const displayEmail = localUser?.email || '';
  const displayPhone = localUser?.phone || '';
  const avatarUrl = resolveInstabackFileUrl(localUser?.avatar_url);

  console.log('[ProfileDetails] Rendering with:', {
    displayName,
    displayEmail,
    displayPhone,
    avatarUrl,
    firstName: localUser?.firstName,
    isLoadingUser
  });

  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-600">
          <User className="w-5 h-5" />
          פרטים אישיים
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Upload */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center border-4 border-white shadow-lg">
              {isUploading ? (
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
              ) : avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  key={avatarUrl}
                  onError={(e) => {
                    console.error('[ProfileDetails] Failed to load avatar image:', e.target.src);
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center text-orange-600 text-2xl font-bold">${(displayName || displayEmail || 'P').charAt(0).toUpperCase()}</div>`;
                  }}
                />
              ) : (
                <div className="text-orange-600 text-4xl font-bold">
                  {(displayName || displayEmail || 'P').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 bg-orange-500 hover:bg-orange-600 text-white p-2 rounded-full cursor-pointer shadow-lg transition-colors"
            >
              <Camera className="w-4 h-4" />
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={isUploading}
              />
            </label>
          </div>
          <p className="text-sm text-gray-600">לחץ על המצלמה להעלאת תמונת פרופיל</p>
        </div>

        {/* Name Field */}
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2 text-gray-700">
            <User className="w-4 h-4" />
            שם מלא
          </Label>
          <Input
            id="name"
            value={localUser?.firstName || ''}
            onChange={(e) => setLocalUser({ ...localUser, firstName: e.target.value })}
            placeholder="הזן את שמך המלא"
            className="text-right"
            disabled={isLoadingUser}
          />
        </div>

        {/* Email Field (Read-only) */}
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-2 text-gray-700">
            <Mail className="w-4 h-4" />
            אימייל
          </Label>
          <Input
            id="email"
            type="email"
            value={displayEmail}
            disabled
            className="text-right bg-gray-50"
          />
          <p className="text-xs text-gray-500">לא ניתן לשנות את כתובת האימייל</p>
        </div>

        {/* Phone Field */}
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2 text-gray-700">
            <Phone className="w-4 h-4" />
            טלפון
          </Label>
          <Input
            id="phone"
            type="tel"
            value={displayPhone}
            onChange={(e) => setLocalUser({ ...localUser, phone: e.target.value })}
            placeholder="הזן מספר טלפון"
            className="text-right"
            disabled={isLoadingUser}
          />
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isSaving || isLoadingUser}
          className="w-full bg-orange-500 hover:bg-orange-600"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              שומר...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 ml-2" />
              שמור שינויים
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}