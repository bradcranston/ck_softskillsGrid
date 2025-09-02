// Global data storage
window.skillData = null;
window.contactData = null;
window.scoreData = null;
window.currentUser = "Current User";
window.currentDate = "Current Date";
window.currentUserType = "Staff"; // Default to 'Staff'
window.selectedTypes = ['Multiple Choice', 'Free Text', 'Personal Readiness']; // Include all types

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
window.currentSkillHeader = '';

// Helper function to safely parse JSON with detailed error reporting
function safeJSONParse(jsonString, paramName) {
  if (!jsonString) {
    throw new Error(`${paramName} is empty or null`);
  }
  
  if (typeof jsonString !== 'string') {
    throw new Error(`${paramName} is not a string (type: ${typeof jsonString})`);
  }
  
  // Check if string is properly formatted JSON
  const trimmed = jsonString.trim();
  if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
    throw new Error(`${paramName} does not appear to be valid JSON (doesn't start with [ or {)`);
  }
  
  if (!trimmed.endsWith(']') && !trimmed.endsWith('}')) {
    throw new Error(`${paramName} appears to be incomplete JSON (doesn't end with ] or })`);
  }
  
  try {
    return JSON.parse(jsonString);
  } catch (parseError) {
    throw new Error(`${paramName} JSON parse error: ${parseError.message}. Content preview: ${jsonString.substring(0, 100)}...`);
  }
}

// Main function called from FileMaker to load the table
window.loadTable = (assessmentData, contactData, scoreData, user, date, userType) => {
  console.log('loadTable called with user:', user, 'userType:', userType);
  console.log('Raw parameters received:');
  console.log('  assessmentData type:', typeof assessmentData, 'length:', assessmentData?.length);
  console.log('  contactData type:', typeof contactData, 'length:', contactData?.length);
  console.log('  scoreData type:', typeof scoreData, 'length:', scoreData?.length);
  console.log('  userType:', userType);
  
  // Store data globally
  window.skillData = assessmentData; // Using assessmentData instead of skillData
  window.contactData = contactData;
  window.scoreData = scoreData;
  window.currentUser = user || "Current User";
  window.currentDate = date || "Current Date";
  window.currentUserType = userType || "Staff"; // Default to 'Staff' if not provided

  console.log('window.currentUser set to:', window.currentUser);
  console.log('window.currentUserType set to:', window.currentUserType);
  
  try {
    // Parse the data with error handling
    console.log('Parsing assessmentData...');
    const assessmentItems = safeJSONParse(assessmentData, 'assessmentData');
    console.log('Assessment items parsed successfully, count:', assessmentItems.length);
    
    console.log('Parsing contactData...');
    console.log('contactData content preview:', contactData.substring(0, 200));
    const contacts = safeJSONParse(contactData, 'contactData');
    console.log('Contacts parsed successfully, count:', contacts.length);
    
    console.log('Parsing scoreData...');
    const scores = safeJSONParse(scoreData, 'scoreData');
    console.log('Scores parsed successfully, count:', scores.length);
    
    // Create the table with assessment data
    createTable(assessmentItems, contacts, scores);
  } catch (error) {
    console.error('Error parsing data in loadTable:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    
    // Show user-friendly error
    alert('Error loading data: ' + error.message + '\n\nPlease check the browser console for details.');
  }
};

// Test function to load assessment data from data.json
window.loadAssessmentData = async function(contactData = null, scoreData = null, user = "Test User", date = null, userType = "Staff") {
  try {
    // Load the assessment data from data.json
    const response = await fetch('./data.json');
    const assessmentData = await response.json();
    
    // Use provided contactData or create sample data for testing
    let contacts;
    if (contactData) {
      // Parse contactData if it's a string from FileMaker
      contacts = typeof contactData === 'string' ? JSON.parse(contactData) : contactData;
    } else {
      // Create sample contact data for testing
      contacts = [
        {
          fieldData: {
            contact: "Test User 1",
            contact_id: "contact_1"
          }
        },
        {
          fieldData: {
            contact: "Test User 2", 
            contact_id: "contact_2"
          }
        }
      ];
    }
    
    // Use provided scoreData or create empty data for testing
    let scores;
    if (scoreData) {
      // Parse scoreData if it's a string from FileMaker
      scores = typeof scoreData === 'string' ? JSON.parse(scoreData) : scoreData;
    } else {
      scores = [];
    }
    
    // Use provided date or current date
    const currentDate = date || new Date().toISOString().split('T')[0];
    
    // Load the table with assessment data
    window.loadTable(
      JSON.stringify(assessmentData),
      JSON.stringify(contacts),
      JSON.stringify(scores),
      user,
      currentDate,
      userType
    );
    
  } catch (error) {
    console.error('Error loading assessment data:', error);
  }
};

// Auto-load assessment data when page loads (for testing)
document.addEventListener('DOMContentLoaded', function() {
  // Only auto-load in development/testing
  if (window.location.hostname === 'localhost' || window.location.hostname === '') {
    window.loadAssessmentData();
  }
});

// Type filtering functionality for assessment items
window.applyTypeFilter = function() {
  const checkboxes = document.querySelectorAll('#level-filter-container input[type="checkbox"]');
  window.selectedTypes = Array.from(checkboxes)
    .filter(cb => cb.checked)
    .map(cb => cb.value);
  
  console.log('Selected types:', window.selectedTypes);
  
  // Recreate the table with filtered data
  if (window.skillData && window.contactData && window.scoreData) {
    const assessmentItems = JSON.parse(window.skillData);
    const contacts = JSON.parse(window.contactData);
    const scores = JSON.parse(window.scoreData);
    createTable(assessmentItems, contacts, scores);
  }
};

// Function to create the table
function createTable(assessmentItems, contacts, scores) {
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
  
  // Process and group assessment items by header
  const groupedItems = groupAssessmentsByHeader(assessmentItems, contacts, scores);
  
  // Create table content
  Object.keys(groupedItems).forEach(header => {
    createGroupSection(header, groupedItems[header], contacts, tableContainer);
  });
}

// Function to group assessment items by header and prepare data
function groupAssessmentsByHeader(assessmentItems, contacts, scores) {
  // Filter assessment items to only include selected types and scoreable items
  // Handle special cases for Free Text and Personal Readiness types
  const scoreableItems = assessmentItems.filter(item => 
    window.selectedTypes.includes(item.Type) && (
      (item.Type === 'Free Text' && item.Header) || // Include Free Text items based on Header
      (item.Type === 'Personal Readiness' && item.Header) || // Include Personal Readiness items based on header only
      (item.Subheader && item.Question) // Include regular items with Subheader and Question
    )
  );
  
  // Group by header
  const grouped = {};
  
  scoreableItems.forEach((item, index) => {
    const header = item.Header || 'General Assessment';
    if (!grouped[header]) {
      grouped[header] = [];
    }
    
    // Prepare assessment item data with scores
    const itemData = {
      id: `assessment_${index}`, // Generate unique ID
      skill: item.Subheader || item.Question || item.Header, // Use subheader/question as skill name, fallback to header
      description: item.Question || item.HeaderInstruction, // Use question as description, fallback to header instruction
      header: header,
      type: item.Type,
      options: {
        option1: { title: item.Option1, description: item.OptionDescription1 },
        option2: { title: item.Option2, description: item.OptionDescription2 },
        option3: { title: item.Option3, description: item.OptionDescription3 },
        option4: { title: item.Option4, description: item.OptionDescription4 }
      },
      // Include Personal Readiness specific properties if they exist
      StatusOptions: item.StatusOptions || [],
      MeetsStandardOptions: item.MeetsStandardOptions || [],
      scores: {}
    };
    
    // Add scores for each contact
    contacts.forEach(contact => {
      const contactId = contact.fieldData.contact_id;
      
      // Find all score entries for this contact and skill
      const allScoreEntries = scores.filter(score => {
        const scoreSkillId = score.fieldData.Skill_ID || score.fieldData.skillId;
        const scoreContactId = score.fieldData.Contact_ID || score.fieldData.contact_id;
        return scoreSkillId === `assessment_${index}` && scoreContactId === contactId;
      });
      
      // Separate Staff and Self scores
      const staffScores = allScoreEntries.filter(score => 
        (score.fieldData.userType === 'Staff') || (!score.fieldData.userType) // Include legacy scores without userType as Staff
      );
      const selfScores = allScoreEntries.filter(score => 
        score.fieldData.userType === 'Self'
      );
      
      // Get most recent scores for each type
      const getMostRecentScore = (scoresList) => {
        if (scoresList.length === 0) return null;
        
        // Sort by timestamp (most recent first)
        const sorted = scoresList.sort((a, b) => {
          const dateA = new Date(a.fieldData.zzCreatedTimestamp || '1970-01-01');
          const dateB = new Date(b.fieldData.zzCreatedTimestamp || '1970-01-01');
          return dateB - dateA;
        });
        
        return sorted[0];
      };
      
      const mostRecentStaff = getMostRecentScore(staffScores);
      const mostRecentSelf = getMostRecentScore(selfScores);
      
      // Determine which score to display primarily (most recent overall)
      let primaryScore = null;
      if (mostRecentStaff && mostRecentSelf) {
        const staffDate = new Date(mostRecentStaff.fieldData.zzCreatedTimestamp || '1970-01-01');
        const selfDate = new Date(mostRecentSelf.fieldData.zzCreatedTimestamp || '1970-01-01');
        primaryScore = staffDate >= selfDate ? mostRecentStaff : mostRecentSelf;
      } else {
        primaryScore = mostRecentStaff || mostRecentSelf;
      }
      
      if (primaryScore) {
        const rawScore = primaryScore.fieldData.Data || primaryScore.fieldData.Score;
        const scoreValue = (rawScore === null || rawScore === undefined) ? "-" : rawScore;
        const passValue = primaryScore.fieldData.pass;
        const isPass = passValue === true || passValue === "true" || passValue === 1 || passValue === "1";
        
        itemData.scores[contactId] = {
          value: scoreValue,
          pass: isPass,
          userType: primaryScore.fieldData.userType || 'Staff',
          metadata: {
            author: primaryScore.fieldData.user || primaryScore.fieldData.zzCreatedAcct || '',
            lastUpdated: primaryScore.fieldData.date || '',
            editableDate: formatDate(primaryScore.fieldData.date || primaryScore.fieldData.zzCreatedTimestamp || ''),
            zzCreatedName: primaryScore.fieldData.zzCreatedName || '',
            zzCreatedTimestamp: primaryScore.fieldData.zzCreatedTimestamp || ''
          },
          // Include both Staff and Self data if available
          staffData: mostRecentStaff ? {
            value: mostRecentStaff.fieldData.Data || mostRecentStaff.fieldData.Score,
            user: mostRecentStaff.fieldData.user || mostRecentStaff.fieldData.zzCreatedAcct || '',
            date: formatDate(mostRecentStaff.fieldData.date || mostRecentStaff.fieldData.zzCreatedTimestamp || ''),
            timestamp: mostRecentStaff.fieldData.zzCreatedTimestamp || ''
          } : null,
          selfData: mostRecentSelf ? {
            value: mostRecentSelf.fieldData.Data || mostRecentSelf.fieldData.Score,
            user: mostRecentSelf.fieldData.user || mostRecentSelf.fieldData.zzCreatedAcct || '',
            date: formatDate(mostRecentSelf.fieldData.date || mostRecentSelf.fieldData.zzCreatedTimestamp || ''),
            timestamp: mostRecentSelf.fieldData.zzCreatedTimestamp || ''
          } : null
        };
      } else {
        itemData.scores[contactId] = {
          value: "-",
          pass: false,
          userType: null,
          metadata: null,
          staffData: null,
          selfData: null
        };
      }
    });
    
    grouped[header].push(itemData);
  });
  
  // Sort items within each group by subheader name
  Object.keys(grouped).forEach(header => {
    grouped[header].sort((a, b) => {
      return a.skill.localeCompare(b.skill);
    });
  });
  
  return grouped;
}

// Function to create a group section
function createGroupSection(header, items, contacts, container) {
  const groupDiv = document.createElement('div');
  groupDiv.className = 'group-section';
  
  // Create group header
  const headerDiv = document.createElement('div');
  headerDiv.className = 'group-header';
  headerDiv.onclick = () => toggleGroup(headerDiv);
  
  const toggleSpan = document.createElement('span');
  toggleSpan.className = 'group-toggle';
  
  const titleSpan = document.createElement('span');
  titleSpan.textContent = `${header} (${items.length} items)`;
  
  headerDiv.appendChild(toggleSpan);
  headerDiv.appendChild(titleSpan);
  
  // Create group content
  const contentDiv = document.createElement('div');
  contentDiv.className = 'group-content';
  
  // Add assessment items to the group
  items.forEach(item => {
    const rowDiv = createSkillRow(item, contacts);
    contentDiv.appendChild(rowDiv);
  });
  
  // Create group footer with contact-specific notes buttons
  const footerDiv = document.createElement('div');
  footerDiv.className = 'group-footer';
  
  // Create the skill column area
  const footerSkillArea = document.createElement('div');
  footerSkillArea.className = 'footer-skill-area';
  footerSkillArea.style.width = '400px';
  footerSkillArea.style.minWidth = '400px';
  footerSkillArea.style.maxWidth = '400px';
  footerSkillArea.style.padding = '8px 12px';
  footerSkillArea.style.borderRight = '1px solid #ddd';
  footerSkillArea.style.background = '#f1f3f4';
  footerSkillArea.style.position = 'sticky';
  footerSkillArea.style.left = '0';
  footerSkillArea.style.zIndex = '90';
  footerSkillArea.style.display = 'flex';
  footerSkillArea.style.alignItems = 'center';
  footerSkillArea.style.boxSizing = 'border-box';
  footerSkillArea.style.flexShrink = '0';
  footerSkillArea.textContent = `${header} Summary`;
  
  // Create the contact buttons area
  const footerContactsArea = document.createElement('div');
  footerContactsArea.className = 'footer-contacts-area';
  footerContactsArea.style.display = 'flex';
  footerContactsArea.style.flex = '1';
  footerContactsArea.style.minWidth = '0';
  
  // Create notes buttons for each contact
  contacts.forEach(contact => {
    const contactName = contact.fieldData.contact;
    const contactId = contact.fieldData.contact_id;
    
    const contactFooterDiv = document.createElement('div');
    contactFooterDiv.style.width = '150px';
    contactFooterDiv.style.minWidth = '150px';
    contactFooterDiv.style.maxWidth = '150px';
    contactFooterDiv.style.padding = '4px';
    contactFooterDiv.style.borderRight = '1px solid #ddd';
    contactFooterDiv.style.background = '#f1f3f4';
    contactFooterDiv.style.display = 'flex';
    contactFooterDiv.style.flexDirection = 'column';
    contactFooterDiv.style.alignItems = 'center';
    contactFooterDiv.style.gap = '3px';
    contactFooterDiv.style.boxSizing = 'border-box';
    contactFooterDiv.style.flexShrink = '0';
    
    // Add note button
    const addNoteBtn = document.createElement('button');
    addNoteBtn.textContent = 'Add Note';
    addNoteBtn.title = `Add note for ${contactName}`;
    addNoteBtn.style.fontSize = '10px';
    addNoteBtn.style.padding = '4px 6px';
    addNoteBtn.style.margin = '0';
    addNoteBtn.style.whiteSpace = 'nowrap';
    addNoteBtn.style.width = 'calc(100% - 4px)';
    addNoteBtn.style.cursor = 'pointer';
    addNoteBtn.style.border = '1px solid #007acc';
    addNoteBtn.style.background = '#007acc';
    addNoteBtn.style.color = 'white';
    addNoteBtn.style.borderRadius = '4px';
    addNoteBtn.style.fontWeight = '500';
    addNoteBtn.style.transition = 'all 0.2s ease';
    addNoteBtn.onclick = () => openNotesModal(header, 'add', contactName, contactId);
    
    // View notes button
    const viewNotesBtn = document.createElement('button');
    viewNotesBtn.textContent = 'View Notes';
    viewNotesBtn.title = `View notes for ${contactName}`;
    viewNotesBtn.style.fontSize = '10px';
    viewNotesBtn.style.padding = '4px 6px';
    viewNotesBtn.style.margin = '0';
    viewNotesBtn.style.whiteSpace = 'nowrap';
    viewNotesBtn.style.width = 'calc(100% - 4px)';
    viewNotesBtn.style.cursor = 'pointer';
    viewNotesBtn.style.border = '1px solid #666';
    viewNotesBtn.style.background = '#f8f9fa';
    viewNotesBtn.style.color = '#333';
    viewNotesBtn.style.borderRadius = '4px';
    viewNotesBtn.style.fontWeight = '500';
    viewNotesBtn.style.transition = 'all 0.2s ease';
    viewNotesBtn.onclick = () => openNotesModal(header, 'view', contactName, contactId);
    
    contactFooterDiv.appendChild(addNoteBtn);
    contactFooterDiv.appendChild(viewNotesBtn);
    footerContactsArea.appendChild(contactFooterDiv);
  });
  
  // Assemble the footer
  footerDiv.appendChild(footerSkillArea);
  footerDiv.appendChild(footerContactsArea);
  
  // Assemble the group
  groupDiv.appendChild(headerDiv);
  groupDiv.appendChild(contentDiv);
  groupDiv.appendChild(footerDiv);
  
  container.appendChild(groupDiv);
}

// Function to create a skill row
function createSkillRow(item, contacts) {
  const rowDiv = document.createElement('div');
  rowDiv.className = 'skill-row';
  
  // Create skill cell
  const skillCell = document.createElement('div');
  skillCell.className = 'skill-cell';
  skillCell.style.backgroundColor = '#f8f9fa'; // Light background for assessment items
  skillCell.style.color = '#333'; // Dark text
  
  // Create skill content with just the title (no description)
  const skillTitle = document.createElement('div');
  skillTitle.style.fontWeight = 'bold';
  skillTitle.style.marginBottom = '4px';
  skillTitle.textContent = item.skill;
  
  skillCell.appendChild(skillTitle);
  
  // Create score cells container
  const scoreCellsDiv = document.createElement('div');
  scoreCellsDiv.className = 'score-cells';
  
  // Add score cells for each contact
  contacts.forEach(contact => {
    const contactId = contact.fieldData.contact_id;
    const contactName = contact.fieldData.contact;
    const scoreData = item.scores[contactId];
    
    const scoreCell = document.createElement('div');
    scoreCell.className = 'score-cell';
    scoreCell.style.backgroundColor = '#fff'; // White background for score cells
    scoreCell.style.color = '#333';
    
    // Add click handler for score editing
    scoreCell.onclick = () => openScoreModal(
      item.skill, 
      contactName, 
      item.id, 
      contactId, 
      scoreData.value, 
      scoreData.pass, 
      scoreData.metadata,
      item.description, // Add the question/description
      item.options, // Add the scoring options
      item.type, // Add the field type
      item // Pass the entire item for additional properties
    );
    
    // Create score value
    const scoreValue = document.createElement('div');
    scoreValue.className = 'score-value';
    
    // Handle different score display based on type
    if (item.type === 'Personal Readiness') {
      // Check if we have both Staff and Self scores for Personal Readiness
      if (scoreData.staffData && scoreData.selfData) {
        let staffDisplay = '-';
        let selfDisplay = '-';
        
        // Parse Staff data
        try {
          const staffParsed = JSON.parse(scoreData.staffData.value);
          if (staffParsed && staffParsed.status) {
            staffDisplay = `${staffParsed.status} (${staffParsed.meetsStandard || ''})`;
          }
        } catch (e) {
          staffDisplay = scoreData.staffData.value || '-';
        }
        
        // Parse Self data
        try {
          const selfParsed = JSON.parse(scoreData.selfData.value);
          if (selfParsed && selfParsed.status) {
            selfDisplay = `${selfParsed.status} (${selfParsed.meetsStandard || ''})`;
          }
        } catch (e) {
          selfDisplay = scoreData.selfData.value || '-';
        }
        
        scoreValue.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center; font-size: 10px;">
            <div style="margin-bottom: 2px; text-align: center;">
              <div style="font-weight: bold;">Staff:</div>
              <div>${staffDisplay}</div>
            </div>
            <div style="text-align: center;">
              <div style="font-weight: bold;">Self:</div>
              <div>${selfDisplay}</div>
            </div>
          </div>
        `;
      } else {
        // Single Personal Readiness score
        try {
          // Try to parse JSON data for Personal Readiness
          const parsedData = JSON.parse(scoreData.value);
          // Format display to show status and meets standard
          if (parsedData && parsedData.status) {
            scoreValue.innerHTML = `
              <div style="font-weight: bold; margin-bottom: 3px;">${parsedData.status}</div>
              <div style="font-size: 11px; padding: 2px 6px; border-radius: 10px; display: inline-block; ${
                parsedData.meetsStandard === 'Meets Standard' 
                  ? 'background-color: #d4edda; color: #155724;' 
                  : 'background-color: #f8d7da; color: #721c24;'
              }">${parsedData.meetsStandard || ''}</div>
            `;
          } else {
            scoreValue.textContent = '-';
          }
        } catch (e) {
          // If parsing fails, show original value
          scoreValue.textContent = scoreData.value || '-';
        }
      }
    } else {
      // Regular score display - show both Staff and Self scores if available
      if (scoreData.staffData && scoreData.selfData) {
        // Both Staff and Self scores available - display both
        scoreValue.innerHTML = `
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="margin-bottom: 2px;">
              <span style="font-size: 10px; font-weight: bold;">Staff:</span> 
              <span style="font-size: 10px; font-weight: bold;">${scoreData.staffData.value}</span>
            </div>
            <div>
              <span style="font-size: 10px; font-weight: bold;">Self:</span> 
              <span style="font-size: 10px; font-weight: bold;">${scoreData.selfData.value}</span>
            </div>
          </div>
        `;
      } else {
        // Only one type available - show the single score
        scoreValue.textContent = scoreData.value;
      }
    }
    
    // Create metadata if available
    const metadataDiv = document.createElement('div');
    metadataDiv.className = 'score-metadata';
    if (scoreData.value !== "-" && (scoreData.staffData || scoreData.selfData)) {
      let metadataHTML = '';
      
      // Show Staff data if available
      if (scoreData.staffData) {
        metadataHTML += `<div style="margin-bottom: 2px;">
          <strong>Staff:</strong> ${scoreData.staffData.user}<br>
          <span>${scoreData.staffData.date}</span>
        </div>`;
      }
      
      // Show Self data if available
      if (scoreData.selfData) {
        metadataHTML += `<div style="margin-bottom: 2px;">
          <strong>Self:</strong> ${scoreData.selfData.user}<br>
          <span>${scoreData.selfData.date}</span>
        </div>`;
      }
      
      // If we only have one type, fall back to the original metadata format
      if (!scoreData.staffData && !scoreData.selfData && scoreData.metadata) {
        const author = scoreData.metadata.author || '';
        const date = scoreData.metadata.editableDate || '';
        metadataHTML = `${author}<br><span>${date}</span>`;
      }
      
      metadataDiv.innerHTML = metadataHTML;
    }
    
    // Pass indicator removed as we no longer use the pass checkbox
    
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
window.openScoreModal = function(skillName, contactName, skillId, contactId, currentScore, passValue, metadata, questionText, options, fieldType, item) {
  console.log('openScoreModal called with:', { skillName, contactName, skillId, contactId, currentScore, passValue, metadata, questionText, options, fieldType, item });
  
  window.currentSkillName = skillName;
  window.currentSkillId = skillId;
  window.currentScoreContactId = contactId;
  window.currentScoreContactName = contactName;
  window.currentFieldType = fieldType || 'Multiple Choice';
  window.currentSkillHeader = item ? item.header : '';
  
  // Set modal title with question text
  const modalTitle = `Edit Score - ${skillName} - ${contactName}`;
  document.getElementById('scoreModalTitle').textContent = modalTitle;
  
  // Add question text below the title if provided
  let existingQuestionDiv = document.getElementById('questionText');
  if (!existingQuestionDiv) {
    // Create question text div if it doesn't exist
    existingQuestionDiv = document.createElement('div');
    existingQuestionDiv.id = 'questionText';
    existingQuestionDiv.style.padding = '10px 24px 0px 24px';
    existingQuestionDiv.style.fontSize = '14px';
    existingQuestionDiv.style.color = '#666';
    existingQuestionDiv.style.lineHeight = '1.4';
    existingQuestionDiv.style.fontStyle = 'italic';
    existingQuestionDiv.style.borderBottom = '1px solid #e9ecef';
    existingQuestionDiv.style.marginBottom = '15px';
    
    // Insert after the modal header
    const modalHeader = document.querySelector('#scoreModal .modal-header');
    const modalBody = document.querySelector('#scoreModal .score-modal-body');
    modalHeader.parentNode.insertBefore(existingQuestionDiv, modalBody);
  }
  
  // Update question text
  if (questionText && questionText.trim()) {
    existingQuestionDiv.textContent = questionText;
    existingQuestionDiv.style.display = 'block';
  } else {
    existingQuestionDiv.style.display = 'none';
  }
  
  // Handle previous data display
  const previousDataSection = document.getElementById('previousDataSection');
  const previousDataContent = document.getElementById('previousDataContent');
  
  // Check if there are any existing scores (Staff or Self)
  const hasStaffData = item && item.scores && item.scores[contactId] && item.scores[contactId].staffData;
  const hasSelfData = item && item.scores && item.scores[contactId] && item.scores[contactId].selfData;
  
  if (hasStaffData || hasSelfData) {
    // Show previous data section
    previousDataSection.style.display = 'block';
    
    let previousHTML = '';
    
    // Display Staff data if available
    if (hasStaffData) {
      const staffData = item.scores[contactId].staffData;
      previousHTML += `
        <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #dee2e6;">
          <h4 style="margin: 0 0 8px 0; color: #495057; font-size: 14px; font-weight: bold;">Staff Assessment:</h4>
          <div style="margin-bottom: 4px;"><strong>Score:</strong> ${staffData.value || '-'}</div>
          <div style="margin-bottom: 4px;"><strong>User:</strong> ${staffData.user || '-'}</div>
          <div><strong>Date:</strong> ${staffData.date || '-'}</div>
        </div>
      `;
    }
    
    // Display Self data if available
    if (hasSelfData) {
      const selfData = item.scores[contactId].selfData;
      previousHTML += `
        <div style="margin-bottom: 15px;">
          <h4 style="margin: 0 0 8px 0; color: #495057; font-size: 14px; font-weight: bold;">Self Assessment:</h4>
          <div style="margin-bottom: 4px;"><strong>Score:</strong> ${selfData.value || '-'}</div>
          <div style="margin-bottom: 4px;"><strong>User:</strong> ${selfData.user || '-'}</div>
          <div><strong>Date:</strong> ${selfData.date || '-'}</div>
        </div>
      `;
    }
    
    previousDataContent.innerHTML = previousHTML;
  } else {
    // Hide previous data section if no previous entries
    previousDataSection.style.display = 'none';
  }
  
  // Show/hide elements based on field type
  const textEntryArea = document.getElementById('textEntryArea');
  const personalReadinessArea = document.getElementById('personalReadinessArea');
  const scoreOptionsDiv = document.getElementById('scoreOptionsDiv') || document.createElement('div');
  
  // Handle different field types
  if (window.currentFieldType === 'Free Text') {
    // Show text entry, hide score options and personal readiness
    textEntryArea.style.display = 'block';
    personalReadinessArea.style.display = 'none';
    if (scoreOptionsDiv.parentNode) scoreOptionsDiv.style.display = 'none';
    
    // Set current text value if available
    document.getElementById('scoreTextEntry').value = currentScore !== '-' ? currentScore : '';
  } else if (window.currentFieldType === 'Personal Readiness') {
    // Show personal readiness, hide text entry and score options
    textEntryArea.style.display = 'none';
    personalReadinessArea.style.display = 'block';
    if (scoreOptionsDiv.parentNode) scoreOptionsDiv.style.display = 'none';
    
    // Populate dropdowns with options
    const statusDropdown = document.getElementById('statusDropdown');
    const meetsStandardDropdown = document.getElementById('meetsStandardDropdown');
    
    // Clear existing options
    statusDropdown.innerHTML = '';
    meetsStandardDropdown.innerHTML = '';
    
    // Add empty option
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '-- Select an option --';
    statusDropdown.appendChild(emptyOption);
    
    // Add empty option for standard
    const emptyStandardOption = document.createElement('option');
    emptyStandardOption.value = '';
    emptyStandardOption.textContent = '-- Select an option --';
    meetsStandardDropdown.appendChild(emptyStandardOption);
    
    // Get item-specific options if available
    if (item && item.StatusOptions) {
      item.StatusOptions.forEach(option => {
        const optionEl = document.createElement('option');
        optionEl.value = option;
        optionEl.textContent = option;
        statusDropdown.appendChild(optionEl);
      });
    }
    
    if (item && item.MeetsStandardOptions) {
      item.MeetsStandardOptions.forEach(option => {
        const optionEl = document.createElement('option');
        optionEl.value = option;
        optionEl.textContent = option;
        meetsStandardDropdown.appendChild(optionEl);
      });
    }
    
    // Parse current score data and set form values if available
    if (currentScore && currentScore !== '-') {
      try {
        const scoreData = JSON.parse(currentScore);
        statusDropdown.value = scoreData.status || '';
        document.getElementById('commentsTextarea').value = scoreData.comments || '';
        meetsStandardDropdown.value = scoreData.meetsStandard || '';
      } catch (e) {
        console.error('Error parsing Personal Readiness score data:', e);
      }
    }
  } else {
    // Show score options, hide text entry and personal readiness
    textEntryArea.style.display = 'none';
    personalReadinessArea.style.display = 'none';
    if (scoreOptionsDiv.parentNode) scoreOptionsDiv.style.display = 'block';
    
    // Create or update score options buttons
    createScoreOptionsButtons(options, currentScore);
  }
  
  // Pass checkbox has been removed
  
  // Use window.currentDate as the default date
  let defaultDate;
  if (window.currentDate && window.currentDate !== "Current Date") {
    // Parse the currentDate and convert to input format
    try {
      if (window.currentDate.includes('/')) {
        // Handle MM/DD/YYYY format
        const parts = window.currentDate.split('/');
        if (parts.length === 3) {
          const month = parts[0].padStart(2, '0');
          const day = parts[1].padStart(2, '0');
          const year = parts[2];
          defaultDate = `${year}-${month}-${day}`;
        } else {
          defaultDate = new Date().toISOString().split('T')[0];
        }
      } else {
        // Try to parse as-is
        const date = new Date(window.currentDate);
        defaultDate = isNaN(date.getTime()) ? new Date().toISOString().split('T')[0] : date.toISOString().split('T')[0];
      }
    } catch (e) {
      defaultDate = new Date().toISOString().split('T')[0];
    }
  } else {
    defaultDate = new Date().toISOString().split('T')[0];
  }
  
  document.getElementById('scoreDate').value = defaultDate;
  document.getElementById('scoreUser').value = window.currentUser;
  
  // Show modal
  document.getElementById('scoreModal').style.display = 'block';
};

// Function to create score options buttons
function createScoreOptionsButtons(options, currentScore) {
  // Find or create the score options container
  let scoreOptionsContainer = document.getElementById('scoreOptionsContainer');
  if (!scoreOptionsContainer) {
    // Create the container and insert it into the modal body
    const modalBody = document.querySelector('#scoreModal .score-modal-body');
    if (!modalBody) {
      console.error('Modal body not found');
      return;
    }
    
    // Find the new entry section
    const newEntrySection = modalBody.querySelector('.new-entry-section');
    if (!newEntrySection) {
      console.error('New entry section not found');
      return;
    }
    
    // Create the score options container
    scoreOptionsContainer = document.createElement('div');
    scoreOptionsContainer.id = 'scoreOptionsContainer';
    scoreOptionsContainer.className = 'form-group';
    scoreOptionsContainer.innerHTML = '<label>Score:</label>';
    scoreOptionsContainer.style.marginBottom = '20px';
    
    // Insert as the first element in new entry section (after the h3)
    const firstFormGroup = newEntrySection.querySelector('.form-group');
    if (firstFormGroup) {
      newEntrySection.insertBefore(scoreOptionsContainer, firstFormGroup);
    } else {
      newEntrySection.appendChild(scoreOptionsContainer);
    }
  }
  
  // Clear existing buttons (except label)
  const existingButtons = scoreOptionsContainer.querySelectorAll('.score-option-btn');
  if (existingButtons) {
    existingButtons.forEach(btn => btn.remove());
  }
  
  // Create buttons container
  let buttonsContainer = scoreOptionsContainer.querySelector('.score-buttons-container');
  if (!buttonsContainer) {
    buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'score-buttons-container';
    buttonsContainer.style.display = 'grid';
    buttonsContainer.style.gridTemplateColumns = '1fr 1fr';
    buttonsContainer.style.gap = '10px';
    buttonsContainer.style.marginTop = '10px';
    scoreOptionsContainer.appendChild(buttonsContainer);
  }
  
  // Clear existing buttons from container
  buttonsContainer.innerHTML = '';
  
  // Store selected score globally
  window.selectedScore = '-';
  
  // Create "No Score" button
  const noScoreBtn = document.createElement('button');
  noScoreBtn.type = 'button';
  noScoreBtn.className = 'score-option-btn';
  noScoreBtn.textContent = 'No Score';
  noScoreBtn.title = 'No score assigned';
  noScoreBtn.style.cssText = `
    padding: 12px;
    border: 2px solid #6c757d;
    background: #f8f9fa;
    color: #495057;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s ease;
    text-align: center;
  `;
  noScoreBtn.onclick = () => selectScore('-', noScoreBtn);
  buttonsContainer.appendChild(noScoreBtn);
  
  // Create option buttons if options exist
  if (options) {
    // Create buttons for options 1-4
    for (let i = 1; i <= 4; i++) {
      const optionKey = `option${i}`;
      const option = options[optionKey];
      
      if (option && option.title) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'score-option-btn';
        btn.textContent = `${i}. ${option.title}`;
        btn.title = option.description || option.title;
        btn.style.cssText = `
          padding: 12px;
          border: 2px solid #007bff;
          background: #fff;
          color: #007bff;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
          text-align: center;
          line-height: 1.3;
        `;
        btn.onclick = () => selectScore(i.toString(), btn);
        buttonsContainer.appendChild(btn);
      }
    }
  }
  
  // Set initial selection if there's a current score
  if (currentScore && currentScore !== '-') {
    const targetBtn = buttonsContainer.querySelector(`[onclick*="'${currentScore}'"]`);
    if (targetBtn) {
      selectScore(currentScore, targetBtn);
    }
  } else {
    selectScore('-', noScoreBtn);
  }
}

// Function to handle score selection
function selectScore(score, buttonElement) {
  // Remove selection from all buttons
  const allButtons = document.querySelectorAll('.score-option-btn');
  allButtons.forEach(btn => {
    btn.style.background = btn.textContent.includes('No Score') ? '#f8f9fa' : '#fff';
    btn.style.color = btn.textContent.includes('No Score') ? '#495057' : '#007bff';
    btn.style.borderColor = btn.textContent.includes('No Score') ? '#6c757d' : '#007bff';
    btn.style.fontWeight = '500';
  });
  
  // Highlight selected button
  buttonElement.style.background = '#007bff';
  buttonElement.style.color = '#fff';
  buttonElement.style.borderColor = '#0056b3';
  buttonElement.style.fontWeight = '600';
  
  // Store the selected score
  window.selectedScore = score;
  console.log('Score selected:', score);
}

window.closeScoreModal = function() {
  document.getElementById('scoreModal').style.display = 'none';
};

window.saveScore = function() {
  // Get score based on field type
  let score;
  if (window.currentFieldType === 'Free Text') {
    score = document.getElementById('scoreTextEntry').value.trim();
  } else if (window.currentFieldType === 'Personal Readiness') {
    const status = document.getElementById('statusDropdown').value;
    const comments = document.getElementById('commentsTextarea').value;
    const meetsStandard = document.getElementById('meetsStandardDropdown').value;
    
    // Validate inputs for Personal Readiness
    if (!status) {
      alert('Please select a current status.');
      return;
    }
    
    if (!meetsStandard) {
      alert('Please select whether this meets the standard.');
      return;
    }
    
    // Create a JSON object to store as the score
    score = JSON.stringify({
      status,
      comments,
      meetsStandard
    });
  } else {
    score = window.selectedScore || '-'; // Use the selected score from buttons
  }
  
  const date = document.getElementById('scoreDate').value;
  const user = document.getElementById('scoreUser').value;
  
  // Validate inputs
  if (!date) {
    alert('Please select a date.');
    document.getElementById('scoreDate').focus();
    return;
  }
  
  if (!user.trim()) {
    alert('Please enter a user name.');
    document.getElementById('scoreUser').focus();
    return;
  }
  
  // Convert date to display format
  let displayDate = date;
  if (date) {
    try {
      // Parse the date as local date to avoid timezone issues
      const parts = date.split('-'); // date format is YYYY-MM-DD from HTML date input
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const day = parseInt(parts[2], 10);
        const dateObj = new Date(year, month, day);
        displayDate = dateObj.toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit', 
          year: 'numeric'
        });
      } else {
        // Fallback for other date formats
        displayDate = date;
      }
    } catch (e) {
      displayDate = date;
    }
  }
  
  console.log('Saving score:', { 
    skill: window.currentSkillId, 
    contact: window.currentScoreContactId, 
    score, 
    userType: window.currentUserType,
    date: displayDate, 
    user 
  });
  
  // Create the same parameter structure as the original Tabulator version
  const updateResult = {
    "conId": window.currentScoreContactId,
    "skillId": window.currentSkillId,
    "skillName": window.currentSkillName,
    "skillHeader": window.currentSkillHeader,
    "value": score,
    "pass": false, // We're not using the pass checkbox anymore
    "mode": 'updateScore',
    "user": user,
    "userType": window.currentUserType, // Add userType to the data sent to FileMaker
    "date": displayDate,
    "timestamp": new Date().toISOString()
  };
  
  // Show saving indicator
  const saveBtn = document.querySelector('#scoreModal .save-btn');
  const originalText = saveBtn.textContent;
  saveBtn.textContent = 'Saving...';
  saveBtn.disabled = true;
  saveBtn.style.opacity = '0.7';
  
  // Use the exact same FileMaker script call structure as the original
  if (typeof runScript === 'function') {
    runScript(JSON.stringify(updateResult));
    console.log('Data sent to FileMaker successfully');
    
    // Update the local data immediately for UI responsiveness
    updateLocalScoreData(window.currentScoreContactId, window.currentSkillId, score, false, displayDate, user);
    
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
  } else if (typeof FileMaker !== 'undefined' && typeof FileMaker.PerformScriptWithOption === 'function') {
    FileMaker.PerformScriptWithOption("Manage: Soft Skills", JSON.stringify(updateResult), 0);
    console.log('Data sent to FileMaker successfully via PerformScriptWithOption');
    
    // Update the local data immediately for UI responsiveness
    updateLocalScoreData(window.currentScoreContactId, window.currentSkillId, score, false, displayDate, user);
    
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
    
    // Update the local data for testing without FileMaker
    updateLocalScoreData(window.currentScoreContactId, window.currentSkillId, score, false, displayDate, user);
    
    alert('Score saved locally (FileMaker integration not available)');
    
    // Reset button state
    saveBtn.textContent = originalText;
    saveBtn.disabled = false;
    saveBtn.style.opacity = '1';
    
    closeScoreModal();
  }
};

// Notes Modal functions
window.openNotesModal = function(groupOrSkillName, mode, contactName = '', contactId = '') {
  console.log('openNotesModal called with:', { groupOrSkillName, mode, contactName, contactId });
  
  window.currentGroupName = groupOrSkillName;
  window.currentContactName = contactName;
  window.currentContactId = contactId; // Store contactId for compatibility
  window.currentMode = mode;
  
  if (mode === 'group') {
    document.getElementById('modalTitle').textContent = `${groupOrSkillName} Notes`;
  } else {
    document.getElementById('modalTitle').textContent = `${groupOrSkillName} - ${contactName} Notes`;
  }
  
  // Load existing notes using the same structure as the original
  window.loadExistingNotes(groupOrSkillName, contactId);
  
  // Show modal
  document.getElementById('notesModal').style.display = 'block';
};

window.loadExistingNotes = function(groupName, contactId) {
  // Use the same parameter structure as the original Tabulator version
  const result = {
    "groupName": groupName,
    "contactId": contactId,
    "mode": 'loadNotes'
  };
  
  console.log('Loading existing notes:', result);
  
  // Check if FileMaker runScript is available (same as original)
  if (typeof runScript === 'function') {
    runScript(JSON.stringify(result));
  } else if (typeof FileMaker !== 'undefined' && typeof FileMaker.PerformScriptWithOption === 'function') {
    FileMaker.PerformScriptWithOption("Manage: Soft Skills", JSON.stringify(result), 0);
  } else {
    console.log('FileMaker integration not available, showing sample notes');
    // For testing without FileMaker - use the actual data structure
    window.displayNotes(JSON.stringify([
      { 
        author: "Admin", 
        noteId: "1", 
        noteText: "Sample note 1 - This is a test note", 
        timestamp: "2025-08-20 16:58:34" 
      },
      { 
        author: "Test User", 
        noteId: "2", 
        noteText: "Sample note 2 - Another test note with more content", 
        timestamp: "2025-08-19 14:30:15" 
      }
    ]));
  }
};

window.closeNotesModal = function() {
  document.getElementById('notesModal').style.display = 'none';
  document.getElementById('noteTextarea').style.display = 'none';
  document.getElementById('noteDisplay').style.display = 'none';
  document.getElementById('saveNoteBtn').style.display = 'none';
};

// Function to receive notes data from FileMaker
window.displayNotes = function(notesData) {
  console.log('displayNotes called with:', notesData);
  
  const notes = JSON.parse(notesData);
  const noteDisplay = document.getElementById('noteDisplay');
  const noteTextarea = document.getElementById('noteTextarea');
  const saveBtn = document.getElementById('saveNoteBtn');
  
  // Show existing notes
  noteDisplay.style.display = 'block';
  noteTextarea.style.display = 'block';
  saveBtn.style.display = 'inline-block';
  
  // Display existing notes with the correct data structure
  if (notes && notes.length > 0) {
    let notesHtml = '<h4>Existing Notes:</h4>';
    notes.forEach(note => {
      // Format the timestamp for display
      let displayDate = note.timestamp || '';
      if (displayDate) {
        try {
          // Handle the timestamp format "2025-08-20 04:58:34"
          const date = new Date(displayDate.replace(' ', 'T')); // Convert to ISO format
          if (!isNaN(date.getTime())) {
            displayDate = date.toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric'
            }) + ' ' + date.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            });
          }
        } catch (e) {
          // Keep original if parsing fails
          console.log('Date parsing error:', e);
        }
      }
      
      notesHtml += `<div style="margin-bottom: 10px; padding: 8px; background: white; border-radius: 4px; border-left: 3px solid #007bff;">
                      <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
                        ${note.author || 'Unknown'} - ${displayDate}
                      </div>
                      <div>${note.noteText || note.note || ''}</div>
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
  
  // Use the exact same parameter structure as the original Tabulator version
  const result = {
    "groupName": window.currentGroupName,
    "contactId": window.currentContactId,
    "contactName": window.currentContactName,
    "noteText": noteText,
    "timestamp": new Date().toISOString(),
    "author": window.currentUser || "Unknown User",
    "mode": 'saveNote'
  };
  
  console.log('Saving note:', result);
  
  // Use the exact same FileMaker script call structure as the original
  if (typeof runScript === 'function') {
    runScript(JSON.stringify(result));
  } else if (typeof FileMaker !== 'undefined' && typeof FileMaker.PerformScriptWithOption === 'function') {
    FileMaker.PerformScriptWithOption("Manage: Soft Skills", JSON.stringify(result), 0);
  } else {
    console.error('FileMaker runScript function not available');
    alert('Note saved locally (FileMaker integration not available)');
  }
  
  // Clear the textarea
  document.getElementById('noteTextarea').value = '';
  
  closeNotesModal();
};

// Function to update local score data and refresh display
function updateLocalScoreData(contactId, skillId, scoreValue, passValue, displayDate, user = null) {
  if (window.skillData && window.contactData && window.scoreData) {
    // Update the score data
    const scores = JSON.parse(window.scoreData);
    
    // Use provided user or fall back to window.currentUser
    const actualUser = user || window.currentUser || "Current User";
    const actualUserType = window.currentUserType || "Staff";
    
    // Find existing entry for this specific contact, skill, and userType
    let scoreEntry = scores.find(score => {
      const scoreSkillId = score.fieldData.Skill_ID || score.fieldData.skillId;
      const scoreContactId = score.fieldData.Contact_ID || score.fieldData.contact_id;
      const scoreUserType = score.fieldData.userType;
      return scoreSkillId === skillId && scoreContactId === contactId && scoreUserType === actualUserType;
    });
    
    if (scoreEntry) {
      // Update existing entry
      scoreEntry.fieldData.Data = scoreValue;
      scoreEntry.fieldData.pass = passValue ? 1 : 0;
      scoreEntry.fieldData.user = actualUser;
      scoreEntry.fieldData.userType = actualUserType;
      scoreEntry.fieldData.date = displayDate;
      scoreEntry.fieldData.zzCreatedTimestamp = new Date().toLocaleString('en-US');
      scoreEntry.fieldData.zzCreatedAcct = actualUser;
    } else {
      // Create new entry
      scoreEntry = {
        fieldData: {
          Skill_ID: skillId,
          Contact_ID: contactId,
          Data: scoreValue,
          pass: passValue ? 1 : 0,
          user: actualUser,
          userType: actualUserType,
          date: displayDate,
          zzCreatedAcct: actualUser,
          zzCreatedName: actualUser,
          zzCreatedTimestamp: new Date().toLocaleString('en-US')
        }
      };
      scores.push(scoreEntry);
    }
    
    // Update the global data
    window.scoreData = JSON.stringify(scores);
    
    // Refresh the table display
    window.refreshTable();
    
    console.log('Local score data updated with user:', actualUser, 'userType:', actualUserType);
  }
}

// Function to refresh table data (called from FileMaker after updates)
window.refreshTable = function() {
  if (window.skillData && window.contactData && window.scoreData) {
    const skills = JSON.parse(window.skillData);
    const contacts = JSON.parse(window.contactData);
    const scores = JSON.parse(window.scoreData);
    createTable(skills, contacts, scores);
  }
};

// FileMaker integration function (same as original)
runScript = function (param) {
  FileMaker.PerformScriptWithOption("Manage: Soft Skills", param, 0);
};

// Function to update pass checkbox from FileMaker (if needed)
// We've removed the pass checkbox, but keep this function for backward compatibility
window.updatePassCheckbox = function(contactId, skillId, passValue) {
  console.log('updatePassCheckbox called (pass checkbox has been removed):', { contactId, skillId, passValue });
  // We're no longer using the pass checkbox, but we'll still update the data
  // to maintain compatibility with existing FileMaker scripts
  if (window.skillData && window.contactData && window.scoreData) {
    // Update the score data
    const scores = JSON.parse(window.scoreData);
    const scoreEntry = scores.find(score => {
      const scoreSkillId = score.fieldData.Skill_ID || score.fieldData.skillId;
      const scoreContactId = score.fieldData.Contact_ID || score.fieldData.contact_id;
      return scoreSkillId === skillId && scoreContactId === contactId;
    });
    
    if (scoreEntry) {
      scoreEntry.fieldData.pass = false; // Always set to false since we removed the checkbox
      window.scoreData = JSON.stringify(scores);
      
      // Refresh the table
      window.refreshTable();
    }
  }
};

// Function to update score from FileMaker (if needed)
window.updateScore = function(contactId, skillId, scoreValue) {
  console.log('updateScore called:', { contactId, skillId, scoreValue });
  // Update the table data and refresh the display
  if (window.skillData && window.contactData && window.scoreData) {
    // Update the score data
    const scores = JSON.parse(window.scoreData);
    const scoreEntry = scores.find(score => {
      const scoreSkillId = score.fieldData.Skill_ID || score.fieldData.skillId;
      const scoreContactId = score.fieldData.Contact_ID || score.fieldData.contact_id;
      return scoreSkillId === skillId && scoreContactId === contactId;
    });
    
    if (scoreEntry) {
      scoreEntry.fieldData.Data = scoreValue; // Note: 'Data' field, not 'Score'
      window.scoreData = JSON.stringify(scores);
      
      // Refresh the table
      window.refreshTable();
    }
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
        Data: "2", // Note: Data field, not Score
        pass: 1, // Note: lowercase pass, numeric value
        user: "Test User",
        date: "08/20/2025",
        zzCreatedAcct: "Admin",
        zzCreatedName: "Bradley Cranston",
        zzCreatedTimestamp: "08/20/2025 16:41:59"
      }
    },
    {
      fieldData: {
        Skill_ID: "skill2",
        Contact_ID: "contact2", 
        Data: "3",
        pass: 1,
        user: "Test User",
        date: "08/19/2025",
        zzCreatedAcct: "Admin",
        zzCreatedName: "Bradley Cranston",
        zzCreatedTimestamp: "08/19/2025 10:30:00"
      }
    }
  ]);
  
  loadTable(sampleSkillData, sampleContactData, sampleScoreData, "Test User", "08/25/2025");
};
