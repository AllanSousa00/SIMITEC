package com.example.ui

import android.annotation.SuppressLint
import android.util.Log
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.barcode.BarcodeScannerOptions
import com.google.mlkit.vision.barcode.BarcodeScanning
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.common.InputImage
import java.util.concurrent.atomic.AtomicBoolean

class QrCodeAnalyzer(
    private val onQrCodeScanned: (String) -> Unit
) : ImageAnalysis.Analyzer, AutoCloseable {

    private val options = BarcodeScannerOptions.Builder()
        .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
        .build()

    private val scanner = BarcodeScanning.getClient(options)
    private var isScanning = true
    private val processing = AtomicBoolean(false)

    @SuppressLint("UnsafeOptInUsageError")
    override fun analyze(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage != null && isScanning && processing.compareAndSet(false, true)) {
            val image = InputImage.fromMediaImage(mediaImage, imageProxy.imageInfo.rotationDegrees)
            scanner.process(image)
                .addOnSuccessListener { barcodes ->
                    if (barcodes.isNotEmpty()) {
                        val barcodeValue = barcodes.firstNotNullOfOrNull { it.rawValue }
                        if (barcodeValue != null) {
                            isScanning = false // Pause scanning
                            onQrCodeScanned(barcodeValue)
                            
                            // Resume scanning after a brief delay if needed, 
                            // or leave it up to the ViewModel to handle the navigation
                        }
                    }
                }
                .addOnFailureListener {
                    Log.e("QrCodeAnalyzer", "Barcode scan failed", it)
                }
                .addOnCompleteListener {
                    processing.set(false)
                    imageProxy.close()
                }
        } else {
            imageProxy.close()
        }
    }

    override fun close() {
        isScanning = false
        scanner.close()
    }
}
