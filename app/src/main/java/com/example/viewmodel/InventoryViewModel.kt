package com.example.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.InventoryRepository
import com.example.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class SelectedCellTarget(
    val rowNumber: Int,
    val colIndex: Int,
    val colKey: String,
    val cellData: MatrixCell
)

class InventoryViewModel(
    val repository: InventoryRepository = InventoryRepository()
) : ViewModel() {

    val documents = repository.documents
    val activeDocumentId = repository.activeDocumentId
    val batchQueue = repository.batchQueue
    val isOffline = repository.isOffline
    val isSyncing = repository.isSyncing

    private val _currentTab = MutableStateFlow(0) // 0: Scan, 1: Review, 2: Archive, 3: Settings
    val currentTab: StateFlow<Int> = _currentTab.asStateFlow()

    private val _scanMode = MutableStateFlow(ScanMode.FORM_MODE)
    val scanMode: StateFlow<ScanMode> = _scanMode.asStateFlow()

    private val _selectedCell = MutableStateFlow<SelectedCellTarget?>(null)
    val selectedCell: StateFlow<SelectedCellTarget?> = _selectedCell.asStateFlow()

    private val _auditReportDoc = MutableStateFlow<ScannedDocument?>(null)
    val auditReportDoc: StateFlow<ScannedDocument?> = _auditReportDoc.asStateFlow()

    private val _exportModalText = MutableStateFlow<String?>(null)
    val exportModalText: StateFlow<String?> = _exportModalText.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _historyFilter = MutableStateFlow("ALL")
    val historyFilter: StateFlow<String> = _historyFilter.asStateFlow()

    fun selectTab(index: Int) {
        _currentTab.value = index
    }

    fun setScanMode(mode: ScanMode) {
        _scanMode.value = mode
    }

    fun selectCell(rowNumber: Int, colIndex: Int, colKey: String, cellData: MatrixCell) {
        _selectedCell.value = SelectedCellTarget(rowNumber, colIndex, colKey, cellData)
    }

    fun clearSelectedCell() {
        _selectedCell.value = null
    }

    fun dismissAuditReport() {
        _auditReportDoc.value = null
    }

    fun proceedFromAuditToReview() {
        _auditReportDoc.value = null
        _currentTab.value = 1 // Switch to Review
    }

    fun openDocumentForReview(docId: String) {
        repository.setActiveDocument(docId)
        _currentTab.value = 1 // Switch to Review Screen
    }

    fun updateCellValue(newDbh: String, newHeight: String? = null) {
        val target = _selectedCell.value ?: return
        val docId = repository.activeDocumentId.value ?: return
        repository.updateCellValue(docId, target.rowNumber, target.colIndex, newDbh, newHeight)

        val updatedCell = target.cellData.copy(
            dbhValue = newDbh,
            value = newDbh,
            heightValue = newHeight ?: target.cellData.heightValue,
            dbhConfidence = 1.0f,
            heightConfidence = 1.0f,
            isUncertain = false,
            isVerified = true,
            visibilityIssue = null
        )
        _selectedCell.value = target.copy(cellData = updatedCell)
    }

    fun addComment(author: String, text: String) {
        val target = _selectedCell.value ?: return
        val docId = repository.activeDocumentId.value ?: return
        repository.addComment(docId, target.rowNumber, target.colIndex, author, text)
        refreshSelectedCell(docId, target.rowNumber, target.colIndex)
    }

    private fun refreshSelectedCell(docId: String, rowNum: Int, colIndex: Int) {
        val doc = repository.getActiveDocument() ?: return
        val row = doc.rows.find { it.rowNumber == rowNum } ?: return
        val cell = row.cells.find { it.colIndex == colIndex } ?: return
        val curr = _selectedCell.value ?: return
        _selectedCell.value = curr.copy(cellData = cell)
    }

    fun toggleDocumentVerified(docId: String, current: Boolean) {
        repository.markDocumentVerified(docId, !current)
    }

    fun deleteDocument(docId: String) {
        repository.deleteDocument(docId)
    }

    fun toggleOffline() {
        repository.toggleOfflineMode()
    }

    fun syncAll() {
        viewModelScope.launch {
            repository.syncAllOfflineDocuments()
        }
    }

    fun captureSinglePage(plot: String, station: String, observer: String) {
        val doc = repository.createDocumentFromCapture(plot, station, observer)
        _auditReportDoc.value = doc // Show professional audit specifications report
    }

    fun loadSampleAgw85() {
        val doc = repository.createDocumentFromCapture("Kiamuriuki (1k)", "Chuka Forest Station", "Faith")
        _auditReportDoc.value = doc
    }

    fun prepareCsvExport(doc: ScannedDocument) {
        val csv = repository.exportToCsv(doc)
        _exportModalText.value = csv
    }

    fun prepareNotepadExport(doc: ScannedDocument): String {
        return repository.exportToNotepad(doc)
    }

    fun prepareWordExport(doc: ScannedDocument): String {
        return repository.exportToWordHtml(doc)
    }

    fun clearExportModal() {
        _exportModalText.value = null
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun setHistoryFilter(filter: String) {
        _historyFilter.value = filter
    }
}
