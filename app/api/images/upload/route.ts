import { NextRequest, NextResponse } from 'next/server';
import { uploadAndVerifyImageOnBloggerHost } from '@/src/server/bloggerImageHostService';
import { verifyPublicImageUrl } from '@/src/server/imageVerificationService';

/**
 * ARCHITECTURAL COMMENT:
 * ============================================================================
 * Image Upload & Verification API
 * ----------------------------------------------------------------------------
 * 1. Never trusts raw browser image inputs or local file URLs.
 * 2. Uploads user-selected images to the dedicated secondary Blogger site
 *    acting as an image host repository.
 * 3. Extracts the Blogger-generated Google CDN URL (e.g. *.blogger.googleusercontent.com).
 * 4. Rigorously verifies the URL server-side (HTTPS, SSRF prevention, 2xx reachability,
 *    and valid image MIME type).
 * 5. Returns success ONLY after complete verification.
 * ============================================================================
 */

export async function POST(req: NextRequest) {
  try {
    // 1. Extract Bearer token if supplied by client
    let callerToken: string | null = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      callerToken = authHeader.replace('Bearer ', '').trim();
    } else {
      const cookieToken = req.cookies.get('blogger_access_token')?.value;
      if (cookieToken) callerToken = cookieToken.trim();
    }

    const contentTypeHeader = req.headers.get('content-type') || '';

    // Handle Option A: Multipart Form Data
    if (contentTypeHeader.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const hostBlogId = (formData.get('hostBlogId') as string | null) || (formData.get('blogId') as string | null) || undefined;

      if (!file) {
        return NextResponse.json(
          { success: false, verified: false, error: 'No image file uploaded in form data.' },
          { status: 400 }
        );
      }

      // Check file size (Max 20MB)
      if (file.size > 20 * 1024 * 1024) {
        return NextResponse.json(
          {
            success: false,
            verified: false,
            error: `Image exceeds 20MB maximum size limit (received ${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
          },
          { status: 400 }
        );
      }

      // Check MIME type
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { success: false, verified: false, error: `Invalid file type '${file.type}'. Only images are allowed.` },
          { status: 400 }
        );
      }

      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');

      const result = await uploadAndVerifyImageOnBloggerHost({
        imageBase64OrDataUrl: base64,
        mimeType: file.type,
        fileName: file.name || 'image.jpg',
        callerBearerToken: callerToken,
        targetHostBlogId: hostBlogId,
      });

      if (!result.success || !result.verified) {
        return NextResponse.json(
          {
            success: false,
            verified: false,
            error: result.error || 'Image upload and verification failed on Blogger image host.',
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        imageUrl: result.imageUrl,
        verified: true,
        contentType: result.details?.contentType,
        contentLength: result.details?.contentLength,
      });
    }

    // Handle Option B: JSON payload
    const body = await req.json();

    // Verification-only request for already-hosted URL
    if (body.verifyUrl && typeof body.verifyUrl === 'string') {
      const verifyResult = await verifyPublicImageUrl(body.verifyUrl);
      if (!verifyResult.isValid) {
        return NextResponse.json(
          {
            success: false,
            verified: false,
            error: verifyResult.error || 'Image URL is not publicly accessible',
          },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        imageUrl: verifyResult.verifiedUrl,
        verified: true,
        contentType: verifyResult.contentType,
      });
    }

    // Direct Image Upload request
    const { image, imageBase64, mimeType = 'image/jpeg', fileName = 'upload.jpg', hostBlogId } = body;
    const rawImage = image || imageBase64;

    if (!rawImage || typeof rawImage !== 'string') {
      return NextResponse.json(
        { success: false, verified: false, error: 'Please supply image data or file to upload.' },
        { status: 400 }
      );
    }

    const result = await uploadAndVerifyImageOnBloggerHost({
      imageBase64OrDataUrl: rawImage,
      mimeType,
      fileName,
      callerBearerToken: callerToken,
      targetHostBlogId: hostBlogId,
    });

    if (!result.success || !result.verified) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: result.error || 'Failed to upload and verify image on Blogger image host.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      verified: true,
      details: result.details,
    });
  } catch (error: unknown) {
    console.error('Image Upload API error:', error);
    const message = error instanceof Error ? error.message : 'Internal error processing image upload.';
    return NextResponse.json(
      {
        success: false,
        verified: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
