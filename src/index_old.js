
window.loadTable = (skillData, contactData, scoreData, user) => {

// Store data globally for use in other functions
window.skillData = skillData;
window.contactData = contactData;
window.scoreData = scoreData;
window.currentUser = user || "Current User";

console.log('loadTable called with user:', user);
console.log('window.currentUser set to:', window.currentUser);

// Initialize with all levels selected
window.selectedLevels = ['BEGINNING', 'DEVELOPING', 'PROFICIENT', 'ADVANCED'];

const tabledata = createTabulatorData(JSON.parse(skillData), JSON.parse(contactData), JSON.parse(scoreData))

// Create the table and store it globally
window.table = new Tabulator("#example-table", {
  data:tabledata.data, //assign data to table
 // autoColumns:true, //create columns from data field names
  layout:"fitColumns",
  groupBy:"Area",
  height:"500",
  columns:tabledata.columns,
  groupHeader: function(value, count){
    return value + " (" + count + " skills)";
  },
  // Temporarily remove groupFooter to test
  groupToggleElement: "header",
  groupStartOpen: true,
  renderComplete: function(){
    // Only call after render is complete - this should be sufficient
    setTimeout(() => {
      addManualGroupFooters();
    }, 500);
  },
  columnResized: function(){
    // Only recreate footers if column widths change
    setTimeout(() => {
      addManualGroupFooters();
    }, 300);
  },
  // Add more event listeners to catch when Tabulator manipulates the DOM
  rowsLoaded: function(){
    setTimeout(() => {
      addManualGroupFooters();
    }, 200);
  },
  scrollVertical: function(top){
    // Tabulator's built-in scroll event - more reliable than DOM scroll events
    setTimeout(() => {
      addManualGroupFooters();
    }, 100);
  },
  layoutColumnsOnNewData: true
});

// Level filtering functionality
window.applyLevelFilter = function() {
  const checkboxes = document.querySelectorAll('#level-filter-container input[type="checkbox"]');
  window.selectedLevels = Array.from(checkboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);
  
  console.log('Selected levels:', window.selectedLevels);
  
  // Preserve current table data state before filtering
  if (window.table && window.skillData && window.contactData && window.scoreData) {
    // Get current table data to preserve any user inputs
    const currentTableData = window.table.getData();
    
    // Create fresh table data with filtered levels
    const tabledata = createTabulatorData(
      JSON.parse(window.skillData), 
      JSON.parse(window.contactData), 
      JSON.parse(window.scoreData)
    );
    
    // Merge current user inputs back into the filtered data
    const mergedData = tabledata.data.map(newRow => {
      // Find corresponding row in current data
      const currentRow = currentTableData.find(row => row.id === newRow.id);
      if (currentRow) {
        // Preserve user-entered values for score and pass fields
        const contacts = JSON.parse(window.contactData);
        contacts.forEach(contact => {
          const contactId = contact.fieldData.contact_id;
          // Preserve score values if they exist in current data
          if (currentRow[contactId] !== undefined) {
            newRow[contactId] = currentRow[contactId];
          }
          // Preserve pass values if they exist in current data
          if (currentRow[contactId + "_pass"] !== undefined) {
            newRow[contactId + "_pass"] = currentRow[contactId + "_pass"];
          }
          // Preserve metadata if it exists in current data
          if (currentRow[contactId + "_metadata"] !== undefined) {
            newRow[contactId + "_metadata"] = currentRow[contactId + "_metadata"];
          }
        });
      }
      return newRow;
    });
    
    window.table.setData(mergedData);
  }
};

// Helper function to get level color
window.getLevelColor = function(level) {
  const levelColors = {
    'BEGINNING': '#e8f5e8',     // Light green
    'DEVELOPING': '#fff3cd',    // Light yellow  
    'PROFICIENT': '#cce5ff',    // Light blue
    'ADVANCED': '#f8d7da'       // Light red
  };
  return levelColors[level] || '#ffffff';
};

// Helper function to get level text color
window.getLevelTextColor = function(level) {
  const levelTextColors = {
    'BEGINNING': '#2d5a2d',     // Dark green
    'DEVELOPING': '#856404',    // Dark yellow/orange
    'PROFICIENT': '#004085',    // Dark blue
    'ADVANCED': '#721c24'       // Dark red
  };
  return levelTextColors[level] || '#000000';
};

// Single backup method - add footers after a reasonable delay
setTimeout(() => {
  addManualGroupFooters();
}, 1500);

// Add a periodic check as a fallback mechanism
setInterval(() => {
  // Only check if we have the required data and the table exists
  if (window.skillData && window.contactData && window.scoreData) {
    const groupElements = document.querySelectorAll('#example-table .tabulator-group');
    const existingFooters = document.querySelectorAll('.manual-group-footer');
    
    // If we have groups but missing footers, re-add them
    if (groupElements.length > 0 && existingFooters.length < groupElements.length) {
      console.log('Periodic check detected missing footers, re-adding...');
      addManualGroupFooters();
    }
  }
}, 3000); // Check every 3 seconds

// Add window resize listener to handle webviewer resizing (debounced)
let resizeTimeout = null;
window.addEventListener('resize', function() {
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }
  resizeTimeout = setTimeout(() => {
    resizeTimeout = null;
    addManualGroupFooters();
  }, 500);
});

// Add scroll listener to handle footer visibility issues during scrolling
let scrollTimeout = null;
function checkAndRestoreFooters() {
  // Check if footers are missing and re-add them
  const groupElements = document.querySelectorAll('#example-table .tabulator-group');
  const existingFooters = document.querySelectorAll('.manual-group-footer');
  if (groupElements.length > 0 && existingFooters.length < groupElements.length) {
    console.log('Scroll detected missing footers, re-adding...');
    addManualGroupFooters();
  }
}

window.addEventListener('scroll', function() {
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
  scrollTimeout = setTimeout(() => {
    scrollTimeout = null;
    checkAndRestoreFooters();
  }, 150); // Faster response for scroll events
}, { passive: true });

// Also add scroll listener to the table container itself
setTimeout(() => {
  const tableContainer = document.querySelector('#example-table');
  if (tableContainer) {
    tableContainer.addEventListener('scroll', function() {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
      scrollTimeout = setTimeout(() => {
        scrollTimeout = null;
        checkAndRestoreFooters();
      }, 150);
    }, { passive: true });
    
    // Also listen for wheel events on the table for more immediate detection
    tableContainer.addEventListener('wheel', function() {
      setTimeout(() => {
        checkAndRestoreFooters();
      }, 50);
    }, { passive: true });
  }
}, 1000);

// Also listen for any mutations to the table that might remove our footers
const tableObserver = new MutationObserver(function(mutations) {
  let shouldReaddFooters = false;
  mutations.forEach(function(mutation) {
    // Check if any of our manual footers were removed by something OTHER than our own function
    mutation.removedNodes.forEach(function(node) {
      if (node.classList && node.classList.contains('manual-group-footer')) {
        // Only trigger if we don't currently have a pending timeout (to avoid infinite loops)
        if (!addFootersTimeout) {
          console.log('MutationObserver detected footer removal');
          shouldReaddFooters = true;
        }
      }
    });
    
    // Also check if new group elements were added (indicating a re-render)
    mutation.addedNodes.forEach(function(node) {
      if (node.classList && node.classList.contains('tabulator-group')) {
        console.log('MutationObserver detected new group element');
        shouldReaddFooters = true;
      }
    });
  });
  
  if (shouldReaddFooters) {
    // Use debouncing to prevent rapid fire calls
    addFootersTimeout = setTimeout(() => {
      addFootersTimeout = null;
      addManualGroupFooters();
    }, 300); // Reduced delay for faster response
  }
});

// Start observing the table element once it's created
setTimeout(() => {
  const tableElement = document.querySelector('#example-table');
  if (tableElement) {
    tableObserver.observe(tableElement, {
      childList: true,
      subtree: true
    });
  }
}, 1000);

// Register event handlers for the table
// Note: Using modal-based editing, so no cellEdited handler needed

// Global variables for modal state
window.currentGroupName = '';
window.currentContactName = '';
window.currentContactId = '';
window.currentMode = '';

// Global variables for score modal state
window.currentSkillName = '';
window.currentSkillId = '';
window.currentScoreContactId = '';
window.currentScoreContactName = '';
// Helper function to format date for display
function formatDate(dateString) {
  if (!dateString) return "";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid
    
    // Format as MM/DD/YYYY
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${month}/${day}/${year}`;
  } catch (e) {
    return dateString; // Return original if parsing fails
  }
}

// Function to set the current user (can be called from FileMaker)
window.setCurrentUser = function(userName) {
  window.currentUser = userName;
  console.log('Current user set to:', userName);
};

// Score Modal functions
window.openScoreModal = function(skillName, contactName, skillId, contactId, currentScore, passValue, metadata) {
  console.log('openScoreModal called with:', { skillName, contactName, skillId, contactId, currentScore, passValue, metadata });
  
  window.currentSkillName = skillName;
  window.currentSkillId = skillId;
  window.currentScoreContactId = contactId;
  window.currentScoreContactName = contactName;
  
  const modal = document.getElementById('scoreModal');
  const modalTitle = document.getElementById('scoreModalTitle');
  const scoreSelect = document.getElementById('scoreSelect');
  const passCheckbox = document.getElementById('passCheckbox');
  const scoreDate = document.getElementById('scoreDate');
  const scoreUser = document.getElementById('scoreUser');
  
  if (!modal) {
    console.error('Score modal element not found!');
    return;
  }
  
  // Get the skill level for color coding
  let skillLevel = 'BEGINNING'; // default
  if (window.table) {
    const row = window.table.getRow(skillId);
    if (row) {
      skillLevel = row.getData().level;
    }
  }
  
  // Get colors for this skill level
  const backgroundColor = getLevelColor(skillLevel);
  const textColor = getLevelTextColor(skillLevel);
  
  // Set modal title with level indicator
  modalTitle.innerHTML = `
    <div style="display: flex; align-items: flex-start; justify-content: space-between; width: 100%;">
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <div style="font-size: 18px; font-weight: 600; line-height: 1.2;">${skillName}</div>
        <div style="font-size: 14px; opacity: 0.9; font-weight: 400;">${contactName}</div>
      </div>
      <span style="background: ${textColor}; color: ${backgroundColor}; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; letter-spacing: 0.5px; flex-shrink: 0;">${skillLevel}</span>
    </div>
  `;
  
  // Apply level-based color to modal header
  const modalHeader = modal.querySelector('.modal-header');
  modalHeader.style.background = backgroundColor;
  modalHeader.style.color = textColor;
  modalHeader.style.borderBottom = `3px solid ${textColor}`;
  
  // Set current values
  scoreSelect.value = currentScore || "-";
  passCheckbox.checked = passValue === true || passValue === "true" || passValue === 1;
  
  // Set current date as default
  const today = new Date();
  scoreDate.value = today.toISOString().split('T')[0];
  
  // Set current user from the loadTable parameter
  scoreUser.value = window.currentUser || "Current User";
  
  // If there's existing metadata, use that date
  if (metadata && metadata.editableDate) {
    try {
      const existingDate = new Date(metadata.editableDate);
      if (!isNaN(existingDate.getTime())) {
        scoreDate.value = existingDate.toISOString().split('T')[0];
      }
    } catch (e) {
      // Keep today's date if parsing fails
    }
  }
  
  modal.style.display = 'block';
  
  // Focus on the score select for better UX
  setTimeout(() => {
    scoreSelect.focus();
  }, 100);
  
  // Add keyboard event listener for Escape key and Enter key navigation
  const handleKeydown = function(e) {
    if (e.key === 'Escape') {
      closeScoreModal();
      document.removeEventListener('keydown', handleKeydown);
    } else if (e.key === 'Enter' && (e.target === scoreSelect || e.target === scoreDate)) {
      // Allow Enter to navigate between fields and save
      if (e.target === scoreSelect) {
        passCheckbox.focus();
      } else if (e.target === scoreDate) {
        document.querySelector('#scoreModal .save-btn').click();
      }
    }
  };
  document.addEventListener('keydown', handleKeydown);
  
  // Store the event handler so we can remove it later
  modal.keydownHandler = handleKeydown;
  
  console.log('Score modal should now be visible');
};

window.closeScoreModal = function() {
  console.log('closeScoreModal called');
  const modal = document.getElementById('scoreModal');
  if (modal) {
    modal.style.display = 'none';
    
    // Clean up event listener
    if (modal.keydownHandler) {
      document.removeEventListener('keydown', modal.keydownHandler);
      modal.keydownHandler = null;
    }
    
    console.log('Score modal closed');
  } else {
    console.error('Score modal element not found when trying to close!');
  }
};

window.saveScore = function() {
  console.log('saveScore called');
  
  const scoreSelect = document.getElementById('scoreSelect');
  const passCheckbox = document.getElementById('passCheckbox');
  const scoreDate = document.getElementById('scoreDate');
  const scoreUser = document.getElementById('scoreUser');
  
  const scoreValue = scoreSelect.value;
  const passValue = passCheckbox.checked;
  const dateValue = scoreDate.value;
  const userValue = scoreUser.value;
  
  // Validate inputs
  if (!dateValue) {
    alert('Please select a date.');
    scoreDate.focus();
    return;
  }
  
  if (!userValue.trim()) {
    alert('Please enter a user name.');
    scoreUser.focus();
    return;
  }
  
  // Convert date to display format
  let displayDate = dateValue;
  if (dateValue) {
    try {
      const date = new Date(dateValue);
      displayDate = date.toLocaleDateString('en-US', {
        month: '2-digit',
        day: '2-digit', 
        year: 'numeric'
      });
    } catch (e) {
      displayDate = dateValue;
    }
  }
  
  // Update the table data
  if (window.table) {
    const row = window.table.getRow(window.currentSkillId);
    if (row) {
      const rowData = row.getData();
      
      // Update score and pass values - ensure pass is stored as boolean
      rowData[window.currentScoreContactId] = scoreValue || "-";
      rowData[window.currentScoreContactId + "_pass"] = passValue === true;
      
      // Update metadata (save metadata even if no score, to track pass status changes)
      rowData[window.currentScoreContactId + "_metadata"] = {
        lastUpdated: displayDate,
        author: userValue,
        originalTimestamp: new Date().toISOString(),
        editableDate: displayDate
      };
      
      // Update the row
      row.update(rowData);
      
      // Force redraw of the specific cell to ensure pass icon updates
      const cell = row.getCell(window.currentScoreContactId);
      if (cell) {
        // Force the cell to re-render by temporarily changing and restoring the value
        const currentValue = cell.getValue();
        cell.setValue(currentValue === "" ? " " : "");
        cell.setValue(currentValue);
      }
      
      console.log('Table updated successfully');
      console.log('Pass value set to:', passValue, 'Type:', typeof passValue);
      console.log('Row data after update:', rowData);
    }
  }
  
  // Send single update to FileMaker with both score and pass data
  const updateResult = {
    "conId": window.currentScoreContactId,
    "skillId": window.currentSkillId,
    "value": scoreValue,
    "pass": passValue,
    "mode": 'updateScore',
    "user": userValue,
    "date": displayDate,
    "timestamp": new Date().toISOString()
  };
  
  console.log('Saving score and pass:', updateResult);
  
  // Show saving indicator
  const saveBtn = document.querySelector('#scoreModal .save-btn');
  const originalText = saveBtn.textContent;
  saveBtn.textContent = 'Saving...';
  saveBtn.disabled = true;
  saveBtn.style.opacity = '0.7';
  
  // Send single update
  if (typeof runScript === 'function') {
    runScript(JSON.stringify(updateResult));
    console.log('Data sent to FileMaker successfully');
    
    // Show success briefly before closing
    saveBtn.textContent = 'Saved ✓';
    saveBtn.style.background = '#28a745';
    setTimeout(() => {
      closeScoreModal();
      // Reset button state for next time
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
      saveBtn.style.opacity = '1';
      saveBtn.style.background = '';
    }, 500);
  } else {
    console.error('FileMaker runScript function not available');
    alert('Score saved locally (FileMaker integration not available)');
    
    // Reset button state
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
    saveBtn.style.opacity = '1';
    
    closeScoreModal();
  }
};

// Modal functions
window.openNotesModal = function(groupName, contactName, contactId, mode) {
  console.log('openNotesModal called with:', { groupName, contactName, contactId, mode });
  
  window.currentGroupName = groupName;
  window.currentContactName = contactName;
  window.currentContactId = contactId;
  window.currentMode = mode;
  
  const modal = document.getElementById('notesModal');
  const modalTitle = document.getElementById('modalTitle');
  const noteTextarea = document.getElementById('noteTextarea');
  const noteDisplay = document.getElementById('noteDisplay');
  const saveBtn = document.getElementById('saveNoteBtn');
  
  console.log('Modal elements found:', { 
    modal: !!modal, 
    modalTitle: !!modalTitle, 
    noteTextarea: !!noteTextarea,
    noteDisplay: !!noteDisplay,
    saveBtn: !!saveBtn 
  });
  
  if (!modal) {
    console.error('Modal element not found!');
    return;
  }
  
  // Ensure the close button works
  const closeBtn = modal.querySelector('.close');
  if (closeBtn) {
    closeBtn.onclick = function() {
      console.log('Close button clicked');
      closeNotesModal();
    };
  }
  
  if (mode === 'add') {
    modalTitle.textContent = `Add Note - ${groupName} / ${contactName}`;
    noteTextarea.value = '';
    noteTextarea.style.display = 'block';
    noteDisplay.style.display = 'none';
    saveBtn.style.display = 'inline-block';
    saveBtn.textContent = 'Save Note';
  } else {
    modalTitle.textContent = `View Notes - ${groupName} / ${contactName}`;
    noteTextarea.style.display = 'none';
    noteDisplay.style.display = 'block';
    noteDisplay.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Loading notes...</div>';
    saveBtn.style.display = 'none';
    
    // Load existing notes (you'll need to implement this based on your data structure)
    loadExistingNotes(groupName, contactId);
  }
  
  modal.style.display = 'block';
  console.log('Modal should now be visible');
};

window.closeNotesModal = function() {
  console.log('closeNotesModal called');
  const modal = document.getElementById('notesModal');
  if (modal) {
    modal.style.display = 'none';
    console.log('Modal closed');
  } else {
    console.error('Modal element not found when trying to close!');
  }
};

window.saveNote = function() {
  console.log('saveNote called');
  const noteText = document.getElementById('noteTextarea').value;
  
  if (noteText.trim() === '') {
    alert('Please enter a note before saving.');
    return;
  }
  
  const result = {
    "groupName": window.currentGroupName,
    "contactId": window.currentContactId,
    "contactName": window.currentContactName,
    "noteText": noteText,
    "timestamp": new Date().toISOString(),
    "author": window.currentUser || "Unknown User", // Add author field
    "mode": 'saveNote'
  };
  
  console.log('Saving note:', result);
  
  // Check if FileMaker runScript is available
  if (typeof runScript === 'function') {
    runScript(JSON.stringify(result));
  } else if (typeof FileMaker !== 'undefined' && typeof FileMaker.PerformScriptWithOption === 'function') {
    FileMaker.PerformScriptWithOption("Manage: Competencies", JSON.stringify(result), 0);
  } else {
    console.error('FileMaker runScript function not available');
    alert('Note saved locally (FileMaker integration not available)');
  }
  
  closeNotesModal();
};

window.loadExistingNotes = function(groupName, contactId) {
  // This function should load existing notes for the group/contact combination
  // You'll need to implement this based on your FileMaker database structure
  const result = {
    "groupName": groupName,
    "contactId": contactId,
    "mode": 'loadNotes'
  };
  
  console.log('Loading notes for:', result);
  runScript(JSON.stringify(result));
};

// Function to receive notes data from FileMaker
window.displayNotes = function(notesData) {
  const noteDisplay = document.getElementById('noteDisplay');
  try {
    const notes = JSON.parse(notesData);
    if (notes && notes.length > 0) {
      // Sort notes by timestamp if available (newest first)
      notes.sort((a, b) => {
        if (a.timestamp && b.timestamp) {
          return new Date(b.timestamp) - new Date(a.timestamp);
        }
        return 0;
      });
      
      // Create a card-based display
      let notesHTML = '';
      
      // Add a summary header
      notesHTML += `<div style="margin-bottom: 20px; padding: 12px; background: #e3f2fd; border-radius: 8px; border-left: 4px solid #2196f3;">`;
      notesHTML += `<strong>📝 ${notes.length} note${notes.length === 1 ? '' : 's'} found for ${window.currentContactName} in ${window.currentGroupName}</strong>`;
      notesHTML += `</div>`;
      
      // Create cards for each note
      notes.forEach((note, index) => {
        notesHTML += `<div style="margin-bottom: 16px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); border: 1px solid #e0e0e0; overflow: hidden;">`;
        
        // Card header
        notesHTML += `<div style="background: #f5f5f5; padding: 10px 16px; border-bottom: 1px solid #e0e0e0;">`;
        notesHTML += `<div style="display: flex; justify-content: space-between; align-items: center;">`;
        notesHTML += `<span style="font-weight: 600; color: #1976d2;">Note ${index + 1}</span>`;
        
        if (note.timestamp) {
          const date = new Date(note.timestamp);
          const formattedDate = date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          notesHTML += `<span style="font-size: 12px; color: #666;">${formattedDate}</span>`;
        }
        notesHTML += `</div>`;
        
        // Add author if available
        if (note.author) {
          notesHTML += `<div style="margin-top: 4px; font-size: 13px; color: #757575;">`;
          notesHTML += `<span style="display: inline-flex; align-items: center;"><span style="margin-right: 4px;">👤</span> ${note.author}</span>`;
          notesHTML += `</div>`;
        }
        notesHTML += `</div>`;
        
        // Card content
        notesHTML += `<div style="padding: 16px;">`;
        
        // Format the note text with proper line breaks
        const formattedText = note.noteText
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>');
        
        notesHTML += `<div style="line-height: 1.5; color: #333;">${formattedText}</div>`;
        notesHTML += `</div>`;
        
        notesHTML += `</div>`;
      });
      
      noteDisplay.innerHTML = notesHTML;
      
    } else {
      noteDisplay.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
          <div style="font-size: 48px; margin-bottom: 16px;">📝</div>
          <h3 style="margin: 0 0 8px 0; color: #333;">No notes found</h3>
          <p style="margin: 0; color: #666;">No notes found for ${window.currentContactName} in ${window.currentGroupName}.</p>
          <p style="margin: 8px 0 0 0; color: #999; font-size: 14px;">💡 Click "Add Note" to create the first note for this combination.</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error parsing notes data:', error);
    noteDisplay.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #d32f2f;">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <h3 style="margin: 0 0 8px 0; color: #d32f2f;">Error loading notes</h3>
        <p style="margin: 0; color: #666;">Please check the console for details.</p>
      </div>
    `;
  }
};

// Add a debounce mechanism to prevent infinite loops
let addFootersTimeout = null;

// Manual function to add group footers if Tabulator's built-in groupFooter doesn't work
function addManualGroupFooters() {
  try {
    // Clear any pending timeout to debounce rapid calls
    if (addFootersTimeout) {
      clearTimeout(addFootersTimeout);
    }
    
    // Check if we have the required data
    if (!window.skillData || !window.contactData || !window.scoreData) {
      return;
    }
    
    // Find all group elements in the Tabulator table
    const tableElement = document.querySelector('#example-table .tabulator-table');
    if (!tableElement) {
      return;
    }
    
    // Find all group containers
    const groupElements = tableElement.querySelectorAll('.tabulator-group');
    
    if (groupElements.length === 0) {
      return;
    }
    
    // Check if we already have the right number of footers - if so, don't recreate them
    const existingFooters = document.querySelectorAll('.manual-group-footer');
    
    // More robust check: verify each group actually has its footer
    let allGroupsHaveFooters = true;
    groupElements.forEach((groupElement, index) => {
      const nextSibling = groupElement.nextElementSibling;
      let hasFooter = false;
      
      // Look through the following elements to see if we find a footer for this group
      let currentElement = nextSibling;
      while (currentElement && !currentElement.classList.contains('tabulator-group')) {
        if (currentElement.classList.contains('manual-group-footer') && 
            currentElement.getAttribute('data-group') == index) {
          hasFooter = true;
          break;
        }
        currentElement = currentElement.nextElementSibling;
      }
      
      if (!hasFooter) {
        allGroupsHaveFooters = false;
      }
    });
    
    if (existingFooters.length === groupElements.length && allGroupsHaveFooters) {
      // Footers already exist for all groups and are properly positioned, don't recreate them
      console.log('Footers already exist (' + existingFooters.length + ' of ' + groupElements.length + '), skipping recreation');
      return;
    }
    
    // Only remove existing footers if we need to recreate them
    console.log('Creating footers: existing=' + existingFooters.length + ', needed=' + groupElements.length);
    existingFooters.forEach(footer => footer.remove());
    
    // Get the actual column widths from the table header
    // For grouped headers, we need to get the top-level group headers, not the sub-columns
    const skillHeader = document.querySelector('#example-table .tabulator-headers .tabulator-col[tabulator-field="Skill"]');
    const groupHeaders = document.querySelectorAll('#example-table .tabulator-headers .tabulator-col-group');
    
    const skillColumnWidth = skillHeader ? skillHeader.getBoundingClientRect().width : 300;
    const contactWidths = Array.from(groupHeaders).map(header => {
      return header.getBoundingClientRect().width;
    });
    
    // Get unique area names from the table data to match with group elements
    const tabledata = createTabulatorData(JSON.parse(window.skillData), JSON.parse(window.contactData), JSON.parse(window.scoreData));
    const uniqueAreas = [...new Set(tabledata.data.map(row => row.Area))];
    
    groupElements.forEach((groupElement, index) => {
      // Use the area name from our data instead of parsing DOM
      const groupName = uniqueAreas[index] || `Group ${index}`;
      
      // Create footer HTML with columns matching the table structure
      const contacts = JSON.parse(window.contactData);
      
      // Start with the skill column using actual width and sticky positioning
      let footerHTML = `<div class="tabulator-cell" style="width: ${skillColumnWidth}px; min-width: ${skillColumnWidth}px; max-width: ${skillColumnWidth}px; padding: 8px; text-align: left; font-weight: bold; box-sizing: border-box; overflow: hidden; position: sticky; left: 0; z-index: 10; background: #f5f5f5; border-right: 1px solid #ddd;">Notes:</div>`;
      
      // Add columns for each contact using the grouped header widths
      contacts.forEach((contact, contactIndex) => {
        const contactName = contact.fieldData.contact.replace(/'/g, "\\'"); // Escape single quotes
        
        // Use the grouped header width for this contact
        const contactWidth = contactWidths[contactIndex] || 200;
        
        footerHTML += `
          <div class="tabulator-cell" style="width: ${contactWidth}px; min-width: ${contactWidth}px; max-width: ${contactWidth}px; padding: 2px; text-align: center; box-sizing: border-box; overflow: hidden;">
            <div style="display: flex; flex-direction: column; gap: 3px; width: 100%; align-items: center;">
              <button title="Add note for ${contactName}" 
                      type="button"
                      style="font-size: 10px; padding: 4px 6px; margin: 0; white-space: nowrap; width: calc(100% - 4px); cursor: pointer; border: 1px solid #007acc; background: #007acc; color: white; border-radius: 4px; font-weight: 500; transition: all 0.2s ease;">
                Add Note
              </button>
              <button title="View notes for ${contactName}" 
                      type="button"
                      style="font-size: 10px; padding: 4px 6px; margin: 0; white-space: nowrap; width: calc(100% - 4px); cursor: pointer; border: 1px solid #666; background: #f8f9fa; color: #333; border-radius: 4px; font-weight: 500; transition: all 0.2s ease;">
                View Notes
              </button>
            </div>
          </div>
        `;
      });
      
      // Create a footer element that looks like a table row
      const footerDiv = document.createElement('div');
      footerDiv.className = 'manual-group-footer tabulator-row';
      footerDiv.setAttribute('data-group', index);
      footerDiv.style.display = 'flex';
      footerDiv.style.backgroundColor = '#f5f5f5';
      footerDiv.style.borderTop = '1px solid #ddd';
      footerDiv.style.borderBottom = '2px solid #ccc';
      footerDiv.style.width = '100%';
      footerDiv.innerHTML = footerHTML;
      
      // Add event delegation for button clicks (more reliable than inline onclick)
      footerDiv.addEventListener('click', function(e) {
        const button = e.target.closest('button');
        if (!button) return;
        
        console.log('Button clicked via event delegation:', button.textContent.trim());
        
        // Extract data from button attributes or text
        const buttonText = button.textContent.trim();
        const titleAttr = button.getAttribute('title');
        
        if (titleAttr && window.openNotesModal) {
          // Parse contact name from title: "Add note for ContactName" or "View notes for ContactName"
          const match = titleAttr.match(/for (.+)$/);
          if (match) {
            const contactName = match[1];
            const mode = buttonText.toLowerCase().includes('add') ? 'add' : 'view';
            
            // Find the contact ID
            const contacts = JSON.parse(window.contactData);
            const contact = contacts.find(c => c.fieldData.contact === contactName);
            const contactId = contact ? contact.fieldData.contact_id : '';
            
            console.log('Opening modal:', { groupName, contactName, contactId, mode });
            window.openNotesModal(groupName, contactName, contactId, mode);
          }
        }
      });
      
      // Insert the footer after the group's last row
      // Find all rows that belong to this group
      let currentElement = groupElement.nextElementSibling;
      let lastRowInGroup = groupElement;
      
      // Navigate through rows until we find the next group or reach the end
      while (currentElement && !currentElement.classList.contains('tabulator-group')) {
        if (currentElement.classList.contains('tabulator-row')) {
          lastRowInGroup = currentElement;
        }
        currentElement = currentElement.nextElementSibling;
      }
      
      // Insert after the last row in this group
      lastRowInGroup.parentNode.insertBefore(footerDiv, lastRowInGroup.nextSibling);
    });
    
  } catch (error) {
    console.error('Error adding manual group footers:', error);
  }
}

// Make sure the function is available globally for FileMaker
window.addManualGroupFooters = addManualGroupFooters;

// Close modal when clicking outside of it
window.onclick = function(event) {
  const notesModal = document.getElementById('notesModal');
  const scoreModal = document.getElementById('scoreModal');
  
  if (event.target === notesModal) {
    closeNotesModal();
  }
  
  if (event.target === scoreModal) {
    closeScoreModal();
  }
};

// Close modal when clicking the X
document.addEventListener('DOMContentLoaded', function() {
  const closeBtn = document.querySelector('.close');
  if (closeBtn) {
    closeBtn.onclick = closeNotesModal;
  }
});

// Close modal when clicking the X
document.addEventListener('DOMContentLoaded', function() {
  const closeBtn = document.querySelector('.close');
  if (closeBtn) {
    closeBtn.onclick = closeNotesModal;
  }
});




function createTabulatorData(skillData, contactData, scoreData) {
  // Step 1: Create the table columns (first column is 'Skill', others are contacts with score and pass columns)
  const columns = [
      { 
        title: "Skill", 
        field: "Skill", 
        width: 400, 
        hozAlign: "left",
        frozen: true,
        formatter: function(cell) {
          const rowData = cell.getRow().getData();
          const level = rowData.level;
          const backgroundColor = getLevelColor(level);
          const textColor = getLevelTextColor(level);
          
          return `<div style="background-color: ${backgroundColor}; color: ${textColor}; padding: 8px; margin: 0; font-weight: 500; height: 60px; min-height: 60px; display: flex; align-items: center; box-sizing: border-box;">
                    ${cell.getValue()}
                  </div>`;
        },
        cellClick: function(e, cell) {
          // Allow text selection in skill cells
          e.stopPropagation();
        }
      }
  ];

  contactData.forEach(contact => {
      const contactName = contact.fieldData.contact;
      const contactId = contact.fieldData.contact_id;
      
      // Create a column group for each contact with just the score column
      columns.push({
        title: contactName,
        width: 150,
        minWidth: 150,
        maxWidth: 150,
        headerSort: false,
        columns: [
          // Add score column with level-based color coding and pass indicator
          { 
            title: "Score", 
            field: contactId, 
            hozAlign: "center", 
            width: 150,
            minWidth: 150,
            maxWidth: 150,
            headerSort: false,
            cellClick: function(e, cell) {
              // Open score editing modal
              const skillName = cell.getRow().getData().Skill;
              const skillId = cell.getRow().getData().id;
              const currentScore = cell.getValue();
              const metadata = cell.getRow().getData()[contactId + "_metadata"];
              const passValue = cell.getRow().getData()[contactId + "_pass"];
              
              openScoreModal(skillName, contactName, skillId, contactId, currentScore, passValue, metadata);
              return false; // Prevent default cell editing
            },
            formatter: function(cell) {
              const rowData = cell.getRow().getData();
              const level = rowData.level;
              const backgroundColor = getLevelColor(level);
              const textColor = getLevelTextColor(level);
              const value = cell.getValue();
              
              // Get metadata and pass status for this cell
              const metadata = rowData[contactId + "_metadata"];
              const passValue = rowData[contactId + "_pass"];
              const isPass = passValue === true || passValue === "true" || passValue === 1 || passValue === "1";
              
              // Debug logging for pass status
              if (value && value !== "-") {
                console.log(`Formatter debug for ${contactId}:`);
                console.log(`  - passValue: ${passValue} (type: ${typeof passValue})`);
                console.log(`  - isPass: ${isPass}`);
                console.log(`  - Row data keys containing pass:`, Object.keys(rowData).filter(key => key.includes('pass')));
                console.log(`  - All row data:`, rowData);
              }
              
              let metadataHtml = "";
              let passIcon = "";
              
              // Add pass icon if applicable (independent of score)
              if (isPass) {
                console.log(`Adding pass icon for ${contactId}`);
                passIcon = `<div style="position: absolute; top: 2px; right: 2px; background: #28a745; color: white; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">✓</div>`;
              }
              
              // Add metadata if available and there's a score
              if (value && value !== "-" && metadata) {
                const displayDate = metadata.editableDate || metadata.lastUpdated || "";
                const author = metadata.author || "";
                metadataHtml = `<div style="font-size: 9px; color: ${textColor}; opacity: 0.8; margin-top: 2px; line-height: 1;">
                                 ${author}<br>
                                 <span>${displayDate}</span>
                               </div>`;
              }
              
              return `<div style="background-color: ${backgroundColor}; color: ${textColor}; padding: 4px; margin: 0; font-weight: 500; height: 60px; min-height: 60px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-sizing: border-box; cursor: pointer; position: relative;">
                        ${passIcon}
                        <div style="font-size: 14px;">${value}</div>
                        ${metadataHtml}
                      </div>`;
            }
          }
        ]
      });
  });

  // Step 2: Create the table rows with skill names and corresponding scores
  const tableData = [];

  // Define level order for sorting
  const levelOrder = ['BEGINNING', 'DEVELOPING', 'PROFICIENT', 'ADVANCED'];

  // Filter skills by selected levels and sort by level
  const filteredSkills = skillData
    .filter(skill => window.selectedLevels.includes(skill.fieldData.level))
    .sort((a, b) => {
      // First sort by level
      const aLevelIndex = levelOrder.indexOf(a.fieldData.level);
      const bLevelIndex = levelOrder.indexOf(b.fieldData.level);
      if (aLevelIndex !== bLevelIndex) {
        return aLevelIndex - bLevelIndex;
      }
      // Then sort by skill name within the same level
      return a.fieldData.Skill.localeCompare(b.fieldData.Skill);
    });

  filteredSkills.forEach(skill => {
      // Initialize row with skill name, area, and level
      const row = {
          Skill: skill.fieldData.Skill,
          Area: skill.fieldData.Area,
          level: skill.fieldData.level,
          id: skill.fieldData.__ID
      };

      // Fill in the scores and pass values for each contact
      contactData.forEach(contact => {
          // Find the score entry for this skill and contact
          const scoreEntry = scoreData.find(score => 
            score.fieldData.Skill_ID === skill.fieldData.__ID && 
            score.fieldData.Contact_ID === contact.fieldData.contact_id
          );
          
          if (scoreEntry) {
            // Set the score value
            row[contact.fieldData.contact_id] = scoreEntry.fieldData.Data || "-";
            
            // Set the pass value
            const passData = scoreEntry.fieldData.pass;
            row[contact.fieldData.contact_id + "_pass"] = passData === 1 || passData === "1" || passData === true || passData === "true";
            
            // Add metadata for the score entry
            row[contact.fieldData.contact_id + "_metadata"] = {
              lastUpdated: scoreEntry.fieldData.date || formatDate(scoreEntry.fieldData.zzCreatedTimestamp),
              author: scoreEntry.fieldData.zzCreatedAcct || "Unknown",
              originalTimestamp: scoreEntry.fieldData.zzCreatedTimestamp,
              editableDate: scoreEntry.fieldData.date
            };
          } else {
            // No score entry found
            row[contact.fieldData.contact_id] = "-";
            row[contact.fieldData.contact_id + "_pass"] = false;
            row[contact.fieldData.contact_id + "_metadata"] = null;
          }
        });
        
        tableData.push(row);
  });

  // Step 3: Return the table structure with columns and data
  return { columns, data: tableData };
}

runScript = function (param) {
    FileMaker.PerformScriptWithOption("Manage: Competencies", param, 0);
}

// Function to update pass checkbox from FileMaker (if needed)
window.updatePassCheckbox = function(contactId, skillId, passValue) {
  if (window.table) {
    const rows = window.table.getData();
    const rowToUpdate = rows.find(row => row.id === skillId);
    if (rowToUpdate) {
      window.table.updateData([{
        id: skillId,
        [contactId + "_pass"]: passValue
      }]);
    }
  }
};

// Function to update score from FileMaker (if needed)
window.updateScore = function(contactId, skillId, scoreValue) {
  if (window.table) {
    const rows = window.table.getData();
    const rowToUpdate = rows.find(row => row.id === skillId);
    if (rowToUpdate) {
      window.table.updateData([{
        id: skillId,
        [contactId]: scoreValue
      }]);
    }
  }
};

// Test function to manually test the modal
window.testModal = function() {
  openNotesModal('Test Group', 'Test Contact', 'test_id', 'add');
};

// Test function to load sample data and test grouping
window.testTableWithData = function() {
  const sampleSkillData = JSON.stringify([
    { fieldData: { Skill: "JavaScript", Area: "Technical Skills", __ID: "1", level: "BEGINNING" } },
    { fieldData: { Skill: "HTML/CSS", Area: "Technical Skills", __ID: "2", level: "DEVELOPING" } },
    { fieldData: { Skill: "Communication", Area: "Soft Skills", __ID: "3", level: "PROFICIENT" } },
    { fieldData: { Skill: "Leadership", Area: "Soft Skills", __ID: "4", level: "ADVANCED" } },
    { fieldData: { Skill: "Project Management", Area: "Management Skills", __ID: "5", level: "PROFICIENT" } }
  ]);
  
  const sampleContactData = JSON.stringify([
    { fieldData: { contact: "John Doe", contact_id: "contact_1" } },
    { fieldData: { contact: "Jane Smith", contact_id: "contact_2" } }
  ]);
  
  const sampleScoreData = JSON.stringify([
    { fieldData: { Skill_ID: "1", Contact_ID: "contact_1", Data: "2", pass: 1, zzCreatedTimestamp: "08/05/2025 10:00:00", zzCreatedAcct: "jsmith", date: "08/05/2025" } },
    { fieldData: { Skill_ID: "1", Contact_ID: "contact_2", Data: "3", pass: "", zzCreatedTimestamp: "08/06/2025 14:00:00", zzCreatedAcct: "btrainer", date: "08/06/2025" } },
    { fieldData: { Skill_ID: "2", Contact_ID: "contact_1", Data: "3", pass: 1, zzCreatedTimestamp: "08/06/2025 12:00:00", zzCreatedAcct: "acoach", date: "08/06/2025" } },
    { fieldData: { Skill_ID: "2", Contact_ID: "contact_2", Data: "1", pass: 1, zzCreatedTimestamp: "08/06/2025 16:00:00", zzCreatedAcct: "mgrant", date: "08/06/2025" } },
    { fieldData: { Skill_ID: "3", Contact_ID: "contact_1", Data: "2", pass: "", zzCreatedTimestamp: "08/06/2025 11:00:00", zzCreatedAcct: "btrainer", date: "08/06/2025" } },
    { fieldData: { Skill_ID: "3", Contact_ID: "contact_2", Data: "3", pass: 1, zzCreatedTimestamp: "08/06/2025 13:00:00", zzCreatedAcct: "acoach", date: "08/06/2025" } },
    { fieldData: { Skill_ID: "4", Contact_ID: "contact_1", Data: "1", pass: "", zzCreatedTimestamp: "08/06/2025 10:00:00", zzCreatedAcct: "jsmith", date: "08/06/2025" } },
    { fieldData: { Skill_ID: "4", Contact_ID: "contact_2", Data: "2", pass: "", zzCreatedTimestamp: "08/06/2025 09:00:00", zzCreatedAcct: "mgrant", date: "08/06/2025" } },
    { fieldData: { Skill_ID: "5", Contact_ID: "contact_1", Data: "3", pass: 1, zzCreatedTimestamp: "08/06/2025 08:00:00", zzCreatedAcct: "btrainer", date: "08/06/2025" } },
    { fieldData: { Skill_ID: "5", Contact_ID: "contact_2", Data: "2", pass: 1, zzCreatedTimestamp: "08/06/2025 07:00:00", zzCreatedAcct: "acoach", date: "08/06/2025" } }
  ]);
  
  // Call loadTable with sample data and set a test user
  loadTable(sampleSkillData, sampleContactData, sampleScoreData, "Test User");
};

// Add test button to the page for debugging
window.addEventListener('DOMContentLoaded', function() {
  const testButton = document.createElement('button');
  testButton.textContent = 'Test Modal';
  testButton.onclick = testModal;
  testButton.style.position = 'fixed';
  testButton.style.top = '10px';
  testButton.style.right = '10px';
  testButton.style.zIndex = '9999';
  document.body.appendChild(testButton);
  
  const testDataButton = document.createElement('button');
  testDataButton.textContent = 'Load Test Data';
  testDataButton.onclick = testTableWithData;
  testDataButton.style.position = 'fixed';
  testDataButton.style.top = '50px';
  testDataButton.style.right = '10px';
  testDataButton.style.zIndex = '9999';
  document.body.appendChild(testDataButton);
  
  const testScoreButton = document.createElement('button');
  testScoreButton.textContent = 'Test Score Modal';
  testScoreButton.onclick = function() {
    openScoreModal('Test Skill', 'Test Student', 'test_skill_id', 'test_contact_id', '2', true, {
      lastUpdated: '08/12/2025',
      author: 'Test User',
      editableDate: '08/12/2025'
    });
  };
  testScoreButton.style.position = 'fixed';
  testScoreButton.style.top = '90px';
  testScoreButton.style.right = '10px';
  testScoreButton.style.zIndex = '9999';
  document.body.appendChild(testScoreButton);
});

};