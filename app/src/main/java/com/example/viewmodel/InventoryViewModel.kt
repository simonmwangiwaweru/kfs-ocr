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
    val columnKey: String,
    val columnName: String,
    val cellData: CellData
)

class InventoryViewModel(
    val repository: InventoryRepository = InventoryRepository()
) : ViewModel() {

    val documents = repository.documents
    val activeDocumentId = repository.activeDocumentId
    val batchQueue = repository.batchQueue
    val isOffline = repository.isOffline
    val isSyncing = repository.isSyncing

    private val _currentTab = MutableStateFlow(0) // 0: Scan, 1: Review, 2: History, 3: About
    val currentTab: StateFlow<Int> = _currentTab.asStateFlow()

    private val _scanMode = MutableStateFlow(ScanMode.SINGLE_PAGE)
    val scanMode: StateFlow<ScanMode> = _scanMode.asStateFlow()

    private val _selectedCell = MutableStateFlow<SelectedCellTarget?>(null)
    val selectedCell: StateFlow<SelectedCellTarget?> = _selectedCell.asStateFlow()

    private val _exportModalText = MutableStateFlow<String?>(null)
    val exportModalText: StateFlow<String?> = _exportModalText.asStateFlow()

    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _historyFilter = MutableStateFlow("ALL") // ALL, PENDING_REVIEW, SYNCED, OFFLINE
    val historyFilter: StateFlow<String> = _historyFilter.asStateFlow()

    fun selectTab(index: Int) {
        _currentTab.value = index
    }

    fun setScanMode(mode: ScanMode) {
        _scanMode.value = mode
    }

    fun selectCell(rowNumber: Int, columnKey: String, columnName: String, cellData: CellData) {
        _selectedCell.value = SelectedCellTarget(rowNumber, columnKey, columnName, cellData)
    }

    fun clearSelectedCell() {
        _selectedCell.value = null
    }

    fun openDocumentForReview(docId: String) {
        repository.setActiveDocument(docId)
        _currentTab.value = 1 // Switch to Review Screen
    }

    fun updateCellValue(newValue: String) {
        val target = _selectedCell.value ?: return
        val docId = repository.activeDocumentId.value ?: return
        repository.updateCellValue(docId, target.rowNumber, target.columnKey, newValue)

        // Update selected cell view
        val updatedCell = target.cellData.copy(
            value = newValue,
            isManuallyEdited = true,
            confidence = target.cellData.confidence.copy(isUncertain = false)
        )
        _selectedCell.value = target.copy(cellData = updatedCell)
    }

    fun addComment(author: String, text: String) {
        val target = _selectedCell.value ?: return
        val docId = repository.activeDocumentId.value ?: return
        repository.addComment(docId, target.rowNumber, target.columnKey, author, text)
        // Refresh target cell from updated document
        refreshSelectedCell(docId, target.rowNumber, target.columnKey)
    }

    fun toggleResolveComment(commentId: String) {
        val target = _selectedCell.value ?: return
        val docId = repository.activeDocumentId.value ?: return
        repository.toggleResolveComment(docId, target.rowNumber, target.columnKey, commentId)
        refreshSelectedCell(docId, target.rowNumber, target.columnKey)
    }

    private fun refreshSelectedCell(docId: String, rowNum: Int, colKey: String) {
        val doc = repository.getActiveDocument() ?: return
        val row = doc.rows.find { it.rowNumber == rowNum } ?: return
        val cell = when (colKey) {
            "treeNumber" -> row.treeNumber
            "speciesCode" -> row.speciesCode
            "dbhCm" -> row.dbhCm
            "heightM" -> row.heightM
            "healthStatus" -> row.healthStatus
            "notes" -> row.notes
            else -> null
        }
        if (cell != null) {
            val curr = _selectedCell.value ?: return
            _selectedCell.value = curr.copy(cellData = cell)
        }
    }

    fun toggleDocumentVerified(docId: String, current: Boolean) {
        repository.markDocumentVerified(docId, !current)
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
        _currentTab.value = 1 // Open directly in Review mode
    }

    fun addPageToBatch(imageUri: String?) {
        repository.addToBatch(imageUri)
    }

    fun processBatch(plot: String, station: String, observer: String) {
        val doc = repository.processBatch(plot, station, observer)
        _currentTab.value = 1 // Open in Review mode
    }

    fun clearBatch() {
        repository.clearBatch()
    }

    fun prepareCsvExport(doc: ScannedDocument) {
        val csv = repository.exportToCsv(doc)
        _exportModalText.value = csv
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
