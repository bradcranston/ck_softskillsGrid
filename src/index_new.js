// Global data storage
window.skillData = null;
window.contactData = null;
window.scoreData = null;
window.currentUser = "Current User";
window.selectedLevels = ['BEGINNING', 'DEVELOPING', 'PROFICIENT', 'ADVANCED'];

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

// Main function called from FileMaker to load the table
window.loadTable = (skillData, contactData, scoreData, user) => {
  console.log('loadTable called with user:', user);
  
  // Store data globally
  window.skillData = skillData;
  window.contactData = contactData;
  window.scoreData = scoreData;
  window.currentUser = user || "Current User";
  
  console.log('window.currentUser set to:', window.currentUser);
  
  // Parse the data
  const skills = JSON.parse(skillData);
  const contacts = JSON.parse(contactData);
  const scores = JSON.parse(scoreData);
  
  // Create the table
  createTable(skills, contacts, scores);
};

// Helper function to get level colors
window.getLevelColor = function(level) {
  const levelColors = {
    'BEGINNING': '#e8f5e8',     // Light green
    'DEVELOPING': '#fff3cd',    // Light yellow  
    'PROFICIENT': '#cce5ff',    // Light blue
    'ADVANCED': '#f8d7da'       // Light red
  };
  return levelColors[level] || '#ffffff';
};

// Helper function to get level text colors
window.getLevelTextColor = function(level) {
  const levelTextColors = {
    'BEGINNING': '#2d5a2d',     // Dark green
    'DEVELOPING': '#856404',    // Dark yellow/orange
    'PROFICIENT': '#004085',    // Dark blue
    'ADVANCED': '#721c24'       // Dark red
  };
  return levelTextColors[level] || '#000000';
};

// Level filtering functionality
window.applyLevelFilter = function() {
  const checkboxes = document.querySelectorAll('#level-filter-container input[type="checkbox"]');
  window.selectedLevels = Array.from(checkboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);
  
  console.log('Selected levels:', window.selectedLevels);
  
  // Recreate the table with filtered data
  if (window.skillData && window.contactData && window.scoreData) {
    const skills = JSON.parse(window.skillData);
    const contacts = JSON.parse(window.contactData);
    const scores = JSON.parse(window.scoreData);
    createTable(skills, contacts, scores);
  }
};

// Function to create the table
function createTable(skills, contacts, scores) {
  const container = document.getElementById('skills-table-container');
  const headerContainer = document.getElementById('contact-headers');
  const tableContainer = document.getElementById('skills-table');
  
  // Clear existing content
  headerContainer.innerHTML = '';
  tableContainer.innerHTML = '';
  
  // Create contact headers
  contacts.forEach(contact => {
    const headerDiv = document.createElement('div');
    headerDiv.className = 'contact-header';
    headerDiv.textContent = contact.fieldData.contact;
    headerContainer.appendChild(headerDiv);
  });
  
  // Process and group skills by area
  const groupedSkills = groupSkillsByArea(skills, contacts, scores);
  
  // Create table content
  Object.keys(groupedSkills).forEach(area => {
    createGroupSection(area, groupedSkills[area], contacts, tableContainer);
  });
}

// Function to group skills by area and prepare data
function groupSkillsByArea(skills, contacts, scores) {
  const levelOrder = ['BEGINNING', 'DEVELOPING', 'PROFICIENT', 'ADVANCED'];
  
  // Filter skills by selected levels
  const filteredSkills = skills.filter(skill => 
    window.selectedLevels.includes(skill.fieldData.level)
  );
  
  // Group by area
  const grouped = {};
  
  filteredSkills.forEach(skill => {
    const area = skill.fieldData.Area;
    if (!grouped[area]) {
      grouped[area] = [];
    }
    
    // Prepare skill data with scores
    const skillData = {
      id: skill.fieldData.__ID,
      skill: skill.fieldData.Skill,
      level: skill.fieldData.level,
      area: skill.fieldData.Area,
      scores: {}
    };
    
    // Add scores for each contact
    contacts.forEach(contact => {
      const contactId = contact.fieldData.contact_id;
      const scoreEntry = scores.find(score => 
        score.fieldData.Skill_ID === skill.fieldData.__ID && 
        score.fieldData.Contact_ID === contactId
      );
      
      if (scoreEntry) {
        const rawScore = scoreEntry.fieldData.Score;
        const scoreValue = (rawScore === null || rawScore === undefined) ? "-" : rawScore;
        const passValue = scoreEntry.fieldData.Pass;
        const isPass = passValue === true || passValue === "true" || passValue === 1 || passValue === "1";
        
        skillData.scores[contactId] = {
          value: scoreValue,
          pass: isPass,
          metadata: {
            author: scoreEntry.fieldData.Author || '',
            lastUpdated: scoreEntry.fieldData.LastUpdated || '',
            editableDate: formatDate(scoreEntry.fieldData.EditableDate || scoreEntry.fieldData.LastUpdated || '')
          }
        };
      } else {
        skillData.scores[contactId] = {
          value: "-",
          pass: false,
          metadata: null
        };
      }
    });
    
    grouped[area].push(skillData);
  });
  
  // Sort skills within each group by level, then by skill name
  Object.keys(grouped).forEach(area => {
    grouped[area].sort((a, b) => {
      const aLevelIndex = levelOrder.indexOf(a.level);
      const bLevelIndex = levelOrder.indexOf(b.level);
      if (aLevelIndex !== bLevelIndex) {
        return aLevelIndex - bLevelIndex;
      }
      return a.skill.localeCompare(b.skill);
    });
  });
  
  return grouped;
}

// Function to create a group section
function createGroupSection(area, skills, contacts, container) {
  const groupDiv = document.createElement('div');
  groupDiv.className = 'group-section';
  
  // Create group header
  const headerDiv = document.createElement('div');
  headerDiv.className = 'group-header';
  headerDiv.onclick = () => toggleGroup(headerDiv);
  
  const toggleSpan = document.createElement('span');
  toggleSpan.className = 'group-toggle';
  
  const titleSpan = document.createElement('span');
  titleSpan.textContent = `${area} (${skills.length} skills)`;
  
  headerDiv.appendChild(toggleSpan);
  headerDiv.appendChild(titleSpan);
  
  // Create group content
  const contentDiv = document.createElement('div');
  contentDiv.className = 'group-content';
  
  // Add skills to the group
  skills.forEach(skill => {
    const rowDiv = createSkillRow(skill, contacts);
    contentDiv.appendChild(rowDiv);
  });
  
  // Create group footer with notes button
  const footerDiv = document.createElement('div');
  footerDiv.className = 'group-footer';
  
  const footerText = document.createElement('span');
  footerText.textContent = `${area} Summary`;
  
  const notesButton = document.createElement('button');
  notesButton.className = 'notes-button';
  notesButton.textContent = 'View/Add Notes';
  notesButton.onclick = () => openNotesModal(area, 'group');
  
  footerDiv.appendChild(footerText);
  footerDiv.appendChild(notesButton);
  
  // Assemble the group
  groupDiv.appendChild(headerDiv);
  groupDiv.appendChild(contentDiv);
  groupDiv.appendChild(footerDiv);
  
  container.appendChild(groupDiv);
}

// Function to create a skill row
function createSkillRow(skill, contacts) {
  const rowDiv = document.createElement('div');
  rowDiv.className = 'skill-row';
  
  // Create skill cell
  const skillCell = document.createElement('div');
  skillCell.className = 'skill-cell';
  skillCell.style.backgroundColor = getLevelColor(skill.level);
  skillCell.style.color = getLevelTextColor(skill.level);
  skillCell.textContent = skill.skill;
  
  // Create score cells container
  const scoreCellsDiv = document.createElement('div');
  scoreCellsDiv.className = 'score-cells';
  
  // Add score cells for each contact
  contacts.forEach(contact => {
    const contactId = contact.fieldData.contact_id;
    const contactName = contact.fieldData.contact;
    const scoreData = skill.scores[contactId];
    
    const scoreCell = document.createElement('div');
    scoreCell.className = 'score-cell';
    scoreCell.style.backgroundColor = getLevelColor(skill.level);
    scoreCell.style.color = getLevelTextColor(skill.level);
    
    // Add click handler for score editing
    scoreCell.onclick = () => openScoreModal(
      skill.skill, 
      contactName, 
      skill.id, 
      contactId, 
      scoreData.value, 
      scoreData.pass, 
      scoreData.metadata
    );
    
    // Create score value
    const scoreValue = document.createElement('div');
    scoreValue.className = 'score-value';
    scoreValue.textContent = scoreData.value;
    
    // Create metadata if available
    const metadataDiv = document.createElement('div');
    metadataDiv.className = 'score-metadata';
    if (scoreData.value !== "-" && scoreData.metadata) {
      const author = scoreData.metadata.author || '';
      const date = scoreData.metadata.editableDate || '';
      metadataDiv.innerHTML = `${author}<br><span>${date}</span>`;
    }
    
    // Add pass indicator if applicable
    if (scoreData.pass) {
      const passIndicator = document.createElement('div');
      passIndicator.className = 'pass-indicator';
      passIndicator.textContent = '✓';
      scoreCell.appendChild(passIndicator);
    }
    
    scoreCell.appendChild(scoreValue);
    scoreCell.appendChild(metadataDiv);
    scoreCellsDiv.appendChild(scoreCell);
  });
  
  rowDiv.appendChild(skillCell);
  rowDiv.appendChild(scoreCellsDiv);
  
  return rowDiv;
}

// Function to toggle group visibility
function toggleGroup(headerElement) {
  const groupSection = headerElement.parentElement;
  groupSection.classList.toggle('collapsed');
}

// Helper function to format date for display
function formatDate(dateString) {
  if (!dateString) return "";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${month}/${day}/${year}`;
  } catch (e) {
    return dateString;
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
  
  // Set modal title
  document.getElementById('scoreModalTitle').textContent = `Edit Score - ${skillName} - ${contactName}`;
  
  // Set current values
  document.getElementById('scoreSelect').value = currentScore || '-';
  document.getElementById('passCheckbox').checked = passValue === true || passValue === "true" || passValue === 1 || passValue === "1";
  
  // Set metadata if available
  if (metadata) {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('scoreDate').value = metadata.editableDate ? new Date(metadata.editableDate).toISOString().split('T')[0] : today;
    document.getElementById('scoreUser').value = metadata.author || window.currentUser;
  } else {
    // Set defaults for new entries
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('scoreDate').value = today;
    document.getElementById('scoreUser').value = window.currentUser;
  }
  
  // Show modal
  document.getElementById('scoreModal').style.display = 'block';
};

window.closeScoreModal = function() {
  document.getElementById('scoreModal').style.display = 'none';
};

window.saveScore = function() {
  const score = document.getElementById('scoreSelect').value;
  const pass = document.getElementById('passCheckbox').checked;
  const date = document.getElementById('scoreDate').value;
  const user = document.getElementById('scoreUser').value;
  
  console.log('Saving score:', { 
    skill: window.currentSkillId, 
    contact: window.currentScoreContactId, 
    score, 
    pass, 
    date, 
    user 
  });
  
  // Call FileMaker function to save the score
  if (typeof window.FileMaker !== 'undefined' && window.FileMaker.PerformScript) {
    const params = JSON.stringify({
      skillId: window.currentSkillId,
      contactId: window.currentScoreContactId,
      score: score,
      pass: pass,
      date: date,
      user: user
    });
    
    window.FileMaker.PerformScript("UpdateScore", params);
  } else {
    console.log('FileMaker not available, would save:', {
      skillId: window.currentSkillId,
      contactId: window.currentScoreContactId,
      score: score,
      pass: pass,
      date: date,
      user: user
    });
  }
  
  closeScoreModal();
};

// Notes Modal functions
window.openNotesModal = function(groupOrSkillName, mode, contactName = '') {
  window.currentGroupName = groupOrSkillName;
  window.currentContactName = contactName;
  window.currentMode = mode;
  
  if (mode === 'group') {
    document.getElementById('modalTitle').textContent = `${groupOrSkillName} Notes`;
  } else {
    document.getElementById('modalTitle').textContent = `${groupOrSkillName} - ${contactName} Notes`;
  }
  
  // Request notes from FileMaker
  if (typeof window.FileMaker !== 'undefined' && window.FileMaker.PerformScript) {
    const params = JSON.stringify({
      groupName: groupOrSkillName,
      contactName: contactName,
      mode: mode
    });
    
    window.FileMaker.PerformScript("GetNotes", params);
  } else {
    // For testing without FileMaker
    window.displayNotes(JSON.stringify([
      { note: "Sample note 1", author: "Test User", date: "2025-08-20" },
      { note: "Sample note 2", author: "Another User", date: "2025-08-19" }
    ]));
  }
  
  // Show modal
  document.getElementById('notesModal').style.display = 'block';
};

window.closeNotesModal = function() {
  document.getElementById('notesModal').style.display = 'none';
  document.getElementById('noteTextarea').style.display = 'none';
  document.getElementById('noteDisplay').style.display = 'none';
  document.getElementById('saveNoteBtn').style.display = 'none';
};

// Function to receive notes data from FileMaker
window.displayNotes = function(notesData) {
  const notes = JSON.parse(notesData);
  const noteDisplay = document.getElementById('noteDisplay');
  const noteTextarea = document.getElementById('noteTextarea');
  const saveBtn = document.getElementById('saveNoteBtn');
  
  // Show existing notes
  noteDisplay.style.display = 'block';
  noteTextarea.style.display = 'block';
  saveBtn.style.display = 'inline-block';
  
  // Display existing notes
  if (notes && notes.length > 0) {
    let notesHtml = '<h4>Existing Notes:</h4>';
    notes.forEach(note => {
      notesHtml += `<div style="margin-bottom: 10px; padding: 8px; background: white; border-radius: 4px; border-left: 3px solid #007bff;">
                      <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                        ${note.author} - ${formatDate(note.date)}
                      </div>
                      <div>${note.note}</div>
                    </div>`;
    });
    noteDisplay.innerHTML = notesHtml;
  } else {
    noteDisplay.innerHTML = '<p style="color: #666; font-style: italic;">No existing notes.</p>';
  }
};

window.saveNote = function() {
  const noteText = document.getElementById('noteTextarea').value.trim();
  
  if (!noteText) {
    alert('Please enter a note before saving.');
    return;
  }
  
  const noteData = {
    groupName: window.currentGroupName,
    contactName: window.currentContactName,
    mode: window.currentMode,
    note: noteText,
    author: window.currentUser,
    date: new Date().toISOString().split('T')[0]
  };
  
  console.log('Saving note:', noteData);
  
  // Call FileMaker function to save the note
  if (typeof window.FileMaker !== 'undefined' && window.FileMaker.PerformScript) {
    window.FileMaker.PerformScript("SaveNote", JSON.stringify(noteData));
  } else {
    console.log('FileMaker not available, would save note:', noteData);
  }
  
  // Clear the textarea
  document.getElementById('noteTextarea').value = '';
  
  // Refresh the notes display
  openNotesModal(window.currentGroupName, window.currentMode, window.currentContactName);
};

// Function to refresh table data (called from FileMaker after updates)
window.refreshTable = function() {
  if (window.skillData && window.contactData && window.scoreData) {
    const skills = JSON.parse(window.skillData);
    const contacts = JSON.parse(window.contactData);
    const scores = JSON.parse(window.scoreData);
    createTable(skills, contacts, scores);
  }
};

// Modal event handlers
document.addEventListener('DOMContentLoaded', function() {
  // Close modals when clicking outside
  window.addEventListener('click', function(event) {
    const scoreModal = document.getElementById('scoreModal');
    const notesModal = document.getElementById('notesModal');
    
    if (event.target === scoreModal) {
      closeScoreModal();
    }
    if (event.target === notesModal) {
      closeNotesModal();
    }
  });
  
  // Close modals when clicking X
  document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.onclick = function() {
      closeScoreModal();
      closeNotesModal();
    };
  });
});

// Test function (for development)
window.testTable = function() {
  const sampleSkillData = JSON.stringify([
    {
      fieldData: {
        Area: "KNIFE SKILLS",
        Skill: "I can clean and store knives properly",
        __ID: "skill1",
        level: "BEGINNING"
      }
    },
    {
      fieldData: {
        Area: "KNIFE SKILLS", 
        Skill: "I can make simple cuts with guidance",
        __ID: "skill2",
        level: "BEGINNING"
      }
    },
    {
      fieldData: {
        Area: "COOKING TECHNIQUES",
        Skill: "I can prepare basic sauces",
        __ID: "skill3", 
        level: "DEVELOPING"
      }
    }
  ]);
  
  const sampleContactData = JSON.stringify([
    {
      fieldData: {
        contact: "John Doe",
        contact_id: "contact1"
      }
    },
    {
      fieldData: {
        contact: "Jane Smith", 
        contact_id: "contact2"
      }
    }
  ]);
  
  const sampleScoreData = JSON.stringify([
    {
      fieldData: {
        Skill_ID: "skill1",
        Contact_ID: "contact1",
        Score: "2",
        Pass: true,
        Author: "Test User",
        LastUpdated: "2025-08-20",
        EditableDate: "2025-08-20"
      }
    }
  ]);
  
  loadTable(sampleSkillData, sampleContactData, sampleScoreData, "Test User");
};
