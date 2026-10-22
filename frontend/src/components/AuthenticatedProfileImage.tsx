"use client";

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface AuthenticatedProfileImageProps {
  fileKey: string;
  alt: string;
  className?: string;
}

export function AuthenticatedProfileImage({
  fileKey,
  alt,
  className,
}: AuthenticatedProfileImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    let objectUrl: string | null = null;
    const encodedFileKey = fileKey.split('/').map(encodeURIComponent).join('/');

    setImageUrl(null);
    api.get<Blob>(`/users/profile-pictures/${encodedFileKey}`, {
      responseType: 'blob',
    }).then(({ data }) => {
      const nextObjectUrl = URL.createObjectURL(data);
      if (!isCurrent) {
        URL.revokeObjectURL(nextObjectUrl);
        return;
      }
      objectUrl = nextObjectUrl;
      setImageUrl(nextObjectUrl);
    }).catch(() => {
      if (isCurrent) setImageUrl(null);
    });

    return () => {
      isCurrent = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileKey]);

  if (!imageUrl) return null;

  return <img src={imageUrl} alt={alt} className={className} />;
}