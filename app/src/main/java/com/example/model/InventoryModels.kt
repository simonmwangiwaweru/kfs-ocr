package com.example.model

enum class SyncStatus {
    SAVED_OFFLINE,
    SYNCING,
    SYNCED
}

enum class ScanMode {
    SINGLE_PAGE,
    BATCH_PAGES,
    PENDING_QUEUE
}

data class BoundingBox(
    val topRatio: Float,
    val leftRatio: Float,
    val bottomRatio: Float,
    val rightRatio: Float
)

data class CellConfidence(
    val confidence: Float, // 0.0 to 1.0
    val isUncertain: Boolean, // flagged if < 0.85 or failed sanity rule
    val rawOcrReading: String,
    val boundingBox: BoundingBox? = null
)

data class ReviewerComment(
    val id: String,
    val author: String,
    val text: String,
    val timestamp: Long,
    val isResolved: Boolean = false
)

data class CellData(
    val value: String,
    val confidence: CellConfidence,
    val comments: List<ReviewerComment> = emptyList(),
    val isManuallyEdited: Boolean = false,
    val originalOcrValue: String = value
)

data class InventoryRow(
    val rowNumber: Int,
    val treeNumber: CellData,
    val speciesCode: CellData,
    val dbhCm: CellData,       // Diameter at Breast Height in cm
    val heightM: CellData,     // Tree height in meters
    val healthStatus: CellData, // e.g. "Good", "Fine", "Fair", "Poor"
    val notes: CellData
)

data class ScannedDocument(
    val id: String,
    val title: String,
    val plotCode: String,
    val forestStation: String,
    val observerName: String,
    val scanDateMillis: Long,
    val imagePath: String? = null,
    val imageResName: String = "sample_field_form",
    val fileSizeBytes: Long = 1845200L,
    val fileType: String = "JPEG Form Scan",
    val syncStatus: SyncStatus = SyncStatus.SYNCED,
    val rows: List<InventoryRow> = emptyList(),
    val isVerified: Boolean = false
) {
    val totalUncertainCells: Int
        get() = rows.sumOf { row ->
            var count = 0
            if (row.treeNumber.confidence.isUncertain) count++
            if (row.speciesCode.confidence.isUncertain) count++
            if (row.dbhCm.confidence.isUncertain) count++
            if (row.heightM.confidence.isUncertain) count++
            if (row.healthStatus.confidence.isUncertain) count++
            if (row.notes.confidence.isUncertain) count++
            count
        }

    val totalComments: Int
        get() = rows.sumOf { row ->
            row.treeNumber.comments.size +
            row.speciesCode.comments.size +
            row.dbhCm.comments.size +
            row.heightM.comments.size +
            row.healthStatus.comments.size +
            row.notes.comments.size
        }
}

data class BatchScanItem(
    val id: String,
    val uri: String?,
    val timestamp: Long,
    val pageNumber: Int
)
