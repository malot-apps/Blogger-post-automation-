package com.aistudio.bloggerautopublisher.util

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.Rect
import android.graphics.Shader
import android.net.Uri
import android.util.Base64
import com.aistudio.bloggerautopublisher.model.CompositionStyle
import com.aistudio.bloggerautopublisher.model.FocalPoint
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.util.UUID
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

data class ProcessedImage(
    val uri: Uri,
    val width: Int,
    val height: Int,
    val sizeBytes: Long,
    val base64Data: String? = null
)

object ImageOptimizer {

    fun formatFileSize(bytes: Long): String {
        return when {
            bytes < 1024 -> "$bytes B"
            bytes < 1024 * 1024 -> "${bytes / 1024} KB"
            else -> String.format(java.util.Locale.US, "%.1f MB", bytes.toDouble() / (1024 * 1024))
        }
    }

    fun decodeSampledBitmapFromUri(
        context: Context,
        uri: Uri,
        reqWidth: Int = 1200,
        reqHeight: Int = 1200
    ): Bitmap? {
        return try {
            val options = BitmapFactory.Options().apply {
                inJustDecodeBounds = true
            }
            context.contentResolver.openInputStream(uri)?.use {
                BitmapFactory.decodeStream(it, null, options)
            }

            var inSampleSize = 1
            if (options.outHeight > reqHeight || options.outWidth > reqWidth) {
                val halfHeight = options.outHeight / 2
                val halfWidth = options.outWidth / 2
                while ((halfHeight / inSampleSize) >= reqHeight && (halfWidth / inSampleSize) >= reqWidth) {
                    inSampleSize *= 2
                }
            }

            options.inJustDecodeBounds = false
            options.inSampleSize = inSampleSize
            context.contentResolver.openInputStream(uri)?.use {
                BitmapFactory.decodeStream(it, null, options)
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    fun optimizeAndSave(
        context: Context,
        sourceBitmap: Bitmap,
        quality: Int = 82
    ): ProcessedImage {
        val stream = ByteArrayOutputStream()
        sourceBitmap.compress(Bitmap.CompressFormat.JPEG, quality, stream)
        val byteArray = stream.toByteArray()

        val tempFile = File(context.cacheDir, "img_${UUID.randomUUID()}.jpg")
        FileOutputStream(tempFile).use { it.write(byteArray) }

        val base64 = Base64.encodeToString(byteArray, Base64.NO_WRAP)
        return ProcessedImage(
            uri = Uri.fromFile(tempFile),
            width = sourceBitmap.width,
            height = sourceBitmap.height,
            sizeBytes = tempFile.length(),
            base64Data = base64
        )
    }

    fun compose16x9Thumbnail(
        context: Context,
        sourceBitmap: Bitmap,
        focalPoint: FocalPoint = FocalPoint(),
        style: CompositionStyle = CompositionStyle.CINEMATIC_FOCUS,
        targetWidth: Int = 1200,
        targetHeight: Int = 675
    ): ProcessedImage {
        val srcW = sourceBitmap.width
        val srcH = sourceBitmap.height
        val targetRatio = targetWidth.toFloat() / targetHeight.toFloat()
        val srcRatio = srcW.toFloat() / srcH.toFloat()

        var cropW: Int
        var cropH: Int
        if (srcRatio > targetRatio) {
            cropH = srcH
            cropW = (srcH * targetRatio).roundToInt()
        } else {
            cropW = srcW
            cropH = (srcW / targetRatio).roundToInt()
        }

        var zoomFactor = focalPoint.recommendedZoom
        if (style == CompositionStyle.DRAMATIC_CLOSE) {
            zoomFactor = min(1.25f, max(1.15f, zoomFactor * 1.15f))
        }

        cropW = (cropW / zoomFactor).roundToInt()
        cropH = (cropH / zoomFactor).roundToInt()

        val safeX = max(30f, min(70f, focalPoint.xPercent))
        val safeY = max(30f, min(70f, focalPoint.yPercent))
        var focalX = (safeX / 100f) * srcW
        val focalY = (safeY / 100f) * srcH

        if (style == CompositionStyle.RULE_OF_THIRDS) {
            focalX = if (focalPoint.xPercent > 50f) {
                min(srcW - cropW / 2f, focalX + cropW * 0.1f)
            } else {
                max(cropW / 2f, focalX - cropW * 0.1f)
            }
        }

        var srcX = (focalX - cropW / 2f).roundToInt()
        var srcY = (focalY - cropH / 2f).roundToInt()
        srcX = max(0, min(srcW - cropW, srcX))
        srcY = max(0, min(srcH - cropH, srcY))

        val outputBitmap = Bitmap.createBitmap(targetWidth, targetHeight, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(outputBitmap)

        val srcRect = Rect(srcX, srcY, srcX + cropW, srcY + cropH)
        val dstRect = Rect(0, 0, targetWidth, targetHeight)
        val paint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)
        canvas.drawBitmap(sourceBitmap, srcRect, dstRect, paint)

        // Apply artistic overlay
        if (style == CompositionStyle.CINEMATIC_FOCUS || style == CompositionStyle.DRAMATIC_CLOSE) {
            val vignettePaint = Paint().apply {
                shader = RadialGradient(
                    targetWidth / 2f,
                    targetHeight / 2f,
                    targetWidth * 0.65f,
                    intArrayOf(Color.TRANSPARENT, Color.argb(70, 0, 0, 0)),
                    floatArrayOf(0.4f, 1.0f),
                    Shader.TileMode.CLAMP
                )
            }
            canvas.drawRect(0f, 0f, targetWidth.toFloat(), targetHeight.toFloat(), vignettePaint)
        }

        // Bottom gradient for readability
        val bottomGradient = Paint().apply {
            shader = LinearGradient(
                0f,
                targetHeight * 0.7f,
                0f,
                targetHeight.toFloat(),
                Color.TRANSPARENT,
                Color.argb(90, 0, 0, 0),
                Shader.TileMode.CLAMP
            )
        }
        canvas.drawRect(0f, targetHeight * 0.7f, targetWidth.toFloat(), targetHeight.toFloat(), bottomGradient)

        val stream = ByteArrayOutputStream()
        outputBitmap.compress(Bitmap.CompressFormat.JPEG, 90, stream)
        val bytes = stream.toByteArray()

        val file = File(context.cacheDir, "thumb_${UUID.randomUUID()}.jpg")
        FileOutputStream(file).use { it.write(bytes) }

        val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
        return ProcessedImage(
            uri = Uri.fromFile(file),
            width = targetWidth,
            height = targetHeight,
            sizeBytes = file.length(),
            base64Data = base64
        )
    }
}
