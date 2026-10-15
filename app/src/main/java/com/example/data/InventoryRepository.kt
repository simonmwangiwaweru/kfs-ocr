package com.example.data

import com.example.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.util.UUID

class InventoryRepository {

    private val _documents = MutableStateFlow<List<ScannedDocument>>(emptyList())
    val documents: StateFlow<List<ScannedDocument>> = _documents.asStateFlow()

    private val _activeDocumentId = MutableStateFlow<String?>(null)
    val activeDocumentId: StateFlow<String?> = _activeDocumentId.asStateFlow()

    private val _batchQueue = MutableStateFlow<List<BatchScanItem>>(emptyList())
    val batchQueue: StateFlow<List<BatchScanItem>> = _batchQueue.asStateFlow()

    private val _isOffline = MutableStateFlow(false)
    val isOffline: StateFlow<Boolean> = _isOffline.asStateFlow()

    private val _isSyncing = MutableStateFlow(false)
    val isSyncing: StateFlow<Boolean> = _isSyncing.asStateFlow()

    init {
        // Clean start: No auto-generated mockups or false sample archives
        _documents.value = emptyList()
        _activeDocumentId.value = null
    }

    fun setActiveDocument(id: String) {
        _activeDocumentId.value = id
    }

    fun getActiveDocument(): ScannedDocument? {
        val currentId = _activeDocumentId.value ?: return _documents.value.firstOrNull()
        return _documents.value.find { it.id == currentId } ?: _documents.value.firstOrNull()
    }

    fun toggleOfflineMode() {
        _isOffline.update { !it }
    }

    suspend fun syncAllOfflineDocuments() {
        if (_isOffline.value) return
        _isSyncing.value = true
        kotlinx.coroutines.delay(1200) // Realistic network sync latency
        _documents.update { docs ->
            docs.map { doc ->
                if (doc.syncStatus == SyncStatus.SAVED_OFFLINE) {
                    doc.copy(syncStatus = SyncStatus.SYNCED)
                } else doc
            }
        }
        _isSyncing.value = false
    }

    fun addToBatch(imageUri: String?) {
        val current = _batchQueue.value
        val newItem = BatchScanItem(
            id = UUID.randomUUID().toString(),
            uri = imageUri,
            timestamp = System.currentTimeMillis(),
            pageNumber = current.size + 1
        )
        _batchQueue.value = current + newItem
    }

    fun clearBatch() {
        _batchQueue.value = emptyList()
    }

    fun processBatch(plotCode: String, station: String, observer: String): ScannedDocument {
        val batchCount = _batchQueue.value.size.coerceAtLeast(1)
        val newDoc = createSyntheticDocument(
            plotCode = if (plotCode.isNotBlank()) plotCode else "KFR/BAT-${System.currentTimeMillis() % 1000}",
            station = if (station.isNotBlank()) station else "Aberdare Forest Station",
            observer = if (observer.isNotBlank()) observer else "Field Team Lead",
            pageCount = batchCount,
            isOffline = _isOffline.value
        )
        _documents.update { listOf(newDoc) + it }
        _activeDocumentId.value = newDoc.id
        clearBatch()
        return newDoc
    }

    fun createDocumentFromCapture(plotCode: String, station: String, observer: String): ScannedDocument {
        val newDoc = createSyntheticDocument(
            plotCode = if (plotCode.isNotBlank()) plotCode else "KFR/PLT-${System.currentTimeMillis() % 1000}",
            station = if (station.isNotBlank()) station else "Muguga Research Center",
            observer = if (observer.isNotBlank()) observer else "P. Mwangi",
            pageCount = 1,
            isOffline = _isOffline.value
        )
        _documents.update { listOf(newDoc) + it }
        _activeDocumentId.value = newDoc.id
        return newDoc
    }

    fun updateCellValue(docId: String, rowNum: Int, columnKey: String, newValue: String) {
        _documents.update { docs ->
            docs.map { doc ->
                if (doc.id == docId) {
                    val updatedRows = doc.rows.map { row ->
                        if (row.rowNumber == rowNum) {
                            when (columnKey) {
                                "treeNumber" -> row.copy(
                                    treeNumber = row.treeNumber.copy(
                                        value = newValue,
                                        isManuallyEdited = true,
                                        confidence = row.treeNumber.confidence.copy(isUncertain = false)
                                    )
                                )
                                "speciesCode" -> row.copy(
                                    speciesCode = row.speciesCode.copy(
                                        value = newValue,
                                        isManuallyEdited = true,
                                        confidence = row.speciesCode.confidence.copy(isUncertain = false)
                                    )
                                )
                                "dbhCm" -> row.copy(
                                    dbhCm = row.dbhCm.copy(
                                        value = newValue,
                                        isManuallyEdited = true,
                                        confidence = row.dbhCm.confidence.copy(isUncertain = false)
                                    )
                                )
                                "heightM" -> row.copy(
                                    heightM = row.heightM.copy(
                                        value = newValue,
                                        isManuallyEdited = true,
                                        confidence = row.heightM.confidence.copy(isUncertain = false)
                                    )
                                )
                                "healthStatus" -> row.copy(
                                    healthStatus = row.healthStatus.copy(
                                        value = newValue,
                                        isManuallyEdited = true,
                                        confidence = row.healthStatus.confidence.copy(isUncertain = false)
                                    )
                                )
                                "notes" -> row.copy(
                                    notes = row.notes.copy(
                                        value = newValue,
                                        isManuallyEdited = true,
                                        confidence = row.notes.confidence.copy(isUncertain = false)
                                    )
                                )
                                else -> row
                            }
                        } else row
                    }
                    doc.copy(rows = updatedRows)
                } else doc
            }
        }
    }

    fun addComment(docId: String, rowNum: Int, columnKey: String, author: String, text: String) {
        val comment = ReviewerComment(
            id = UUID.randomUUID().toString(),
            author = author.ifBlank { "Reviewer" },
            text = text,
            timestamp = System.currentTimeMillis()
        )
        _documents.update { docs ->
            docs.map { doc ->
                if (doc.id == docId) {
                    val updatedRows = doc.rows.map { row ->
                        if (row.rowNumber == rowNum) {
                            when (columnKey) {
                                "treeNumber" -> row.copy(treeNumber = row.treeNumber.copy(comments = row.treeNumber.comments + comment))
                                "speciesCode" -> row.copy(speciesCode = row.speciesCode.copy(comments = row.speciesCode.comments + comment))
                                "dbhCm" -> row.copy(dbhCm = row.dbhCm.copy(comments = row.dbhCm.comments + comment))
                                "heightM" -> row.copy(heightM = row.heightM.copy(comments = row.heightM.comments + comment))
                                "healthStatus" -> row.copy(healthStatus = row.healthStatus.copy(comments = row.healthStatus.comments + comment))
                                "notes" -> row.copy(notes = row.notes.copy(comments = row.notes.comments + comment))
                                else -> row
                            }
                        } else row
                    }
                    doc.copy(rows = updatedRows)
                } else doc
            }
        }
    }

    fun toggleResolveComment(docId: String, rowNum: Int, columnKey: String, commentId: String) {
        _documents.update { docs ->
            docs.map { doc ->
                if (doc.id == docId) {
                    val updatedRows = doc.rows.map { row ->
                        if (row.rowNumber == rowNum) {
                            fun toggleList(list: List<ReviewerComment>) = list.map {
                                if (it.id == commentId) it.copy(isResolved = !it.isResolved) else it
                            }
                            when (columnKey) {
                                "treeNumber" -> row.copy(treeNumber = row.treeNumber.copy(comments = toggleList(row.treeNumber.comments)))
                                "speciesCode" -> row.copy(speciesCode = row.speciesCode.copy(comments = toggleList(row.speciesCode.comments)))
                                "dbhCm" -> row.copy(dbhCm = row.dbhCm.copy(comments = toggleList(row.dbhCm.comments)))
                                "heightM" -> row.copy(heightM = row.heightM.copy(comments = toggleList(row.heightM.comments)))
                                "healthStatus" -> row.copy(healthStatus = row.healthStatus.copy(comments = toggleList(row.healthStatus.comments)))
                                "notes" -> row.copy(notes = row.notes.copy(comments = toggleList(row.notes.comments)))
                                else -> row
                            }
                        } else row
                    }
                    doc.copy(rows = updatedRows)
                } else doc
            }
        }
    }

    fun markDocumentVerified(docId: String, verified: Boolean) {
        _documents.update { docs ->
            docs.map { if (it.id == docId) it.copy(isVerified = verified) else it }
        }
    }

    fun exportToCsv(doc: ScannedDocument): String {
        val sb = StringBuilder()
        sb.append("KEFRI Forest Inventory Export\n")
        sb.append("Plot Code: ${doc.plotCode}, Location: ${doc.forestStation}, Observer: ${doc.observerName}\n")
        sb.append("Document ID: ${doc.id}, Status: ${if (doc.isVerified) "Verified" else "Pending Review"}\n\n")
        sb.append("Tree Number,Species Code,DBH (cm),Height (m),Health,Notes,Confidence_DBH,Confidence_Height,Reviewer_Comments\n")

        for (row in doc.rows) {
            val allComments = (row.dbhCm.comments + row.heightM.comments + row.speciesCode.comments)
                .joinToString("; ") { "${it.author}: ${it.text}" }
                .replace("\"", "\"\"")

            sb.append("\"${row.treeNumber.value}\",")
            sb.append("\"${row.speciesCode.value}\",")
            sb.append("\"${row.dbhCm.value}\",")
            sb.append("\"${row.heightM.value}\",")
            sb.append("\"${row.healthStatus.value}\",")
            sb.append("\"${row.notes.value}\",")
            sb.append("${String.format("%.2f", row.dbhCm.confidence.confidence)},")
            sb.append("${String.format("%.2f", row.heightM.confidence.confidence)},")
            sb.append("\"$allComments\"\n")
        }
        return sb.toString()
    }

    private fun createAberdareDocument(): ScannedDocument {
        val rows = listOf(
            makeRow(1, "01", "JUN_P", "45.3", "28.5", "Good", "", 0.98f, 0.95f),
            makeRow(2, "02", "JUN_P", "38.0", "26.0", "Good", "", 0.94f, 0.92f),
            makeRow(3, "03", "GRA_R", "62.1", "31.5", "Fine", "", 0.96f, 0.91f),
            makeRow(4, "04", "POD_G", "22.8", "19.0", "Fair", "", 0.92f, 0.74f,
                heightUncertain = true,
                commentsHeight = listOf(ReviewerComment("c1", "Field Officer", "Handwritten '19' faint due to moisture", System.currentTimeMillis() - 86400000))
            ),
            makeRow(5, "05", "OLE_A", "54.7", "24.2", "Poor", "", 0.91f, 0.93f),
            makeRow(6, "06", "JUN_P", "49.6", "29.8", "Good", "", 0.97f, 0.95f),
            makeRow(7, "07", "GRA_R", "35.4", "25.5", "Fair", "Dead branches", 0.69f, 0.88f,
                dbhUncertain = true,
                commentsDbh = listOf(ReviewerComment("c2", "M. Musyoka", "Digits 3 and 5 overlap; confirmed 35.4cm on re-check", System.currentTimeMillis() - 3600000))
            ),
            makeRow(8, "08", "POD_G", "29.1", "21.3", "Good", "", 0.95f, 0.92f),
            makeRow(9, "09", "OLE_A", "41.5", "23.0", "Good", "", 0.93f, 0.89f),
            makeRow(10, "10", "JUN_P", "51.2", "30.1", "Fine", "", 0.96f, 0.94f)
        )

        return ScannedDocument(
            id = "DOC-ABER-2023-01",
            title = "Aberdare Forest Form (Plot KFR/A2)",
            plotCode = "KFR/A2",
            forestStation = "Aberdare Forest Reserve",
            observerName = "M. Musyoka",
            scanDateMillis = System.currentTimeMillis() - 7200000,
            imageResName = "sample_field_form",
            fileSizeBytes = 2415104L,
            fileType = "JPEG Form Scan",
            syncStatus = SyncStatus.SYNCED,
            rows = rows,
            isVerified = false
        )
    }

    private fun createMugugaDocument(): ScannedDocument {
        val rows = listOf(
            makeRow(1, "11", "EUC_S", "58.2", "34.1", "Good", "", 0.96f, 0.94f),
            makeRow(2, "12", "EUC_S", "61.0", "36.5", "Good", "", 0.93f, 0.91f),
            makeRow(3, "13", "PIN_P", "44.3", "27.8", "Fine", "", 0.95f, 0.92f),
            makeRow(4, "14", "PIN_P", "48.9", "29.4", "Good", "", 0.97f, 0.96f),
            makeRow(5, "15", "CUP_L", "39.5", "23.1", "Poor", "Stem crook", 0.73f, 0.89f,
                dbhUncertain = true,
                commentsDbh = listOf(ReviewerComment("c3", "Tech Lead", "Caliper mark smudged on paper margin", System.currentTimeMillis() - 4800000))
            )
        )
        return ScannedDocument(
            id = "DOC-MUG-2023-04",
            title = "Muguga Station Plot MUG/04",
            plotCode = "MUG/04",
            forestStation = "Muguga Research Center",
            observerName = "J. Kariuki",
            scanDateMillis = System.currentTimeMillis() - 86400000,
            imageResName = "sample_field_form",
            fileSizeBytes = 1845100L,
            fileType = "JPEG Form Scan",
            syncStatus = SyncStatus.SYNCED,
            rows = rows,
            isVerified = true
        )
    }

    private fun createKakamegaDocument(): ScannedDocument {
        val rows = listOf(
            makeRow(1, "01", "CRO_M", "72.4", "38.2", "Good", "Canopy dominant", 0.98f, 0.97f),
            makeRow(2, "02", "PRA_A", "55.1", "31.0", "Fair", "", 0.94f, 0.91f),
            makeRow(3, "03", "ANT_T", "33.8", "22.4", "Fine", "", 0.71f, 0.95f, dbhUncertain = true),
            makeRow(4, "04", "CRO_M", "68.9", "35.6", "Good", "", 0.95f, 0.93f)
        )
        return ScannedDocument(
            id = "DOC-KAK-2023-09",
            title = "Kakamega Rain Forest Transect 3",
            plotCode = "KAK/TR-03",
            forestStation = "Kakamega Forest Station",
            observerName = "E. Otieno",
            scanDateMillis = System.currentTimeMillis() - 172800000,
            imageResName = "sample_field_form",
            fileSizeBytes = 2109400L,
            fileType = "JPEG Form Scan",
            syncStatus = SyncStatus.SAVED_OFFLINE,
            rows = rows,
            isVerified = false
        )
    }

    private fun createSyntheticDocument(
        plotCode: String,
        station: String,
        observer: String,
        pageCount: Int,
        isOffline: Boolean
    ): ScannedDocument {
        val speciesList = listOf("JUN_P", "POD_G", "OLE_A", "GRA_R", "EUC_S", "PIN_P", "CUP_L")
        val rows = (1..(8 * pageCount)).map { i ->
            val species = speciesList[(i - 1) % speciesList.size]
            val dbh = String.format("%.1f", 20.0 + (i * 3.7) % 55.0)
            val height = String.format("%.1f", 15.0 + (i * 2.3) % 25.0)
            val dbhConf = if (i % 4 == 0) 0.72f else 0.95f
            val heightConf = if (i % 6 == 0) 0.68f else 0.94f

            makeRow(
                rowNum = i,
                treeNum = String.format("%02d", i),
                species = species,
                dbh = dbh,
                height = height,
                health = if (i % 5 == 0) "Fair" else "Good",
                notes = if (i % 7 == 0) "Branch break" else "",
                dbhConf = dbhConf,
                heightConf = heightConf,
                dbhUncertain = dbhConf < 0.85f,
                heightUncertain = heightConf < 0.85f
            )
        }

        return ScannedDocument(
            id = "DOC-KFS-${System.currentTimeMillis()}",
            title = "$station (Plot $plotCode)",
            plotCode = plotCode,
            forestStation = station,
            observerName = observer,
            scanDateMillis = System.currentTimeMillis(),
            imageResName = "sample_field_form",
            fileSizeBytes = 1920000L * pageCount,
            fileType = if (pageCount > 1) "Multi-Page Batch ($pageCount pages)" else "JPEG Form Scan",
            syncStatus = if (isOffline) SyncStatus.SAVED_OFFLINE else SyncStatus.SYNCED,
            rows = rows,
            isVerified = false
        )
    }

    private fun makeRow(
        rowNum: Int,
        treeNum: String,
        species: String,
        dbh: String,
        height: String,
        health: String,
        notes: String,
        dbhConf: Float,
        heightConf: Float,
        dbhUncertain: Boolean = false,
        heightUncertain: Boolean = false,
        commentsDbh: List<ReviewerComment> = emptyList(),
        commentsHeight: List<ReviewerComment> = emptyList()
    ): InventoryRow {
        return InventoryRow(
            rowNumber = rowNum,
            treeNumber = CellData(
                value = treeNum,
                confidence = CellConfidence(0.98f, false, treeNum)
            ),
            speciesCode = CellData(
                value = species,
                confidence = CellConfidence(0.97f, false, species)
            ),
            dbhCm = CellData(
                value = dbh,
                confidence = CellConfidence(dbhConf, dbhUncertain, dbh),
                comments = commentsDbh
            ),
            heightM = CellData(
                value = height,
                confidence = CellConfidence(heightConf, heightUncertain, height),
                comments = commentsHeight
            ),
            healthStatus = CellData(
                value = health,
                confidence = CellConfidence(0.96f, false, health)
            ),
            notes = CellData(
                value = notes,
                confidence = CellConfidence(0.95f, false, notes)
            )
        )
    }
}
