package com.example.model

enum class SyncStatus {
    SAVED_OFFLINE,
    SYNCING,
    SYNCED
}

enum class ScanMode {
    FORM_MODE,
    BATCH_PAGES,
    GALLERY
}

data class CandidateReading(
    val value: String,
    val probability: Float,
    val reason: String = ""
)

data class ReviewerComment(
    val id: String,
    val author: String,
    val text: String,
    val timestamp: Long,
    val isResolved: Boolean = false
)

data class MatrixCell(
    val colIndex: Int,              // 1 to 19
    val colKey: String,             // "C1" to "C19"
    val dbhValue: String,           // Primary measurement in BLUE ink (DBH) e.g. "178"
    val heightValue: String = "",   // Smaller number in RED ink on top (Height) e.g. "24.5"
    val value: String = dbhValue,   // Backwards compatibility for existing views
    val dbhConfidence: Float = 0.95f,
    val heightConfidence: Float = 0.90f,
    val confidence: Float = dbhConfidence,
    val isUncertain: Boolean = dbhConfidence < 0.85f || (heightValue.isNotEmpty() && heightConfidence < 0.85f),
    val isVerified: Boolean = false,
    val visibilityIssue: String? = null,
    val candidateReadings: List<CandidateReading> = emptyList(),
    val comments: List<ReviewerComment> = emptyList()
)

data class MatrixRow(
    val rowNumber: Int,             // 1 to 10
    val cells: List<MatrixCell>     // 19 cells per row (10 rows x 19 columns)
)

data class MetadataField(
    val label: String,
    val value: String
)

data class VisibilityAuditIssue(
    val rowNumber: Int,
    val colIndex: Int,
    val colKey: String,
    val fieldType: String,          // "DBH (Blue)" or "Height (Red)"
    val issueDescription: String,   // e.g. "Faint blue pencil stroke", "Fold crease across cell"
    val detectedFragment: String? = null
)

data class ScannedDocument(
    val id: String,
    val title: String,
    val plotCode: String,
    val forestStation: String,
    val observerName: String,
    val speciesTaxon: String = "Eucalyptus saligna",
    val plantingYear: String = "1982",
    val age: String = "44",
    val scanDateMillis: Long = System.currentTimeMillis(),
    val imagePath: String? = null,
    val imageResName: String = "sample_field_form",
    val fileSizeBytes: Long = 1845200L,
    val fileType: String = "Form AGW-85-01 Scan",
    val syncStatus: SyncStatus = SyncStatus.SYNCED,
    val rows: List<MatrixRow> = emptyList(),
    val metadataFields: List<MetadataField> = emptyList(),
    val isVerified: Boolean = false,
    val visibilityIssues: List<VisibilityAuditIssue> = emptyList(),
    val totalTreesStems: Int = 190
) {
    val totalCells: Int
        get() = rows.size * 19

    val lowConfidenceCellsCount: Int
        get() = rows.sumOf { row -> row.cells.count { it.isUncertain && !it.isVerified } }

    val verifiedCellsCount: Int
        get() = (totalCells - lowConfidenceCellsCount).coerceAtLeast(0)

    val hasUnclearNumbers: Boolean
        get() = visibilityIssues.isNotEmpty() || lowConfidenceCellsCount > 0
}

data class BatchScanItem(
    val id: String,
    val uri: String?,
    val timestamp: Long,
    val pageNumber: Int
)
